import type { Address, Amount } from "../types/primitives.js";
import type { ChainState } from "../ledger/state.js";
import type { BlockHeader } from "../ledger/block.js";
import { CHAIN_PARAMS, type RewardScheduleEntry } from "../config/params.js";

// §040 — Mining & Rewards
//
// Miner gets 100% of the "miner reward" component.
// Node rewards are a separate emission into the Node Income Pool (NIP),
// *not* a per-block split of miner rewards.
//
// This module is responsible for:
//   - determining which epoch a block belongs to
//   - selecting the applicable reward schedule entry
//   - computing miner + node rewards for a block
//   - applying those rewards to the ChainState

export interface BlockRewardResult {
  minerReward: Amount;
  nodeReward: Amount;   // goes to Node Income Pool (not a normal account)
  epochIndex: number;
  scheduleEntry: RewardScheduleEntry;
}

// ---------------------------------------------------------------------------
// EPOCH CALCULATION
// ---------------------------------------------------------------------------

// Heights:
//   GENESIS_HEIGHT = 0 (no block)
//   First real block = 1
// Epochs are 0-based:
//   epoch 0: blocks 1 .. EPOCH_LENGTH_BLOCKS
//   epoch 1: blocks EPOCH_LENGTH_BLOCKS+1 .. 2*EPOCH_LENGTH_BLOCKS
export function getEpochIndex(height: number): number {
  if (height <= CHAIN_PARAMS.GENESIS_HEIGHT) return 0;
  const sinceGenesis = height - CHAIN_PARAMS.GENESIS_HEIGHT - 1;
  return Math.floor(sinceGenesis / CHAIN_PARAMS.EPOCH_LENGTH_BLOCKS);
}

// Pick the best RewardScheduleEntry for a given epoch index.
// Rule: choose the entry with the largest fromEpoch <= epochIndex.
// If none match (shouldn't happen), fall back to the first entry.
export function getRewardScheduleForEpoch(epochIndex: number): RewardScheduleEntry {
  const schedule = CHAIN_PARAMS.REWARD_SCHEDULE;

  let best: RewardScheduleEntry | null = null;
  for (const entry of schedule) {
    if (entry.fromEpoch <= epochIndex) {
      if (!best || entry.fromEpoch > best.fromEpoch) {
        best = entry;
      }
    }
  }

  return best ?? schedule[0];
}

// ---------------------------------------------------------------------------
// COMPUTATION
// ---------------------------------------------------------------------------

// Compute epoch-aware rewards for a block header.
// The actual state mutation happens in applyBlock, not here.
export function computeBlockRewards(header: BlockHeader): BlockRewardResult {
  const epochIndex = getEpochIndex(header.height);
  const scheduleEntry = getRewardScheduleForEpoch(epochIndex);

  // Safety: clamp to configured max, just in case schedule is misconfigured.
  const minerReward =
    scheduleEntry.minerRewardTHE > CHAIN_PARAMS.MAX_MINER_REWARD_THE
      ? CHAIN_PARAMS.MAX_MINER_REWARD_THE
      : scheduleEntry.minerRewardTHE;

  const nodeReward = scheduleEntry.nodeRewardTHE;

  return {
    minerReward,
    nodeReward,
    epochIndex,
    scheduleEntry
  };
}

// ---------------------------------------------------------------------------
// APPLICATION
// ---------------------------------------------------------------------------

// Get or create an internal account entry.
// NOTE: this is duplicated from ledger/state.ts, but kept here for now to
// avoid circular imports. Later we can factor a shared helper.
function getOrCreateAccount(state: ChainState, addr: Address): { address: Address; balanceTHE: Amount } {
  let acct = state.accounts.get(addr);
  if (!acct) {
    acct = { address: addr, balanceTHE: 0n };
    state.accounts.set(addr, acct);
  }
  return acct;
}

// Internal pseudo-address for the Node Income Pool (NIP).
// This is *not* a normal user account; BoT/Treasury logic will manage it.
export const NODE_POOL_ADDRESS: Address = "NIP_POOL";

// Apply miner reward → credit THE directly to miner address.
export function applyMinerReward(state: ChainState, miner: Address, amount: Amount): void {
  if (amount <= 0n) return;
  const acct = getOrCreateAccount(state, miner);
  acct.balanceTHE += amount;
}

// Node reward (NIP) handling.
// For now we credit a dedicated pseudo-account; BoT module will later:
//   - move NIP balances into specific vaults,
//   - distribute to nodes by tier,
//   - or burn/redirect per §200/§201.
export function applyNodeReward(state: ChainState, amount: Amount): void {
  if (amount <= 0n) return;
  const nip = getOrCreateAccount(state, NODE_POOL_ADDRESS);
  nip.balanceTHE += amount;
}
