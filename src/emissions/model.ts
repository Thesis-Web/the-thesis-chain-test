// src/emissions/model.ts
// ---------------------------------------------------------------------------
// Emission model for miner + Node Income Pool as a function of block height.
// No ChainState here — just math.
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";
import {
  BLOCKS_PER_EPOCH,
  BASE_MINER_REWARD_THE,
  NIP_SHARE_BASIS_POINTS,
  clampEpochIndex
} from "./params";

export interface EmissionBreakdown {
  readonly minerRewardTHE: Amount;
  readonly nipRewardTHE: Amount;
  readonly totalRewardTHE: Amount;
  readonly epochIndex: number;
}

/**
 * Compute miner + NIP rewards for a given block height.
 */
export function computeEmissionForHeight(height: number): EmissionBreakdown {
  if (height <= 0) {
    throw new Error(`Block height must be >= 1, got ${height}`);
  }

  // Epoch index is 0-based.
  const epochIndexRaw = Math.floor((height - 1) / BLOCKS_PER_EPOCH);
  const epochIndex = clampEpochIndex(epochIndexRaw);

  const baseMinerReward = BASE_MINER_REWARD_THE[epochIndex];

  // NIP share in basis points (1/100 of a percent).
  const nipReward =
    (baseMinerReward * BigInt(NIP_SHARE_BASIS_POINTS)) / 10_000n;
  const minerReward = baseMinerReward - nipReward;
  const total = minerReward + nipReward;

  return {
    minerRewardTHE: minerReward,
    nipRewardTHE: nipReward,
    totalRewardTHE: total,
    epochIndex
  };
}
