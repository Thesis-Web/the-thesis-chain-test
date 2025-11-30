// TARGET: chain src/sims/applyblock-sim.ts
// src/sims/applyblock-sim.ts
// ---------------------------------------------------------------------------
// Pack 42.1 — applyBlock smoke-test sim
//
// This sim verifies that the minimal applyBlock wiring works end-to-end:
//   • create an empty FullLedgerStateV1,
//   • construct a synthetic Block,
//   • apply it,
//   • confirm that chain.height advanced while other fields remain sane.
// ---------------------------------------------------------------------------

import { createEmptyFullLedgerStateV1 } from "../fullstate/state";
import { applyBlock } from "../consensus/apply-block";
import type { Block } from "../consensus/types";

console.log("=== APPLYBLOCK SIM ===");

const s0 = createEmptyFullLedgerStateV1();

const block: Block = {
  height: 1,
  hash: "deadbeef",
  txs: []
};

const s1 = applyBlock(s0, block);

console.log("s0.chain.height =", s0.chain.height);
console.log("s1.chain.height =", s1.chain.height);
console.log("s1.chain.lastBlockHash =", s1.chain.lastBlockHash);

console.log("=== APPLYBLOCK SIM COMPLETE ===");
