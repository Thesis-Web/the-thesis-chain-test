// Pack 14.3.2 — Correct adapter for computeNextDifficulty(state, params, recent)
//
// Your governor currently accepts:
//   computeNextDifficulty(state, params, recent[]): DifficultyState
//
// Consensus (chain.ts) expects DifficultyTransitionResult:
//   {
//     next: DifficultyState;
//     deltaSec: number;
//     adjustmentRatio: number;
//   }
//
// This adapter recreates that expected shape while remaining compatible
// with the current Pack 13.0.1 governor.

import type { DifficultyState, GovParams, BlockMeta } from "./difficulty-governor";
import { computeNextDifficulty } from "./difficulty-governor";

export interface DifficultyTransitionResult {
  readonly next: DifficultyState;
  readonly deltaSec: number;
  readonly adjustmentRatio: number;
}

// Default proto-mode parameters (subject to tuning later)
const DEFAULT_PARAMS: GovParams = {
  targetSpacing: 240,       // 4 min block target (per your docs)
  maxAdjustUp: 4,           // difficulty can harden ×4 max per window
  maxAdjustDown: 4          // difficulty can ease ×4 max per window
};

/**
 * Apply difficulty governor in proto-mode.
 *
 * We have no recent metadata window yet, and your current governor has
 * no timestamp-based adjustment, so we:
 *
 *  - feed [] for recent window
 *  - call computeNextDifficulty(prev, params, [])
 *  - synthesize deltaSec = newTimestampSec - oldTimestampSec
 *  - synthesize adjustmentRatio = Number(next.target) / Number(prev.target)
 */
export function applyDifficultyStep(
  prev: DifficultyState,
  newTimestampSec: number,
  prevTimestampSec: number | null = null
): DifficultyTransitionResult {
  const recent: BlockMeta[] = []; // proto-mode

  const next = computeNextDifficulty(prev, DEFAULT_PARAMS, recent);

  const deltaSec =
    prevTimestampSec != null ? newTimestampSec - prevTimestampSec : 0;

  const adjustmentRatio =
    prev.target === 0n ? 1 : Number(next.target) / Number(prev.target);

  return {
    next,
    deltaSec,
    adjustmentRatio
  };
}

