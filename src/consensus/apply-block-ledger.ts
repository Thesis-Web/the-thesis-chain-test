// src/consensus/apply-block-ledger.ts
// ---------------------------------------------------------------------------
// Pack 18  — Ledger wrapper with real tx application
// Pack 54  — Optional EU atomic shadow check (non-invasive)
// ---------------------------------------------------------------------------
//
// This replaces the old "rewards-only" wrapper from Pack 8. It now:
//
//   1. Folds all block.body.txs through applyBlockTx (TheTx VM dispatcher).
//   2. Then applies emissions/rewards on top of the tx-mutated ledger.
//   3. Returns the final LState snapshot to consensus.
//
// Behaviour is *backwards compatible* for non-FullLedgerStateV1 ledgers because
// applyBlockTx falls back to a no-op when the ledger is not the canonical
// FullLedgerStateV1 type used by the main chain.
//
// This means:
//   - Existing sims that use simple ledger shapes continue to work unchanged.
//   - The main consensus path (using FullLedgerStateV1) now executes
//     TRANSFER_THE txs for real at block application time.
//
// Pack 54 adds an optional, non-invasive EU atomic "shadow" check that can be
// enabled by callers for sims / audits without changing consensus validity
// rules. When enabled, this hook runs *after* all txs + rewards have been
// applied, just before returning the next ledger snapshot.
// ---------------------------------------------------------------------------

import type { Block } from "./block";
import { applyRewards } from "./reward-applier";
import type { EmissionBreakdown } from "../emissions/model";
import type { TheTx } from "./tx/tx-types";
import { applyBlockTx } from "./tx/tx-dispatcher";
import { DEFAULT_ATOMIC_COIN_POLICY } from "../ledger/atomic-coin";
import {
  runEuAtomicShadowCheck,
  type EuAtomicShadowContext,
} from "../ledger/atomic-eu-shadow-check";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Optional knobs for applyLedgerWithRewards.
 *
 * shadowEuAtomicCheck:
 *   When true, run a shadow EU atomicity check against the resulting
 *   ledger using the default atomic coin policy. This is intended for sims
 *   and internal tooling only; it does not alter consensus rules.
 */
export interface ApplyLedgerWithRewardsOptions {
  readonly shadowEuAtomicCheck?: boolean;
}

// ---------------------------------------------------------------------------
// applyLedgerWithRewards
// ---------------------------------------------------------------------------

/**
 * Ledger mutation wrapper for consensus.
 *
 * Steps:
 *   1. Start from prevLedger as the input snapshot.
 *   2. Apply each tx in block.body.txs via applyBlockTx (if any).
 *   3. Feed the tx-mutated ledger into applyRewards.
 *   4. Optionally run a shadow EU atomicity check (when opts.shadowEuAtomicCheck is true).
 *   5. Return the final ledger snapshot.
 */
export function applyLedgerWithRewards<LState>(
  prevLedger: LState,
  block: Block,
  emission: EmissionBreakdown,
  opts?: ApplyLedgerWithRewardsOptions,
): LState {
  const txs = (block.body?.txs ?? []) as readonly TheTx[];

  let ledgerAfterTxs: LState = prevLedger;

  for (const tx of txs) {
    ledgerAfterTxs = applyBlockTx(ledgerAfterTxs, tx);
  }

  const { ledger } = applyRewards(ledgerAfterTxs, emission);

  if (opts?.shadowEuAtomicCheck) {
    const ctx: EuAtomicShadowContext = {
      height: (block as any).header?.height,
      blockHash: (block as any).header?.hash ?? null,
    };

    runEuAtomicShadowCheck(ledger as unknown, DEFAULT_ATOMIC_COIN_POLICY, ctx);
  }

  return ledger;
}
