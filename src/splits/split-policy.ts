// TARGET: chain src/splits/split-policy.ts
// src/splits/split-policy.ts
// ---------------------------------------------------------------------------
// Split policy scaffold (§085, §101).
//
// This file does NOT execute splits on ChainState. Instead, it encodes the
// policy surface that will eventually be driven by:
//   • THE/EU price oracle
//   • Governance-approved thresholds
//   • Allowed multipliers (2x, 3x, 5x)
//   • Invariant checks (supply conservation, vault redemption parity, etc.)
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";

// Allowed discrete split factors from the spec.
export type SplitFactor = 2n | 3n | 5n;

export interface SplitThreshold {
  readonly factor: SplitFactor;
  readonly triggerThePerEu: number; // e.g. 3.0 means THE/EU >= 3.0
}

export interface SplitPolicyParams {
  readonly thresholds: readonly SplitThreshold[];
  readonly minBlocksBetweenSplits: number;
}

export interface SplitDecisionInput {
  readonly height: number;
  readonly thePerEuPrice: number | null; // null if oracle unavailable
  readonly lastSplitHeight: number | null;
  readonly params: SplitPolicyParams;
}

export interface SplitDecision {
  readonly shouldSplit: boolean;
  readonly factor: SplitFactor | null;
  readonly reason: string;
}

// Default v0 policy parameters: these are placeholders and should be wired to
// the real parameter registry / DAO-configured values later.
export const DEFAULT_SPLIT_POLICY: SplitPolicyParams = {
  thresholds: [
    { factor: 2n, triggerThePerEu: 3.0 },
    { factor: 3n, triggerThePerEu: 7.0 },
    { factor: 5n, triggerThePerEu: 15.0 }
  ],
  minBlocksBetweenSplits: 10_080 // ~1 month (28 days) in L1 time
};

export function evaluateSplitDecision(input: SplitDecisionInput): SplitDecision {
  const { height, thePerEuPrice, lastSplitHeight, params } = input;

  if (height < 0) {
    return { shouldSplit: false, factor: null, reason: "invalid_height" };
  }

  if (thePerEuPrice == null || !Number.isFinite(thePerEuPrice)) {
    return { shouldSplit: false, factor: null, reason: "no_price" };
  }

  if (thePerEuPrice <= 0) {
    return { shouldSplit: false, factor: null, reason: "non_positive_price" };
  }

  if (lastSplitHeight != null) {
    const blocksSince = height - lastSplitHeight;
    if (blocksSince < params.minBlocksBetweenSplits) {
      return {
        shouldSplit: false,
        factor: null,
        reason: "min_interval_not_met"
      };
    }
  }

  // Find the highest-factor threshold that is satisfied by current price.
  const eligible = params.thresholds
    .filter(t => thePerEuPrice >= t.triggerThePerEu)
    .sort((a, b) => Number(a.factor - b.factor));

  if (eligible.length === 0) {
    return { shouldSplit: false, factor: null, reason: "below_threshold" };
  }

  const chosen = eligible[eligible.length - 1];

  return {
    shouldSplit: true,
    factor: chosen.factor,
    reason: "threshold_met"
  };
}
