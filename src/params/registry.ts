// TARGET: chain src/params/registry.ts
// src/params/registry.ts
// ---------------------------------------------------------------------------
// Parameter registry scaffold (§151 / appendix-b-parameter-registry).
//
// This is a central, typed home for protocol parameters. In this v0 scaffold
// we DO NOT mutate any existing behavior; we simply mirror the constants that
// already exist in emissions/params.ts and related modules so sims and tools
// can use a single source of truth.
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";

// ---------------------------------------------------------------------------
// Emission parameters (mirrors emissions/params.ts + dev-phase overlay)
// ---------------------------------------------------------------------------

export interface EmissionPhase {
  readonly label: string;
  readonly baseMinerRewardTHE: Amount;
}

export interface EmissionDevPhaseConfig {
  readonly days: number;
  readonly maxBlockRewardTHE: Amount;
  readonly minerShareBps: number;
  readonly nipShareBps: number;
  readonly targetTotalIssuanceTHE?: Amount | null; // optional, for sims
}

export interface EmissionParams {
  readonly blockTimeSeconds: number;
  readonly blocksPerEpoch: number;
  readonly steadyStatePhases: readonly EmissionPhase[];
  readonly devPhase: EmissionDevPhaseConfig;
}

export const EMISSION_PARAMS_V1: EmissionParams = {
  blockTimeSeconds: 4 * 60,
  blocksPerEpoch: 10_080, // 28 days of 4-minute blocks
  steadyStatePhases: [
    { label: "epoch0", baseMinerRewardTHE: 10n },
    { label: "epoch1", baseMinerRewardTHE: 20n },
    { label: "epoch2_plus", baseMinerRewardTHE: 40n }
  ],
  devPhase: {
    days: 170,
    maxBlockRewardTHE: 10n,
    minerShareBps: 9_000,
    nipShareBps: 1_000,
    // The doc target is ~1,260,000 THE for dev-phase issuance. Our current
    // emission model yields ~612,000 THE for dev-only mining in the simple
    // 10 THE / block interpretation. Sims should compare and guide any future
    // recalibration before this becomes consensus-critical.
    targetTotalIssuanceTHE: 1_260_000n
  }
};

// ---------------------------------------------------------------------------
// Difficulty parameters (mirror difficulty-governor DEFAULT_DIFFICULTY_CONFIG)
// ---------------------------------------------------------------------------

export interface DifficultyParams {
  readonly maxAdjustmentPerBlock: number;
  readonly minTarget: bigint;
  readonly maxTarget: bigint;
}

export const DIFFICULTY_PARAMS_V1: DifficultyParams = {
  // Mirrors DEFAULT_DIFFICULTY_CONFIG in src/emissions/difficulty-governor.ts.
  // If that config changes, this registry entry MUST be kept in sync before
  // being used in any consensus-critical code.
  maxAdjustmentPerBlock: 0.05,
  minTarget: 1n,
  maxTarget: (1n << 255n)
};

// ---------------------------------------------------------------------------
