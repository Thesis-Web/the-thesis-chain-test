// TARGET: chain src/consensus/apply-difficulty.ts
// Pack 9 — Difficulty integration helper.
//
// This keeps the difficulty logic separate from the main consensus
// applyBlock flow so we can evolve it without rewriting chain.ts.

import type { DifficultyState } from "./difficulty-governor";
import { computeNextDifficulty } from "./difficulty-governor";

export interface DifficultyTransitionResult {
  readonly next: DifficultyState;
  readonly deltaSec: number;
  readonly adjustmentRatio: number;
}

/**
 * Apply the difficulty governor for a new block timestamp.
 */
export function applyDifficultyStep(
  prev: DifficultyState,
  newTimestampSec: number
): DifficultyTransitionResult {
  return computeNextDifficulty(prev, newTimestampSec);
}
