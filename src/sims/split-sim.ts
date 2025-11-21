// src/sims/split-sim.ts
// ---------------------------------------------------------------------------
// SPLIT SIM — Blocks + Upward Split at Height 10
// ---------------------------------------------------------------------------
//
//  • Start from empty ChainState
//  • Seed simple balances for A/B
//  • Mine blocks 1–12 with a few PAYMENTS
//  • At height 10, apply a 2× upward split to:
//      - all account balances
//      - all vault balances
//  • Print final state
// ---------------------------------------------------------------------------

import {
  createEmptyChainState,
  getOrCreateAccount,
} from "../ledger/state";
import {
  makeSimpleBlock,
  applyBlock,
  type AnyTx,
} from "../ledger/block";
import {
  applySplitToState,
  getSplitFactorForHeight,
  SPLIT_SCHEDULE,
} from "../splits/split-engine";

console.log("=== SPLIT SIM ===\n");

const state = createEmptyChainState();

const A = "ADDR_A";
const B = "ADDR_B";
const MINER = "MINER_X";

// Seed initial balances
getOrCreateAccount(state, A).balanceTHE = 1000n;
getOrCreateAccount(state, B).balanceTHE = 0n;

console.log("Initial state:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash,
});
console.log("Split schedule:", SPLIT_SCHEDULE, "\n");

// ---------------------------------------------------------------------------
// Mine blocks 1..12
// ---------------------------------------------------------------------------

for (let h = 1; h <= 12; h++) {
  const txs: AnyTx[] = [];

  // Some toy payments just to make the numbers move.
  if (h === 3) {
    txs.push({
      txType: "PAYMENT",
      from: A,
      to: B,
      amount: 100n,
    });
  } else if (h === 7) {
    txs.push({
      txType: "PAYMENT",
      from: B,
      to: A,
      amount: 30n,
    });
  }

  const block = makeSimpleBlock(h, state.lastBlockHash, MINER, txs);

  console.log(`\n>>> APPLY BLOCK ${h}`);
  applyBlock(state, block);
  console.log("After block:", {
    height: state.height,
    lastBlockHash: state.lastBlockHash,
  });

  const factor = getSplitFactorForHeight(h);
  if (factor) {
    console.log(`\n*** APPLY SPLIT x${factor} at height ${h} ***`);
    applySplitToState(state, factor);
  }
}

// ---------------------------------------------------------------------------
// Final dump
// ---------------------------------------------------------------------------

console.log("\n=== FINAL STATE AFTER SPLIT SIM ===");
console.log("Height:", state.height);
console.log("Last hash:", state.lastBlockHash);

console.log("\nAccounts:");
for (const [addr, acct] of state.accounts.entries()) {
  console.log("  ", addr, acct);
}

console.log("\nVaults:");
for (const [id, v] of state.vaults.entries()) {
  console.log("  ", id, v);
}

console.log("\n=== SPLIT SIM COMPLETE ===");
