// src/consensus/difficulty-safe.ts
// ---------------------------------------------------------------------------
// Pack 45 — Difficulty Governor (delta-safe scaffold)
//
// This module provides a small, self-contained difficulty adjustment loop
// suitable for sims and future wiring into ConsensusState. It is deliberately
// conservative:
//   • Uses a simple proportional adjustment based on block time vs target.
//   • Clamps adjustments to avoid runaway behavior.
//   • Enters a "safe_mode" when timestamps look adversarial or insane.
// ---------------------------------------------------------------------------

import type { Block } from "./types";

// Target block time: 4 minutes (240 seconds).
export const TARGET_BLOCK_TIME_SEC = 4 * 60;

// Maximum multiplier change per block (e.g. 4x up or 4x down).
export const MAX_ADJUST_FACTOR_PER_BLOCK = 4n;

// Minimum absolute difficulty (never drop to zero).
export const MIN_DIFFICULTY = 1n;

export type DifficultyReason =
  | "too_fast"
  | "too_slow"
  | "on_target"
  | "safe_mode";

export interface DifficultyState {
  readonly height: number;
  readonly current: bigint;
}

export interface DifficultyDelta {
  readonly before: DifficultyState;
  readonly after: DifficultyState;
  readonly reason: DifficultyReason;
  readonly observedBlockTimeSec: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampDifficulty(value: bigint): bigint {
  if (value < MIN_DIFFICULTY) return MIN_DIFFICULTY;
  return value;
}

function computeRawAdjustFactor(actual: number): number {
  // Very small epsilon to avoid division-by-zero weirdness.
  const eps = 1e-9;
  return TARGET_BLOCK_TIME_SEC / Math.max(actual, eps);
}

function clampAdjustFactor(f: number): bigint {
  // Convert the floating factor into an integer multiplier in [1/MAX, MAX].
  if (!Number.isFinite(f) || f <= 0) {
    return 1n;
  }

  if (f > Number(MAX_ADJUST_FACTOR_PER_BLOCK)) {
    return MAX_ADJUST_FACTOR_PER_BLOCK;
  }

  if (f < 1 / Number(MAX_ADJUST_FACTOR_PER_BLOCK)) {
    return 1n / MAX_ADJUST_FACTOR_PER_BLOCK;
  }

  // For simplicity, anything within the safe band becomes 1x.
  return 1n;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

export function createInitialDifficultyState(): DifficultyState {
  return {
    height: 0,
    current: 1_000_000n
  };
}

export function stepDifficultyWithBlock(
  prev: DifficultyState,
  parentBlock: Block | null,
  block: Block
): DifficultyDelta {
  const before: DifficultyState = prev;

  // If we don't have timestamps, enter safe_mode and keep difficulty flat.
  if (!block.timestampSec || !parentBlock || !parentBlock.timestampSec) {
    const after: DifficultyState = {
      height: block.height,
      current: prev.current
    };
    return {
      before,
      after,
      reason: "safe_mode",
      observedBlockTimeSec: null
    };
  }

  const dt = block.timestampSec - parentBlock.timestampSec;

  // If dt is negative or absurd, treat as adversarial and freeze difficulty.
  if (dt <= 0 || dt > TARGET_BLOCK_TIME_SEC * 10) {
    const after: DifficultyState = {
      height: block.height,
      current: prev.current
    };
    return {
      before,
      after,
      reason: "safe_mode",
      observedBlockTimeSec: dt
    };
  }

  let reason: DifficultyReason;
  if (dt < TARGET_BLOCK_TIME_SEC * 0.8) {
    reason = "too_fast";
  } else if (dt > TARGET_BLOCK_TIME_SEC * 1.2) {
    reason = "too_slow";
  } else {
    reason = "on_target";
  }

  // Very simple proportional-style adjustment as a scaffold.
  const rawFactor = computeRawAdjustFactor(dt);
  const clampedFactor = clampAdjustFactor(rawFactor);

  // Because clampedFactor is a bigint multiplier, we apply it as:
  // next = current * clampedFactor  (with MIN_DIFFICULTY clamp).
  let nextDifficulty = prev.current * clampedFactor;
  nextDifficulty = clampDifficulty(nextDifficulty);

  const after: DifficultyState = {
    height: block.height,
    current: nextDifficulty
  };

  return {
    before,
    after,
    reason,
    observedBlockTimeSec: dt
  };
}
