// src/tools/split-diff.ts
// ---------------------------------------------------------------------------
// Split diff / analysis helpers (v0)
// ---------------------------------------------------------------------------
// These utilities are intended for offline / sim usage to reason about how
// cumulative split factors map to effective reward and balance units, and to
// compare observed split sequences against expected ones from the spec.
// They are not used in consensus code.
// ---------------------------------------------------------------------------

import type { SplitFactor } from "../splits/split-policy";

export interface SplitEvent {
  readonly height: number;
  readonly factor: SplitFactor;
}

export interface SplitSequenceAnalysis {
  readonly events: readonly SplitEvent[];
  readonly finalCumulativeFactor: bigint;
}

/**
 * Compute the cumulative product of split factors from a sequence of events.
 */
export function analyzeSplitSequence(events: readonly SplitEvent[]): SplitSequenceAnalysis {
  let cumulativeFactor = 1n;
  for (const ev of events) {
    cumulativeFactor *= ev.factor;
  }
  return {
    events,
    finalCumulativeFactor: cumulativeFactor
  };
}

/**
 * Compare two split sequences (e.g., spec vs. observed) and report whether they
 * share the same heights and cumulative factor. This is intentionally minimal
 * and is meant for debug tooling and tests, not consensus logic.
 */
export function diffSplitSequences(
  expected: readonly SplitEvent[],
  observed: readonly SplitEvent[]
): {
  readonly sameLength: boolean;
  readonly sameHeights: boolean;
  readonly sameFinalCumulativeFactor: boolean;
} {
  const sameLength = expected.length === observed.length;
  const sameHeights =
    sameLength &&
    expected.every((ev, idx) => ev.height === observed[idx].height);

  const expectedAnalysis = analyzeSplitSequence(expected);
  const observedAnalysis = analyzeSplitSequence(observed);

  const sameFinalCumulativeFactor =
    expectedAnalysis.finalCumulativeFactor === observedAnalysis.finalCumulativeFactor;

  return {
    sameLength,
    sameHeights,
    sameFinalCumulativeFactor
  };
}
