// src/sims/multiblock-sim.ts
// ---------------------------------------------------------------------------
// Pack 43 + 48C — Multi-block ChainSim (delta-aware + BackWall hook surface)
// ---------------------------------------------------------------------------
//
// This sim runs a tiny in-memory chain using the current applyBlock wiring.
// It focuses on sequencing blocks and demonstrating how FullLedgerDeltaV1
// (including SplitEngine + BackWall summaries) fits into the loop.
//
// NOTE:
//   • We now use the real delta returned from applyBlock instead of
//     constructing a fake empty delta.
//   • We destructure ApplyBlockResult into { next, delta } so that `next`
//     is a proper FullLedgerStateV1 and TypeScript can see `next.chain`.
// ---------------------------------------------------------------------------

import { createEmptyFullLedgerStateV1 } from "../fullstate/state";
import { applyBlock } from "../consensus/apply-block";
import type { Block } from "../consensus/types";

import type { FullLedgerDeltaV1 } from "../fullstate/delta";
import { printFullLedgerDeltaV1 } from "../fullstate/delta";

console.log("=== MULTIBLOCK SIM (Pack 43/48C) ===");

const initial = createEmptyFullLedgerStateV1();
let state = initial;

const numBlocks = 5;

for (let h = 1; h <= numBlocks; h++) {
  const block: Block = {
    height: h,
    hash: `block-${h}`,
    parentHash: h === 1 ? undefined : `block-${h - 1}`,
    txs: []
  };

  const prev = state;

  const { next, delta }: { next: typeof state; delta: FullLedgerDeltaV1 } =
    applyBlock(prev, block);

  console.log(`--- Block h=${h} hash=${block.hash} ---`);
  console.log(
    `  prev.height=${prev.chain.height} -> next.height=${next.chain.height}`
  );
  printFullLedgerDeltaV1(delta);

  state = next;
}

console.log("Final height =", state.chain.height);
console.log("=== MULTIBLOCK SIM COMPLETE ===");
