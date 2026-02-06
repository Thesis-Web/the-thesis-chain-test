// src/emissions/model.ts
// ---------------------------------------------------------------------------
// Emission model for miner + Node Income Pool as a function of block height.
// This wires the dev-phase (170 days) schedule from specs/REWARDS_EMISSIONS.md
// together with the long-term 10 → 20 → 40 THE schedule from 090-miners-and-nodes,
// taking its parameters from the EMISSION_PARAMS_V1 registry.
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";
import {
  BLOCK_TIME_SECONDS,
  BLOCKS_PER_EPOCH,
  BASE_MINER_REWARD_THE,
  NIP_SHARE_BASIS_POINTS,
  clampEpochIndex
} from "./params";
import { EMISSION_PARAMS_V1 } from "../params/registry";

export interface EmissionBreakdown {
  readonly minerRewardTHE: Amount;
  readonly nipRewardTHE: Amount;
  readonly totalRewardTHE: Amount;
  readonly epochIndex: number;
  readonly isDevPhase: boolean;
}

// ---------------------------------------------------------------------------
// Dev-phase constants (from specs/REWARDS_EMISSIONS.md via EMISSION_PARAMS_V1)
// ---------------------------------------------------------------------------
// - Duration: 170 days
// - Target mining issuance: 1,260,000 THE (checked via sims, not enforced here)
// - Block reward (mining): up to 10 THE
// - Miner payout: 90% of block reward
// - Node Service Reward: 10% of block reward (time-bounded genesis exception)
// ---------------------------------------------------------------------------

const SECONDS_PER_DAY = 24 * 60 * 60;
const DEV_PHASE_DAYS = EMISSION_PARAMS_V1.devPhase.days;

// Number of L1 blocks in the dev phase, assuming BLOCK_TIME_SECONDS is stable.
// This is intentionally computed, not hard-coded, so changes to
// EMISSION_PARAMS_V1.blockTimeSeconds automatically propagate.
export const DEV_PHASE_BLOCKS: number = Math.floor(
  (DEV_PHASE_DAYS * SECONDS_PER_DAY) / BLOCK_TIME_SECONDS
);

// "Up to 10 THE" per mining block during dev phase.
const DEV_PHASE_MAX_BLOCK_REWARD_THE: Amount = EMISSION_PARAMS_V1.devPhase.maxBlockRewardTHE;

// 90% miner / 10% Node Service Reward during dev phase.
const DEV_PHASE_MINER_SHARE_BASIS_POINTS = EMISSION_PARAMS_V1.devPhase.minerShareBps;
const DEV_PHASE_NIP_SHARE_BASIS_POINTS = EMISSION_PARAMS_V1.devPhase.nipShareBps;

// Internal helper: compute emission for a dev-phase block.
function computeDevPhaseEmission(height: number): EmissionBreakdown {
  if (height < 0) {
    throw new Error(`computeEmissionForHeight: negative height ${height}`);
  }

  const base: Amount = DEV_PHASE_MAX_BLOCK_REWARD_THE;

  const totalBasisPoints =
    DEV_PHASE_MINER_SHARE_BASIS_POINTS + DEV_PHASE_NIP_SHARE_BASIS_POINTS;
  if (totalBasisPoints !== 10_000) {
    throw new Error("Dev-phase basis points must sum to 100%");
  }

  const baseBig = base;
  const minerReward =
    (baseBig * BigInt(DEV_PHASE_MINER_SHARE_BASIS_POINTS)) / 10_000n;
  const nipReward = baseBig - minerReward;
  const total = minerReward + nipReward;

  return {
    minerRewardTHE: minerReward,
    nipRewardTHE: nipReward,
    totalRewardTHE: total,
    // Epoch index is not meaningful during dev phase; 0 is a safe placeholder.
    epochIndex: 0,
    isDevPhase: true
  };
}

// ---------------------------------------------------------------------------
// Steady-state emission model (post dev-phase)
// ---------------------------------------------------------------------------
// This uses BASE_MINER_REWARD_THE and NIP_SHARE_BASIS_POINTS from params.ts.
// In steady-state, NIP_SHARE_BASIS_POINTS is expected to be 0 and node income
// is funded via fees / treasury as per specs/NODE_TIERS.md.
// ---------------------------------------------------------------------------

function computeSteadyStateEmission(height: number): EmissionBreakdown {
  const epochIndex = clampEpochIndex(Math.floor(height / BLOCKS_PER_EPOCH));
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
    epochIndex,
    isDevPhase: false
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the miner + Node Income Pool emission for a given block height.
 *
 * Height 0..DEV_PHASE_BLOCKS-1 → dev-phase (170 days, up to 10 THE, 90/10 split).
 * Height >= DEV_PHASE_BLOCKS     → steady-state 10 → 20 → 40 THE schedule.
 */
export function computeEmissionForHeight(height: number): EmissionBreakdown {
  if (!Number.isFinite(height) || height < 0) {
    throw new Error(`computeEmissionForHeight: invalid height ${height}`);
  }

  if (height < DEV_PHASE_BLOCKS) {
    return computeDevPhaseEmission(height);
  }

  return computeSteadyStateEmission(height);
}
