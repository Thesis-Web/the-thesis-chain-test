// TARGET: chain src/sims/applyblock-sim.ts
import { createEmptyFullLedgerStateV1 } from "../fullstate/state";
import { applyBlock } from "../consensus/apply-block";

console.log("=== APPLYBLOCK SIM ===");

const s0 = createEmptyFullLedgerStateV1();

const block = {
  height: 1,
  hash: "deadbeef",
  txs: []
};

const s1 = applyBlock(s0, block);

console.log("s1.chain.height =", s1.chain.height);
console.log("=== APPLYBLOCK SIM COMPLETE ===");
