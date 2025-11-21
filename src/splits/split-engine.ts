// src/splits/split-engine.ts
// ---------------------------------------------------------------------------
// Upward Split Engine (v1 scaffold)
// ---------------------------------------------------------------------------
//
// This module implements a minimal "upward split" engine for THE:
//   - A static split schedule (by block height)
//   - A pure function to look up split factor for a given height
//   - A state mutator that scales all account + vault balances
//
// Invariants (for now, test-only):
//   • factor > 0n
//   • Only balances scale; ownership / ids / metadata unchanged
// ---------------------------------------------------------------------------

import type { ChainState } from "../ledger/state";

// A single split event in the schedule.
export interface SplitScheduleEntry {
  readonly height: number;   // block height at which split is applied
  readonly factor: bigint;   // upward factor, e.g. 2n = 2×
  readonly label?: string;   // human-readable tag for debugging
}

// For now this is a hard-coded test schedule.
// Later this will come from params / governance (§085).
export const SPLIT_SCHEDULE: SplitScheduleEntry[] = [
  {
    height: 10,
    factor: 2n,
    label: "TEST_SPLIT_2X_AT_10",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

// If there's a split scheduled at this exact height, return its factor.
// Otherwise return null (no split).
export function getSplitFactorForHeight(height: number): bigint | null {
  const entry = SPLIT_SCHEDULE.find((e) => e.height === height);
  return entry ? entry.factor : null;
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------
//
// NOTE: This mutates ChainState *in place*.
// We deliberately keep it stupid-simple for v1:
//   • scale all account balances by factor
//   • scale all vault balances by factor
//   • do NOT touch anything else (ids, owners, metadata, rewards, etc.)
// ---------------------------------------------------------------------------

export function applySplitToState(state: ChainState, factor: bigint): void {
  if (factor <= 0n) {
    throw new Error("applySplitToState: factor must be positive");
  }

  // Scale all account balances.
  for (const acct of state.accounts.values()) {
    acct.balanceTHE *= factor;
  }

  // Scale all vault balances.
  for (const vault of state.vaults.values()) {
    vault.balanceTHE *= factor;
  }
}
