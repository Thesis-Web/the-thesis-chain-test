// src/sims/simple-sim
// ---------------------------------------------------------------------------
// SIMPLE BLOCK SIM
// ---------------------------------------------------------------------------
//
//  • Creates empty ChainState
//  • Applies two blocks with payments + miner rewards
//  • Prints final state
// ---------------------------------------------------------------------------

import { createEmptyChainState, getOrCreateAccount } from "../ledger/state";
import { makeSimpleBlock, applyBlock } from "../ledger/block";
import type { PaymentTx } from "../ledger/block";

console.log("=== SIMPLE BLOCK SIM ===\n");

const state = createEmptyChainState();

// Seed some balances for demo
const A = "ADDR_A";
const B = "ADDR_B";
const MINER = "MINER_X";

getOrCreateAccount(state, A).balanceTHE = 1000n;
getOrCreateAccount(state, B).balanceTHE = 0n;

console.log("Initial state:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// BLOCK 1: A pays B 100
const txs1: PaymentTx[] = [
  {
    txType: "PAYMENT",
    from: A,
    to: B,
    amount: 100n
  }
];

const block1 = makeSimpleBlock(1, state.lastBlockHash, MINER, txs1);

console.log("\n>>> APPLY BLOCK 1");
applyBlock(state, block1);
console.log("After Block 1:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// BLOCK 2: B pays A 30
const txs2: PaymentTx[] = [
  {
    txType: "PAYMENT",
    from: B,
    to: A,
    amount: 30n
  }
];

const block2 = makeSimpleBlock(2, state.lastBlockHash, MINER, txs2);

console.log("\n>>> APPLY BLOCK 2");
applyBlock(state, block2);
console.log("After Block 2:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// Dump final accounts
console.log("\nAccounts:");
for (const [addr, acct] of state.accounts.entries()) {
  console.log("  ", addr, acct);
}

console.log("\n=== SIMPLE BLOCK SIM COMPLETE ===");
