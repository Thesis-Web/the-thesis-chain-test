import type { Address, Amount, Hash } from "../types/primitives";

// ---------------------------------------------------------------------------
// Account & Chain State
// ---------------------------------------------------------------------------

export interface AccountState {
  balanceTHE: Amount;
}

export interface ChainState {
  height: number;
  lastBlockHash: Hash | null;
  accounts: Map<Address, AccountState>;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function createEmptyChainState(): ChainState {
  return {
    height: 0,
    lastBlockHash: null,
    accounts: new Map()
  };
}

// ---------------------------------------------------------------------------
// Account helpers
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

export function creditAccount(
  state: ChainState,
  addr: Address,
  amount: Amount
): void {
  if (amount <= 0n) {
    throw new Error("creditAccount: amount must be positive");
  }
  const acct = getOrCreateAccount(state, addr);
  acct.balanceTHE += amount;
}

export function debitAccount(
  state: ChainState,
  addr: Address,
  amount: Amount
): void {
  if (amount <= 0n) {
    throw new Error("debitAccount: amount must be positive");
  }
  const acct = getOrCreateAccount(state, addr);
  if (acct.balanceTHE < amount) {
    throw new Error("debitAccount: insufficient balance");
  }
  acct.balanceTHE -= amount;
}
