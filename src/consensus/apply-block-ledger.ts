// TARGET: chain src/consensus/apply-block-ledger.ts
// src/consensus/apply-block-ledger.ts
// ---------------------------------------------------------------------------
// Pack 18 — Ledger wrapper with real tx application
// ---------------------------------------------------------------------------
//
// This replaces the old "rewards-only" wrapper from Pack 8. It now:
//
//   1. Folds all block.body.txs through applyBlockTx (TheTx VM dispatcher).
//   2. Then applies emissions/rewards on top of the tx-mutated ledger.
//   3. Returns the final LState snapshot to consensus.
//
// Behavior is *backwards compatible* for non-FullLedgerStateV1 ledgers because
// applyBlockTx falls back to a no-op when the ledger is not the canonical
// FullLedgerStateV1 type used by the main chain.
//
// This means:
//   - Existing sims that use simple ledger shapes continue to work unchanged.
//   - The main consensus path (using FullLedgerStateV1) now executes
//     TRANSFER_THE txs for real at block application time.
// ---------------------------------------------------------------------------

import type { Block } from "./block";
import { applyRewards } from "./reward-applier";
import type { EmissionBreakdown } from "../emissions/model";
import type { TheTx } from "./tx/tx-types";
import { applyBlockTx } from "./tx/tx-dispatcher";

/**
 * Ledger mutation wrapper for consensus.
 *
 * Steps:
 *   1. Start from prevLedger as the input snapshot.
 *   2. Apply each tx in block.body.txs via applyBlockTx (if any).
 *   3. Feed the tx-mutated ledger into applyRewards.
 *   4. Return the final ledger snapshot.
 */
export function applyLedgerWithRewards<LState>(
  prevLedger: LState,
  block: Block,
  emission: EmissionBreakdown
): LState {
  const txs = (block.body?.txs ?? []) as readonly TheTx[];

  let ledgerAfterTxs: LState = prevLedger;

  for (const tx of txs) {
    ledgerAfterTxs = applyBlockTx(ledgerAfterTxs, tx);
  }

  const { ledger } = applyRewards(ledgerAfterTxs, emission);
  return ledger;
}
