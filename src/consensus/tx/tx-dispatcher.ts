// TARGET: chain src/consensus/tx/tx-dispatcher.ts
// src/consensus/tx/tx-dispatcher.ts
// ---------------------------------------------------------------------------
// Pack 15.2 — Ledger transition dispatcher (consensus-side plumbing)
// ---------------------------------------------------------------------------
//
// This module provides a single entry point:
//
//   applyBlockTx(prevLedger, tx) => nextLedger
//
// For now, this is *intentionally conservative*: we wire the tx surface but
// do not yet mutate balances. That will be introduced in a later pack once
// the full VM / ledger rules have been finalized and approved.
//
// This ensures:
//   - consensus has a typed tx pipeline
//   - we can fail fast on unknown tx shapes
//   - existing sims remain behaviorally identical
// ---------------------------------------------------------------------------

import type { TheTx } from "./tx-types";

/**
 * Apply a single transaction to the given ledger snapshot.
 *
 * NOTE:
 *   - `LState` is kept generic so that different sims / environments can
 *     plug in their own concrete ledger representation.
 *   - In Pack 15.2 this is intentionally a structural no-op that validates
 *     the tx shape and returns the previous ledger unchanged.
 */
export function applyBlockTx<LState>(prevLedger: LState, tx: TheTx): LState {
  switch (tx.txType) {
    case "TRANSFER_THE":
      // TODO (later pack): integrate with accounts ledger
      return prevLedger;

    case "MINT_EU":
      // TODO (later pack): integrate with EU registry + vault backing
      return prevLedger;

    case "REDEEM_EU":
      // TODO (later pack): integrate with EU registry redemption flow
      return prevLedger;

    case "SPLIT_AWARD":
      // TODO (later pack): hook into split engine + balance reindexing
      return prevLedger;

    case "INTERNAL_REWARD":
      // TODO (later pack): route to miner / pool reward accounts
      return prevLedger;

    default: {
      // Exhaustiveness safeguard — if a new txType is added to TheTx but not
      // handled here, TypeScript will complain once this block is enabled.
      // const _never: never = tx;
      throw new Error(`applyBlockTx: unsupported txType ${(tx as any).txType}`);
    }
  }
}
