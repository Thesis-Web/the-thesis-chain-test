import type { ChainState } from "../ledger/state.js";
import { CHAIN_PARAMS } from "../config/params.js";

// §085 — Split Engine
// §101 — Split Invariance Protocol
// This module defines WHEN splits occur (triggers), and HOW the state changes.

// A split event describes what kind of upward split occurred.
export interface SplitEvent {
  factor: number;       // e.g. 2, 3, 5
  height: number;       // block height where split happens
  reason: string;       // human-readable reason (“Upward Value Split”, etc.)
}

// Determine whether the next block height triggers a split.
// Later this will use epoch logic, EU oracle, and param registry.
export function checkForSplit(state: ChainState): SplitEvent | null {
  const h = state.height + 1;

  // DEV PHASE:
  // For now, fire no automatic splits. Real triggers come later.
  return null;
}

// Apply the split to the entire chain state.
// Value-conserving: balances scale down, supply scales up.
// This function is called only after a split event.
export function applySplit(state: ChainState, event: SplitEvent): void {
  const f = BigInt(event.factor);

  for (const acct of state.accounts.values()) {
    // Example invariant-preserving scale:
    //
    //   newBalance = oldBalance * f
    //
    // In a real system we will need exact integer arithmetic
    // preserving vault / escrow invariants per §065/§125.
    acct.balanceTHE = acct.balanceTHE * f;
  }

  // Additional invariants and vault scaling will be added later.
}

