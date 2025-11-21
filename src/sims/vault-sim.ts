// src/sims/vault-sim.ts
// ---------------------------------------------------------------------------
// VAULT SIM
// ---------------------------------------------------------------------------
//
//  • Creates empty ChainState
//  • Applies two blocks with vault ops
//  • Prints final vault balances + accounts
// ---------------------------------------------------------------------------

import {
  createEmptyChainState,
  getOrCreateAccount
} from "../ledger/state";

import {
  makeSimpleBlock,
  applyBlock,
  type PaymentTx
} from "../ledger/block";

import type {
  VaultCreateTx,
  VaultDepositTx,
  VaultWithdrawTx
} from "../ledger/tx";

console.log("=== VAULT SIM ===\n");

const state = createEmptyChainState();

// Some pseudo addresses
const MINER = "MINER_X";
const USER_A = "USER_A";

// Seed user account just to have something on-chain.
// (Vault balances are independent from account balances for now.)
getOrCreateAccount(state, USER_A).balanceTHE = 0n;

console.log("Initial state:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// ---------------------------------------------------------------------------
// BLOCK 1 — create vault + deposit 100
// ---------------------------------------------------------------------------

const txs1: (VaultCreateTx | VaultDepositTx | PaymentTx)[] = [
  {
    txType: "VAULT_CREATE",
    vaultId: "VAULT_001",
    owner: USER_A
  },
  {
    txType: "VAULT_DEPOSIT",
    vaultId: "VAULT_001",
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

// ---------------------------------------------------------------------------
// BLOCK 2 — deposit 50, withdraw 30
// ---------------------------------------------------------------------------

const txs2: (VaultDepositTx | VaultWithdrawTx | PaymentTx)[] = [
  {
    txType: "VAULT_DEPOSIT",
    vaultId: "VAULT_001",
    amount: 50n
  },
  {
    txType: "VAULT_WITHDRAW",
    vaultId: "VAULT_001",
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

// ---------------------------------------------------------------------------
// FINAL DUMP
// ---------------------------------------------------------------------------

console.log("\nAccounts:");
for (const [addr, acct] of state.accounts.entries()) {
  console.log("  ", addr, acct);
}

console.log("\nVaults:");
for (const [id, v] of state.vaults.entries()) {
  console.log("  ", id, v);
}

console.log("\n=== VAULT SIM COMPLETE ===");
