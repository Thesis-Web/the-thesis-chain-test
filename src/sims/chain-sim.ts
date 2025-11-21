// src/sims/chain-sim.ts
// ---------------------------------------------------------------------------
// CONSENSUS / CHAIN SIM (v0)
// ---------------------------------------------------------------------------
//
// This simulation exercises:
//   • Header validation rules (height + prevHash)
//   • Safe block application via applyBlockValidated
//   • Rejection of an invalid block
// ---------------------------------------------------------------------------

import {
  createEmptyChainState,
  getOrCreateAccount
} from "../ledger/state";
import {
  makeSimpleBlock,
  applyBlockValidated,
  type PaymentTx
} from "../ledger/block";

console.log("=== CONSENSUS / CHAIN SIM ===\n");

const state = createEmptyChainState();

const A = "ADDR_A";
const B = "ADDR_B";
const MINER = "MINER_X";

// Seed balances
getOrCreateAccount(state, A).balanceTHE = 1000n;
getOrCreateAccount(state, B).balanceTHE = 0n;

console.log("Initial state:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// ---------------------------------------------------------------------------
// BLOCK 1 — valid
// ---------------------------------------------------------------------------

const block1Txs: PaymentTx[] = [
  {
    txType: "PAYMENT",
    from: A,
    to: B,
    amount: 100n
  }
];

const block1 = makeSimpleBlock(1, state.lastBlockHash, MINER, block1Txs);

console.log("\n>>> APPLY VALID BLOCK 1");
applyBlockValidated(state, block1);
console.log("After Block 1:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// ---------------------------------------------------------------------------
// BLOCK 2 — valid
// ---------------------------------------------------------------------------

const block2Txs: PaymentTx[] = [
  {
    txType: "PAYMENT",
    from: B,
    to: A,
    amount: 30n
  }
];

const block2 = makeSimpleBlock(2, state.lastBlockHash, MINER, block2Txs);

console.log("\n>>> APPLY VALID BLOCK 2");
applyBlockValidated(state, block2);
console.log("After Block 2:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// ---------------------------------------------------------------------------
// BLOCK 3 — intentionally INVALID (bad prevHash)
// ---------------------------------------------------------------------------

const badPrevHash = "HASH_BAD_PREV";
const badBlock = makeSimpleBlock(3, badPrevHash, MINER, []);

console.log("\n>>> APPLY INVALID BLOCK 3 (bad prevHash)");
try {
  applyBlockValidated(state, badBlock);
  console.log("!! Unexpectedly accepted invalid block !!");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.log("Rejected invalid block as expected:", msg);
}

// ---------------------------------------------------------------------------
// FINAL DUMP
// ---------------------------------------------------------------------------

console.log("\n=== FINAL STATE AFTER CONSENSUS / CHAIN SIM ===");
console.log("Height:", state.height);
console.log("Last hash:", state.lastBlockHash);

console.log("\nAccounts:");
for (const [addr, acct] of state.accounts.entries()) {
  console.log("  ", addr, acct);
}

console.log("\n=== CONSENSUS / CHAIN SIM COMPLETE ===");
