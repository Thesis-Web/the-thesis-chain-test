// TARGET: chain src/consensus/apply-block-ledger.ts
// src/consensus/apply-block-ledger.ts
// ---------------------------------------------------------------------------
// Pack 15.2 — Consensus ledger wrapper (txs + rewards)
// ---------------------------------------------------------------------------
//
// Previously (Pack 8), this module only applied rewards:
//
//   prevLedger --applyRewards--> nextLedger
//
// With Pack 15.2, we introduce a tx pipeline while keeping behavior
// backwards-compatible:
//
//   prevLedger --txs--> ledgerAfterTxs --rewards--> finalLedger
//
// For now, the tx dispatcher is a structural no-op that validates tx shape.
// This means:
//   - all existing sims behave exactly as before
//   - the consensus engine now has a place to attach real VM rules later
// ---------------------------------------------------------------------------

import type { Block } from "./block";
import { applyRewards } from "./reward-applier";
import type { EmissionBreakdown } from "../emissions/model";
import { applyBlockTx } from "./tx/tx-dispatcher";
import type { TheTx } from "./tx/tx-types";

/**
 * Apply all txs in the block to the ledger, then apply the emission rewards.
 *
 * In Pack 15.2 the tx application step is intentionally a structural no-op
 * (see applyBlockTx). Once VM rules are finalized, that implementation can
 * evolve without changing this wrapper.
 */
export function applyLedgerWithRewards<LState>(
  prevLedger: LState,
  block: Block,
  emission: EmissionBreakdown
): LState {
  const txs = block.body.txs as readonly TheTx[];

  let ledgerAfterTxs = prevLedger;
  for (const tx of txs) {
    ledgerAfterTxs = applyBlockTx(ledgerAfterTxs, tx);
  }

  const { ledger } = applyRewards(ledgerAfterTxs, emission);
  return ledger;
}
