// TARGET: chain src/consensus/consensus-delta.ts
// src/consensus/consensus-delta.ts
// Pack 39 — Extend ConsensusDelta with feesCollectedTHE

export interface ConsensusDelta {
  // existing fields preserved
  splitEvent?: any;
  ledgerDelta?: any;
  euRegistryDelta?: any;

  feesCollectedTHE: bigint;
}

// Minimal constructor
export function createEmptyConsensusDelta(): ConsensusDelta {
  return {
    splitEvent: undefined,
    ledgerDelta: undefined,
    euRegistryDelta: undefined,
    feesCollectedTHE: 0n,
  };
}
