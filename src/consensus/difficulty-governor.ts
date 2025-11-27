// TARGET: chain src/consensus/difficulty-governor.ts
// Pack 9 — Difficulty Governor v0
//
// Simple, safe difficulty controller:
// - Target block time: 240 seconds
// - Adjusts target up/down slowly based on last block delta
// - Uses BigInt for the target so it can evolve into a real PoW curve later

export interface DifficultyState {
  readonly target: bigint;       // higher = easier (more lenient) target
  readonly lastTimestampSec: number;
}

export const TARGET_BLOCK_TIME_SEC = 240;

// Reasonable starting target for sims; real networks can override.
export const INITIAL_DIFFICULTY_STATE: DifficultyState = {
  target: 2n ** 240n,
  lastTimestampSec: 0
};

export interface DifficultyStepResult {
  readonly next: DifficultyState;
  readonly deltaSec: number;
  readonly adjustmentRatio: number;
}

/**
 * Compute the next difficulty state given the previous state and the
 * new block's timestamp (in seconds).
 *
 * This is deliberately simple and conservative:
 *   - no huge jumps,
 *   - ignores outlier deltas < 1 second,
 *   - only adjusts a small fraction (1/32) per block.
 */
export function computeNextDifficulty(
  prev: DifficultyState,
  newTimestampSec: number
): DifficultyStepResult {
  const rawDelta = newTimestampSec - prev.lastTimestampSec;
  const deltaSec = Math.max(1, rawDelta);

  const ratio = deltaSec / TARGET_BLOCK_TIME_SEC; // >1 = slow, <1 = fast

  let nextTarget = prev.target;

  if (ratio > 1.05) {
    // Blocks too slow → make target easier (increase target)
    nextTarget = prev.target + prev.target / 32n;
  } else if (ratio < 0.95) {
    // Blocks too fast → make target harder (decrease target)
    nextTarget = prev.target - prev.target / 32n;
  }

  if (nextTarget < 1n) {
    nextTarget = 1n;
  }

  const next: DifficultyState = {
    target: nextTarget,
    lastTimestampSec: newTimestampSec
  };

  return {
    next,
    deltaSec,
    adjustmentRatio: ratio
  };
}
