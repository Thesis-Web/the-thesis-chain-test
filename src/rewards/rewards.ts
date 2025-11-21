import type { Amount, Address } from "../types/primitives";
import type { ChainState } from "../ledger/state";

// Very simple placeholder schedule for now.
// Later we’ll wire in full CHAIN_PARAMS, epochs, etc.

export interface RewardScheduleEntry {
  fromHeight: number;
  minerRewardTHE: Amount;
  nodeRewardTHE: Amount;
}

const SIMPLE_SCHEDULE: RewardScheduleEntry[] = [
  { fromHeight: 1, minerRewardTHE: 10n, nodeRewardTHE: 0n }
];

export interface BlockRewardResult {
  minerReward: Amount;
  nodeReward: Amount;
  scheduleEntry: RewardScheduleEntry;
}

function getScheduleForHeight(height: number): RewardScheduleEntry {
  // For now: single entry. Later: choose by fromHeight.
  return SIMPLE_SCHEDULE[0];
}

export function computeBlockRewards(height: number): BlockRewardResult {
  const entry = getScheduleForHeight(height);
  return {
    minerReward: entry.minerRewardTHE,
    nodeReward: entry.nodeRewardTHE,
    scheduleEntry: entry
  };
}

// Pseudo-address for Node Income Pool (for future)
export const NODE_POOL_ADDRESS: Address = "NIP_POOL";

import { getOrCreateAccount } from "../ledger/state";

export function applyMinerReward(
  state: ChainState,
  miner: Address,
  amount: Amount
): void {
  if (amount <= 0n) return;
  const acct = getOrCreateAccount(state, miner);
  acct.balanceTHE += amount;
}

export function applyNodeReward(
  state: ChainState,
  amount: Amount
): void {
  if (amount <= 0n) return;
  const nip = getOrCreateAccount(state, NODE_POOL_ADDRESS);
  nip.balanceTHE += amount;
}
