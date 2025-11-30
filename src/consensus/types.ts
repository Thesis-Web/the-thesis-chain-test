// TARGET: chain src/consensus/types.ts
// src/consensus/types.ts
// ---------------------------------------------------------------------------
// Pack 42.1 — Minimal consensus Block type (temporary)
//
// This is a lightweight placeholder so that applyBlock can compile and sims
// can run. Later packs will extend / replace this with the canonical Block
// and Header definitions that match the wire / storage format.
// ---------------------------------------------------------------------------

export interface Block {
  readonly height: number;
  readonly hash: string;
  readonly parentHash?: string;
  readonly txs: readonly any[]; // will be Tx[] once the VM wiring is finalized
}
