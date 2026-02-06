// src/emissions/params.ts
// ---------------------------------------------------------------------------
// Canonical chain-level emission + timing parameters for THE (v1, registry-backed)
// ---------------------------------------------------------------------------
//
// This module now acts as a thin adapter over the parameter registry defined in
// src/params/registry.ts. It preserves the public surface that the rest of the
// codebase already uses (BLOCK_TIME_SECONDS, BLOCKS_PER_EPOCH, etc.) while
// taking its values from EMISSION_PARAMS_V1 so tools and sims can rely on a
// single canonical source of truth.
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";
import { EMISSION_PARAMS_V1 } from "../params/registry";

// Target block time for L1 (THE spec: ~4 minutes)
export const BLOCK_TIME_SECONDS: number = EMISSION_PARAMS_V1.blockTimeSeconds;

// Epoch length: 28 days of 4-minute blocks
export const BLOCKS_PER_EPOCH: number = EMISSION_PARAMS_V1.blocksPerEpoch;

// Base miner block reward per epoch (in THE).
//
// Epoch 0: 10 THE
// Epoch 1: 20 THE
// Epoch 2+: 40 THE
//
// We derive this from EMISSION_PARAMS_V1.steadyStatePhases to keep the registry
// as the ground truth. The order of phases in the registry must match the
// semantic expectation here (epoch0, epoch1, epoch2+).
export const BASE_MINER_REWARD_THE: readonly Amount[] =
  EMISSION_PARAMS_V1.steadyStatePhases.map(p => p.baseMinerRewardTHE) as readonly Amount[];

// Node Income Pool share in basis points (1/100 of a percent).
//
// NOTE (v0): Per specs/REWARDS_EMISSIONS.md & specs/NODE_TIERS.md, steady-state
// node rewards are funded from fees/treasury, not from the Mining Escrow base.
// During this L1 dev phase, we keep the emission-funded NIP share at 0. A
// future fee-funded Node Income Pool will be wired separately.
export const NIP_SHARE_BASIS_POINTS = 0; // 0% from emission; NIP is fee-funded in later phases

// Helper to clamp an epoch index into the defined schedule range.
export function clampEpochIndex(epochIndex: number): number {
  if (epochIndex < 0) return 0;
  const last = BASE_MINER_REWARD_THE.length - 1;
  return epochIndex > last ? last : epochIndex;
}
