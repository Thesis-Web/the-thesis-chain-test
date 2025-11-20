// ---------------------------------------------------------------------------
// ChainState — Unified Ledger State
// ---------------------------------------------------------------------------
//
// This is the L1 state container. Everything persistent between blocks
// lives here.
//
// Accounts:
//   Map<Address, { balanceTHE }>
//
// Vaults:
//   Map<VaultId, VaultState>
//
// Block Metadata:
//   height, lastBlockHash
//
// This module also defines account helpers and the generic applyTx() dispatcher.
// ---------------------------------------------------------------------------

import type { Address, Amount, Hash } from "../types/primitives.js";
import type { VaultMap } from "../vault/types.js";

import { handleVaultOp } from "./tx/handleVaultOp.js";
import type { VaultOpTx } from "./tx/types.js";

// ---------------------------------------------------------------------------
// Account State Shape
// ---------------------------------------------------------------------------
export interface AccountState {
  balanceTHE: Amount;
}

// ---------------------------------------------------------------------------
// ChainState Definition
// ---------------------------------------------------------------------------
export interface ChainState {
  height: number;                      // current block height
  lastBlockHash: Hash | null;          // optional for now

  accounts: Map<Address, AccountState>;
  vaults: VaultMap;
}

// ---------------------------------------------------------------------------
// Create a Fresh, Empty ChainState
// ---------------------------------------------------------------------------
export function createEmptyChainState(): ChainState {
  return {
    height: 0,
    lastBlockHash: null,

    accounts: new Map(),
    vaults: new Map()
  };
}

// ---------------------------------------------------------------------------
// Account Helpers
// ---------------------------------------------------------------------------

// Fetch an account or create with 0 balance
export function getOrCreateAccount(
  state: ChainState,
  addr: Address
): AccountState {
  let acct = state.accounts.get(addr);
  if (!acct) {
    acct = { balanceTHE: 0n };
    state.accounts.set(addr, acct);
  }
  return acct;
}

// Credit an account
export function creditAccount(
  state: ChainState,
  addr: Address,
  amount: Amount
): void {
  if (amount <= 0n)
    throw new Error("creditAccount: amount must be positive");

  const acct = getOrCreateAccount(state, addr);
  acct.balanceTHE += amount;
}

// Debit an account
export function debitAccount(
  state: ChainState,
  addr: Address,
  amount: Amount
): void {
  if (amount <= 0n)
    throw new Error("debitAccount: amount must be positive");

  const acct = getOrCreateAccount(state, addr);
  if (acct.balanceTHE < amount)
    throw new Error("debitAccount: insufficient balance");

  acct.balanceTHE -= amount;
}

// ---------------------------------------------------------------------------
// applyTx — Dispatch Transaction Types
// ---------------------------------------------------------------------------
//
// All ledger tx types flow through this single dispatcher.
// Right now we only support VAULT_OP, but ACCOUNTS, GOVERNANCE, CONSENSUS,
// SPLITS, WTHE, EU_CERT, etc. will all plug in here.
//
// This ensures the chainstate applies txs in a deterministic, unified way.
// ---------------------------------------------------------------------------

export function applyTx(state: ChainState, tx: any): void {
  switch (tx.txType) {
    case "VAULT_OP":
      handleVaultOp(state, tx as VaultOpTx);
      return;

    default:
      throw new Error(`Unknown txType: ${tx.txType}`);
  }
}
