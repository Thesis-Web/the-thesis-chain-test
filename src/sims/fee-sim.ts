// TARGET: chain src/sims/fee-sim.ts
// src/sims/fee-sim.ts
// Pack 39 — Fee Model Sim

import { computeTxFee } from "../ledger/fee-model";

console.log("=== FEE SIM ===");

const tx = { sender: "addr1", sizeBytes: 120 };
const fee = computeTxFee(tx);

console.log("tx size:", tx.sizeBytes, "fee:", fee.toString(), "n");
console.log("=== FEE SIM COMPLETE ===");
