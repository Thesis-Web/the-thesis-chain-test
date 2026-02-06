// src/sims/applyblock-sim.ts
// ---------------------------------------------------------------------------
// Pack 54B — applyBlock smoke-test sim (updated for ApplyBlockResult)
// ---------------------------------------------------------------------------
//
// This sim verifies that the minimal applyBlock wiring works end-to-end:
//   • create an empty FullLedgerStateV1,
//   • construct a synthetic Block,
//   • apply it via applyBlock,
//   • confirm that chain.height advanced while other fields remain sane.
//
// NOTE:
//   • Updated after Packs 42/46/54 so that it works with the current
//     ApplyBlockResult shape (next + delta), instead of assuming
//     applyBlock returns the raw FullLedgerStateV1.
// ---------------------------------------------------------------------------

import { createEmptyFullLedgerStateV1 } from "../fullstate/state";
import { applyBlock, type ApplyBlockResult } from "../consensus/apply-block";
import type { Block } from "../consensus/types";

console.log("=== APPLYBLOCK SIM ===");

const s0 = createEmptyFullLedgerStateV1();

const block: Block = {
  height: 1,
  hash: "deadbeef",
  txs: []
};

const result: ApplyBlockResult = applyBlock(s0, block);
const s1 = result.next;

console.log("s0.chain.height =", s0.chain.height);
console.log("s1.chain.height =", s1.chain.height);
console.log("s1.chain.lastBlockHash =", s1.chain.lastBlockHash);

console.log("=== APPLYBLOCK SIM COMPLETE ===");
