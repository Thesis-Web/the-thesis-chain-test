// src/node/mempool.ts
// ---------------------------------------------------------------------------
// Very simple in-memory mempool for sims.
//  - Stores AnyTx objects
//  - Allows add, snapshot, and removal of included txs
// ---------------------------------------------------------------------------

import type { AnyTx } from "../ledger/block";

export class Mempool {
  private txs: AnyTx[] = [];

  // Add a transaction to the mempool.
  addTx(tx: AnyTx): void {
    this.txs.push(tx);
  }

  // Get a shallow copy of all pending txs.
  getAll(): AnyTx[] {
    return this.txs.slice();
  }

  // Remove a set of txs that were included in a block.
  // We rely on object identity here (same tx objects are gossiped).
  removeTxs(consumed: AnyTx[]): void {
    if (consumed.length === 0) return;
    const removeSet = new Set(consumed);
    this.txs = this.txs.filter((tx) => !removeSet.has(tx));
  }

  // Optional: clear everything (not strictly needed, but handy).
  clear(): void {
    this.txs = [];
  }

  get size(): number {
    return this.txs.length;
  }
}
