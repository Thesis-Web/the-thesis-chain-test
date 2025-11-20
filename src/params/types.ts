import type { Address } from "../types/primitives.js";
import type { RewardScheduleEntry } from "../config/params.js";

// ---------------------------------------------------------------------------
// PARAM KEYS & VALUES
// ---------------------------------------------------------------------------

// These keys map conceptually to Appendix-B.
// You can extend this union as more parameters are made governable.
export type ParamKey =
  | "BLOCK_TIME_SECONDS"
  | "EPOCH_LENGTH_BLOCKS"
  | "MAX_MINER_REWARD_THE"
  | "REWARD_SCHEDULE"
  | "SPLIT_UPWARD_FACTORS"
  | "NIP_EMISSION_PER_BLOCK"
  | "BOT_BUYBAND_LOWER"
  | "BOT_BUYBAND_UPPER"
  | "BOT_MIN_RESERVE_MULTIPLIER";

// Primitive scalar types we allow as parameter values.
export type ParamPrimitive = number | bigint | boolean | string;

// Structured parameter values. Most keys will use simple primitives or arrays;
// REWARD_SCHEDULE is the main structured case in v1.
export type ParamValue =
  | ParamPrimitive
  | ParamPrimitive[]
  | RewardScheduleEntry[]
  | null;

// ---------------------------------------------------------------------------
// PARAM RECORDS
// ---------------------------------------------------------------------------

export interface ParamRecord {
  readonly key: ParamKey;
  value: ParamValue;

  // Governance / audit info
  readonly version: number;             // monotonically increasing
  readonly createdAtHeight: number;     // when the param was first set
  updatedAtHeight: number;              // last update height
  updatedBy: Address | null;            // address that last updated this param
}

// ---------------------------------------------------------------------------
// PROPOSALS
// ---------------------------------------------------------------------------

export type ProposalStatus =
  | "PENDING"   // proposed, before timelock / quorum
  | "MATURE"    // timelock passed, quorum reached, ready to apply
  | "APPLIED"   // applied to registry
  | "REJECTED"  // rejected by quorum or explicit vote
  | "CANCELLED";// withdrawn or invalidated

export interface ParamProposal {
  readonly id: string;

  readonly key: ParamKey;
  readonly newValue: ParamValue;

  readonly createdBy: Address;
  readonly createdAtHeight: number;

  // Governance guards
  readonly minApplyHeight: number; // timelock: cannot apply before this height
  readonly expiresAtHeight: number | null; // optional expiry, null = no expiry

  readonly requiredApprovals: number; // required distinct approvals
  approvals: Address[];               // approver addresses

  status: ProposalStatus;
  statusReason?: string | null;
}

// ---------------------------------------------------------------------------
// REGISTRY STATE
// ---------------------------------------------------------------------------

export interface ParamRegistryState {
  // Current effective parameters (governance-applied).
  params: Map<ParamKey, ParamRecord>;

  // Active / historical proposals.
  proposals: Map<string, ParamProposal>;

  // Simple linear history for audit / explorers.
  // Each entry is "param X changed from A -> B at height H by addr".
  history: ParamHistoryEntry[];

  // Simple auto-incrementing integer for proposal ids.
  nextProposalId: number;
}

export interface ParamHistoryEntry {
  readonly id: string;            // e.g. "P0001"
  readonly key: ParamKey;
  readonly oldValue: ParamValue;
  readonly newValue: ParamValue;
  readonly appliedAtHeight: number;
  readonly appliedBy: Address | null;
}
