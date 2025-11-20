import type { Address } from "../types/primitives.js";
import { CHAIN_PARAMS, type RewardScheduleEntry } from "../config/params.js";
import {
  type ParamKey,
  type ParamValue,
  type ParamRecord,
  type ParamProposal,
  type ParamRegistryState,
  type ParamHistoryEntry,
  type ProposalStatus,
  type ParamPrimitive
} from "./types.js";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeProposalId(counter: number): string {
  return `P${counter.toString().padStart(5, "0")}`;
}

function cloneValue(v: ParamValue): ParamValue {
  if (Array.isArray(v)) {
    return v.slice();
  }
  return v;
}

// ---------------------------------------------------------------------------
// GENESIS / INITIAL REGISTRY
// ---------------------------------------------------------------------------

// Build the initial registry directly from CHAIN_PARAMS.
// This gives us a canonical "snapshot" of on-chain parameters at genesis.
export function createGenesisParamRegistry(genesisHeight: number = 0): ParamRegistryState {
  const params = new Map<ParamKey, ParamRecord>();

  const add = (key: ParamKey, value: ParamValue): void => {
    params.set(key, {
      key,
      value,
      version: 1,
      createdAtHeight: genesisHeight,
      updatedAtHeight: genesisHeight,
      updatedBy: null
    });
  };

  // Map CHAIN_PARAMS into governable keys.
  add("BLOCK_TIME_SECONDS", CHAIN_PARAMS.BLOCK_TIME_SECONDS);
  add("EPOCH_LENGTH_BLOCKS", CHAIN_PARAMS.EPOCH_LENGTH_BLOCKS);
  add("MAX_MINER_REWARD_THE", CHAIN_PARAMS.MAX_MINER_REWARD_THE);
  add("REWARD_SCHEDULE", cloneValue(CHAIN_PARAMS.REWARD_SCHEDULE) as RewardScheduleEntry[]);
  add("SPLIT_UPWARD_FACTORS", cloneValue(CHAIN_PARAMS.SPLIT_UPWARD_FACTORS));
  add("NIP_EMISSION_PER_BLOCK", CHAIN_PARAMS.NODE_REWARD_PER_BLOCK_THE);

  // BoT / treasury bands — dev placeholders for now.
  add("BOT_BUYBAND_LOWER", 1.06); // 1.06 EU lower guardrail
  add("BOT_BUYBAND_UPPER", 1.20); // 1.20 EU upper guardrail
  add("BOT_MIN_RESERVE_MULTIPLIER", 2.5); // 2.5x monthly rewards

  return {
    params,
    proposals: new Map<string, ParamProposal>(),
    history: [],
    nextProposalId: 1
  };
}

// ---------------------------------------------------------------------------
// READ ACCESS
// ---------------------------------------------------------------------------

export function getParam(state: ParamRegistryState, key: ParamKey): ParamRecord | undefined {
  return state.params.get(key);
}

export function getParamValue<T extends ParamValue = ParamValue>(
  state: ParamRegistryState,
  key: ParamKey
): T | undefined {
  const rec = state.params.get(key);
  return (rec?.value as T | undefined);
}

// Handy helpers for primitives
export function getNumber(state: ParamRegistryState, key: ParamKey): number | undefined {
  const v = getParamValue<ParamValue>(state, key);
  if (typeof v === "number") return v;
  return undefined;
}

export function getBigInt(state: ParamRegistryState, key: ParamKey): bigint | undefined {
  const v = getParamValue<ParamValue>(state, key);
  if (typeof v === "bigint") return v;
  return undefined;
}

// ---------------------------------------------------------------------------
// PROPOSALS
// ---------------------------------------------------------------------------

export interface ProposalConfig {
  key: ParamKey;
  newValue: ParamValue;

  creator: Address;
  currentHeight: number;

  // Governance rules
  timelockBlocks: number;      // e.g. 10_080 (one epoch) or more
  expiryBlocks?: number | null;// optional expiry after creation
  requiredApprovals: number;   // e.g. number of validator guilds
}

// Create a new proposal and insert it into the registry.
export function proposeParamUpdate(
  reg: ParamRegistryState,
  cfg: ProposalConfig
): ParamProposal {
  const id = makeProposalId(reg.nextProposalId++);
  const minApplyHeight = cfg.currentHeight + cfg.timelockBlocks;
  const expiresAtHeight =
    cfg.expiryBlocks != null ? cfg.currentHeight + cfg.expiryBlocks : null;

  const proposal: ParamProposal = {
    id,
    key: cfg.key,
    newValue: cloneValue(cfg.newValue),
    createdBy: cfg.creator,
    createdAtHeight: cfg.currentHeight,
    minApplyHeight,
    expiresAtHeight,
    requiredApprovals: cfg.requiredApprovals,
    approvals: [],
    status: "PENDING",
    statusReason: null
  };

  reg.proposals.set(id, proposal);
  return proposal;
}

// Approve a proposal.
// NOTE: We do not enforce validator identity here; that will be layered on top
// via a separate "governance / validator set" module.
export function approveProposal(
  reg: ParamRegistryState,
  proposalId: string,
  approver: Address
): ParamProposal {
  const proposal = reg.proposals.get(proposalId);
  if (!proposal) {
    throw new Error(`Proposal not found: ${proposalId}`);
  }

  if (proposal.status !== "PENDING" && proposal.status !== "MATURE") {
    throw new Error(`Cannot approve proposal in status ${proposal.status}`);
  }

  if (!proposal.approvals.includes(approver)) {
    proposal.approvals.push(approver);
  }

  return proposal;
}

export function setProposalStatus(
  proposal: ParamProposal,
  status: ProposalStatus,
  reason?: string | null
): void {
  proposal.status = status;
  proposal.statusReason = reason ?? null;
}

// ---------------------------------------------------------------------------
// TICK / GOVERNANCE PROGRESSION
// ---------------------------------------------------------------------------

export interface GovernanceTickContext {
  currentHeight: number;
  // Later: validator set snapshot, stake distribution, etc.
}

// Tick through proposals and update statuses based on height, timelock,
// approvals, and expiry. Returns a list of param changes actually applied.
export function tickGovernance(
  reg: ParamRegistryState,
  ctx: GovernanceTickContext
): ParamHistoryEntry[] {
  const applied: ParamHistoryEntry[] = [];

  for (const proposal of reg.proposals.values()) {
    // Skip anything already terminal.
    if (proposal.status === "APPLIED" || proposal.status === "REJECTED" || proposal.status === "CANCELLED") {
      continue;
    }

    // Expiry
    if (proposal.expiresAtHeight !== null && ctx.currentHeight > proposal.expiresAtHeight) {
      setProposalStatus(proposal, "REJECTED", "expired");
      continue;
    }

    // Timelock not yet passed
    if (ctx.currentHeight < proposal.minApplyHeight) {
      continue;
    }

    // Quorum check: simple distinct approval count for now.
    if (proposal.approvals.length < proposal.requiredApprovals) {
      // Timelock passed but not enough approvals yet: mark as MATURE.
      if (proposal.status === "PENDING") {
        setProposalStatus(proposal, "MATURE", "timelock passed, waiting approvals");
      }
      continue;
    }

    // All conditions satisfied → apply the change to params.
    const rec = reg.params.get(proposal.key);
    const oldValue: ParamValue = rec ? cloneValue(rec.value) : null;
    const newValue: ParamValue = cloneValue(proposal.newValue);

    const historyId = `${proposal.id}-APPLY`;

    const historyEntry: ParamHistoryEntry = {
      id: historyId,
      key: proposal.key,
      oldValue,
      newValue,
      appliedAtHeight: ctx.currentHeight,
      appliedBy: proposal.createdBy // or a special governance address
    };

    // Upsert param record.
    if (rec) {
      rec.value = newValue;
      (rec as any).version = (rec.version ?? 1) + 1;
      rec.updatedAtHeight = ctx.currentHeight;
      rec.updatedBy = proposal.createdBy;
    } else {
      const newRec: ParamRecord = {
        key: proposal.key,
        value: newValue,
        version: 1,
        createdAtHeight: ctx.currentHeight,
        updatedAtHeight: ctx.currentHeight,
        updatedBy: proposal.createdBy
      };
      reg.params.set(proposal.key, newRec);
    }

    reg.history.push(historyEntry);
    applied.push(historyEntry);
    setProposalStatus(proposal, "APPLIED", "applied at tick");
  }

  return applied;
}
