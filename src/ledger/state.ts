// ---------------------------------------------------------------------------
// ChainState — Unified Ledger State
// ---------------------------------------------------------------------------
//
// This is the L1 state container. Everything that persists between blocks
// lives here.
//
// Accounts:
//   map<Address, balanceTHE>
//
// Vaults:
//   map<VaultId, VaultState>
//
// Block metadata:
//   height, lastBlockHash
//
// NOTE:
// Helpers (createEmptyChainState, cloneChainState, etc.) give us clean
// initialization and deterministic snapshots for testing.
// ---------------------------------------------------------------------------

import type { Address, Amount, Hash } from "../types/primitives.js";
import type { VaultMap } from "../vault/types.js";

export interface AccountState {
  balanceTHE: Amount;
}

export interface ChainState {
  height: number;                           // current block height
  lastBlockHash: Hash | null;               // optional for now

  accounts: Map<Address, AccountState>;
  vaults: VaultMap;
}

// ---------------------------------------------------------------------------
// Create an empty state
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
// Get account or create with zero balance
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helper for crediting and debiting accounts
// ---------------------------------------------------------------------------
export function creditAccount(
  state: ChainState,
  addr: Address,
  amount: Amount
): void {
  if (amount <= 0n)
    throw new Error("creditAccount amount must be positive");
  const acct = getOrCreateAccount(state, addr);
  acct.balanceTHE += amount;
}

export function debitAccount(
  state: ChainState,
  addr: Address,
  amount: Amount
): void {
  if (amount <= 0n)
    throw new Error("debitAccount amount must be positive");
  const acct = getOrCreateAccount(state, addr);
  if (acct.balanceTHE < amount)
    throw new Error("debitAccount: insufficient balance");
  acct.balanceTHE -= amount;
}
