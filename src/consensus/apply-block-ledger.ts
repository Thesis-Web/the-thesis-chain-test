// TARGET: chain src/consensus/apply-block-ledger.ts
// apply-block-ledger.ts (Fixed Pack 8)

import type { Block } from "./block";
import { applyRewards } from "./reward-applier";
import type { EmissionBreakdown } from "../emissions/model";

/**
 * Ledger mutation wrapper for consensus.
 * Currently only applies rewards; tx logic is stubbed.
 */
export function applyLedgerWithRewards<LState>(
  prevLedger: LState,
  block: Block,
  emission: EmissionBreakdown
): LState {
  const { ledger } = applyRewards(prevLedger, emission);
  return ledger;
}
