// src/emissions/difficulty-governor.ts
// ---------------------------------------------------------------------------
// Difficulty Governor v0 for THE (L1)
// ---------------------------------------------------------------------------
//
// This module implements a minimal, deterministic difficulty adjustment loop
// for the L1 PoW engine, matching docs/sections/041-difficulty-governor-v0.md
// (v0 draft).
//
// Goals (v0):
//   - Keep average block time near BLOCK_TIME_SECONDS (4 minutes)
//   - Adjust difficulty smoothly (bounded per block)
//   - Avoid oscillations and extreme jumps
//   - Stay stateless: all inputs are explicit
//
// Notes:
//   - Difficulty is expressed as a "target" in the 2^256 hash space.
//     • Smaller target  => harder mining
//     • Larger target   => easier mining
//
// This governor does **not** touch ChainState; it only updates the target
// used by the PoW engine. Block/Node sims are responsible for calling this
// on each new block.
// ---------------------------------------------------------------------------

import { BLOCK_TIME_SECONDS } from "./params";

// Inputs required to compute a new difficulty target.
export interface DifficultySample {
  readonly prevTarget: bigint;
  readonly prevTimestampSec: number;  // seconds since epoch of previous block
  readonly thisTimestampSec: number;  // seconds since epoch of current block
}

// Configuration for v0 governor. Kept simple & explicit for sims.
export interface DifficultyConfig {
  readonly targetBlockTimeSeconds: number;
  // Maximum relative adjustment per block (e.g. 0.05 = ±5%)
  readonly maxAdjustmentPerBlock: number;
  // Absolute clamps on the target to avoid extremes.
  readonly minTarget: bigint;
  readonly maxTarget: bigint;
}

// Default config for L1 difficulty v0.
// These values are intentionally conservative.
export const DEFAULT_DIFFICULTY_CONFIG: DifficultyConfig = {
  targetBlockTimeSeconds: BLOCK_TIME_SECONDS,
  maxAdjustmentPerBlock: 0.05, // ±5% per block
  // NOTE: These clamps are wide; sims can tighten them as needed.
  minTarget: 1n,
  maxTarget: (1n << 255n) // half the full 2^256 range
};

/**
 * Compute the new difficulty target for the next block.
 *
 * Intuition:
 *   - If blocks are coming in too fast (actual < target):
 *       => make mining harder  => decrease target
 *   - If blocks are too slow (actual > target):
 *       => make mining easier  => increase target
 *
 * The change is bounded by maxAdjustmentPerBlock to keep behavior smooth.
 */
export function adjustDifficultyTarget(
  sample: DifficultySample,
  config: DifficultyConfig = DEFAULT_DIFFICULTY_CONFIG
): bigint {
  const { prevTarget, prevTimestampSec, thisTimestampSec } = sample;
  const { targetBlockTimeSeconds, maxAdjustmentPerBlock, minTarget, maxTarget } =
    config;

  if (thisTimestampSec <= prevTimestampSec) {
    // Non-increasing timestamps: treat as a no-op to keep consensus simple.
    return clampTarget(prevTarget, minTarget, maxTarget);
  }

  const actualDelta = thisTimestampSec - prevTimestampSec;
  if (actualDelta <= 0) {
    return clampTarget(prevTarget, minTarget, maxTarget);
  }

  // Ratio of observed time vs target time.
  const ratio = actualDelta / targetBlockTimeSeconds;

  // Compute a bounded adjustment factor.
  //
  // We interpret ratio like:
  //   - ratio < 1  => blocks too fast  => factor < 1  => smaller target
  //   - ratio > 1  => blocks too slow  => factor > 1  => larger target
  const maxAdj = Math.max(0, maxAdjustmentPerBlock);
  const minFactor = 1 - maxAdj;
  const maxFactor = 1 + maxAdj;

  let factor = ratio;
  if (factor < minFactor) factor = minFactor;
  if (factor > maxFactor) factor = maxFactor;

  // Apply factor to previous target.
  const nextAsNumber = Number(factor) * Number(prevTarget);

  // Guard against overflow / invalid numbers.
  if (!Number.isFinite(nextAsNumber) || nextAsNumber <= 0) {
    return clampTarget(prevTarget, minTarget, maxTarget);
  }

  // Convert back to bigint.
  const nextTarget = BigInt(Math.round(nextAsNumber));
  return clampTarget(nextTarget, minTarget, maxTarget);
}

function clampTarget(target: bigint, minTarget: bigint, maxTarget: bigint): bigint {
  if (target < minTarget) return minTarget;
  if (target > maxTarget) return maxTarget;
  return target;
}
