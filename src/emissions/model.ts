// src/emissions/model.ts
// ---------------------------------------------------------------------------
// Emission + reward schedule model for THE.
// Pure math: no ChainState imports here.
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";
import { getEpochIndex } from "../epoch/epoch";

export interface RewardScheduleEntry {
  readonly fromEpoch: number;      // inclusive
  readonly minerRewardTHE: Amount; // base units of THE
  readonly nodeRewardTHE: Amount;  // base units of THE
}

export interface BlockReward {
  readonly minerReward: Amount;
  readonly nodeReward: Amount;
  readonly epochIndex: number;
  readonly schedule: RewardScheduleEntry;
}

// ---------------------------------------------------------------------------
// Reward schedule
// ---------------------------------------------------------------------------
//
// TEMPORARY hard-coded schedule matching the spirit of §040:
//   • Epoch 0: bootstrap — 10 THE miner, 3 THE node pool
//   • Epoch 1: growth   — 20 THE miner, 3 THE node pool
//   • Epoch 2+: steady  — 40 THE miner, 3 THE node pool
//
// Later this can be replaced with an on-chain param registry.
// ---------------------------------------------------------------------------

export const REWARD_SCHEDULE: RewardScheduleEntry[] = [
  { fromEpoch: 0, minerRewardTHE: 10n, nodeRewardTHE: 3n },
  { fromEpoch: 1, minerRewardTHE: 20n, nodeRewardTHE: 3n },
  { fromEpoch: 2, minerRewardTHE: 40n, nodeRewardTHE: 3n },
];

// Choose the entry with the largest fromEpoch <= epochIndex.
// Assumes there is always at least one entry with fromEpoch = 0.
export function getRewardScheduleForEpoch(epochIndex: number): RewardScheduleEntry {
  let best: RewardScheduleEntry | null = null;

  for (const entry of REWARD_SCHEDULE) {
    if (entry.fromEpoch <= epochIndex) {
      if (!best || entry.fromEpoch > best.fromEpoch) {
        best = entry;
      }
    }
  }

  return best ?? REWARD_SCHEDULE[0];
}

// Compute miner + node rewards for a given block height.
export function computeBlockRewards(height: number): BlockReward {
  const epochIndex = getEpochIndex(height);
  const schedule = getRewardScheduleForEpoch(epochIndex);

  const minerReward = schedule.minerRewardTHE;
  const nodeReward = schedule.nodeRewardTHE;

  return {
    minerReward,
    nodeReward,
    epochIndex,
    schedule,
  };
}
