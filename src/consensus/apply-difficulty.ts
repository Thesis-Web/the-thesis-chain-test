// TARGET: chain src/consensus/apply-difficulty.ts
// Pack 14.3.1 — Fix API alignment with computeNextDifficulty(prev, ts, recent[])
//
// This keeps the proto consensus engine compatible with the updated
// difficulty-governor, while still running in empty-window mode.

import type { DifficultyState, BlockMeta } from "./difficulty-governor";
import { computeNextDifficulty } from "./difficulty-governor";

export interface DifficultyTransitionResult {
  readonly next: DifficultyState;
  readonly deltaSec: number;
  readonly adjustmentRatio: number;
}

/**
 * Apply the difficulty governor for a new block timestamp.
 *
 * Proto-mode uses an empty recent[] window until full block metadata
 * collection is wired into the chain.
 */
export function applyDifficultyStep(
  prev: DifficultyState,
  newTimestampSec: number
): DifficultyTransitionResult {
  const recent: BlockMeta[] = []; // proto-mode window
  return computeNextDifficulty(prev, newTimestampSec, recent);
}
