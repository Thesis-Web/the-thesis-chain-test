// TARGET: chain src/consensus/types.ts
// src/consensus/types.ts
// ---------------------------------------------------------------------------
// Pack 42.1 + 45 — Minimal consensus Block type (temporary)
//
// This is a lightweight placeholder so that applyBlock and sims can compile.
// Later packs will extend / replace this with the canonical Block and Header
// definitions that match the wire / storage format.
// ---------------------------------------------------------------------------

export interface Block {
  readonly height: number;
  readonly hash: string;
  readonly parentHash?: string;
  readonly txs: readonly any[]; // will be Tx[] once the VM wiring is finalized

  // Optional wall-clock timestamp (seconds since epoch) for difficulty sims
  // and future consensus rules. Existing code is not required to populate
  // this yet; Pack 45 sims use it for the DifficultyGovernor safe-mode loop.
  readonly timestampSec?: number;
}
