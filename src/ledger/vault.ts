// src/ledger/vault.ts
// ---------------------------------------------------------------------------
// Vault storage + basic ops
// ---------------------------------------------------------------------------
//
// This is a minimal vault engine:
//
//   Vault:
//     - id: string
//     - owner: Address
//     - balanceTHE: Amount
//
//   VaultMap: Map<VaultId, Vault>
//
// No EU/wTHE semantics yet — this is just “boxes of THE” wired
// into ChainState. Higher-level behavior will layer on top.
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";

export type VaultId = string;

export interface Vault {
  readonly id: VaultId;
  readonly owner: Address;
  balanceTHE: Amount;
}

export type VaultMap = Map<VaultId, Vault>;

// Create a new empty vault. Fails if the id is already taken.
export function createVault(
  vaults: VaultMap,
  id: VaultId,
  owner: Address
): Vault {
  if (vaults.has(id)) {
    throw new Error(`createVault: vault already exists: ${id}`);
  }

  const v: Vault = {
    id,
    owner,
    balanceTHE: 0n
  };

  vaults.set(id, v);
  return v;
}

// Deposit THE into an existing vault.
export function depositToVault(
  vaults: VaultMap,
  id: VaultId,
  amount: Amount
): Vault {
  if (amount <= 0n) {
    throw new Error("depositToVault: amount must be positive");
  }

  const v = vaults.get(id);
  if (!v) {
    throw new Error(`depositToVault: unknown vault: ${id}`);
  }

  v.balanceTHE += amount;
  return v;
}

// Withdraw THE from an existing vault.
export function withdrawFromVault(
  vaults: VaultMap,
  id: VaultId,
  amount: Amount
): Vault {
  if (amount <= 0n) {
    throw new Error("withdrawFromVault: amount must be positive");
  }

  const v = vaults.get(id);
  if (!v) {
    throw new Error(`withdrawFromVault: unknown vault: ${id}`);
  }

  if (v.balanceTHE < amount) {
    throw new Error(`withdrawFromVault: insufficient balance in vault: ${id}`);
  }

  v.balanceTHE -= amount;
  return v;
}
