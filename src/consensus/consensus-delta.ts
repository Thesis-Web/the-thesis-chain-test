// TARGET: chain src/consensus/consensus-delta.ts
// src/consensus/consensus-delta.ts
// Pack 39 — Extend ConsensusDelta with feesCollectedTHE
// Pack 54C — Restore makeConsensusDelta alias for legacy sims
//
// NOTE:
//   Historically, sims imported `makeConsensusDelta` from this module.
//   Later we introduced `createEmptyConsensusDelta` as the canonical constructor.
//   To avoid breaking existing sims (e.g. chain-split-log-sim-ramp.ts) we now
//   export `makeConsensusDelta` as a thin alias around `createEmptyConsensusDelta`.
//   New code should prefer `createEmptyConsensusDelta` directly.

export interface ConsensusDelta {
  // existing fields preserved
  splitEvent?: any;
  ledgerDelta?: any;
  euRegistryDelta?: any;

  feesCollectedTHE: bigint;
}

// Canonical empty constructor
export function createEmptyConsensusDelta(): ConsensusDelta {
  return {
    splitEvent: undefined,
    ledgerDelta: undefined,
    euRegistryDelta: undefined,
    feesCollectedTHE: 0n,
  };
}

// Legacy alias for older sims
export function makeConsensusDelta(): ConsensusDelta {
  return createEmptyConsensusDelta();
}
