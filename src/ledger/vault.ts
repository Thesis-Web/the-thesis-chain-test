// TARGET: chain src/ledger/vault.ts
// src/ledger/vault.ts
// ---------------------------------------------------------------------------
// Vault storage + basic ops (Pack 23-FIX — full vault engine rewrite)
// ---------------------------------------------------------------------------
//
// This module defines the on-ledger representation of vaults and the basic
// mutation primitives used by consensus and higher-level engines.
//
// Design goals:
//   - Simple, Total, Explicit.
//   - No hidden side-effects: all mutations go through helpers here.
//   - Safe-by-default invariants around existence and non-negative balances.
//
// NOTE:
//   - This file intentionally stays wTHE/EU-agnostic. It models generic
//     "boxes of THE". BoT / EU-layer semantics will be added in higher
//     layers and later packs.
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VaultId = string;

/**
 * Vault — a simple container of THE controlled by an on-chain owner.
 *
 * Fields:
 *   - id          : stable identifier used by txs / certificates
 *   - owner       : on-chain address that controls the vault
 *   - balanceTHE  : current balance in THE units (must be >= 0n)
 *
 * The optional fields are reserved for future BoT / policy metadata and are
 * kept optional so existing sims and callers remain valid.
 */
export interface Vault {
  readonly id: VaultId;
  readonly owner: Address;
  balanceTHE: Amount;

  // Optional metadata hooks for future packs (BoT / policy / auditing).
  readonly kind?: "STANDARD" | "TREASURY" | "INSTITUTIONAL";
  readonly notes?: string;
}

/**
 * VaultMap — in-memory collection of vaults keyed by VaultId.
 */
export type VaultMap = Map<VaultId, Vault>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertAmountPositive(context: string, amount: Amount): void {
  if (amount <= 0n) {
    throw new Error(`${context}: amount must be positive`);
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Create a new empty vault.
 *
 * Invariants:
 *   - Fails if the vault id is already taken.
 *   - New vaults always start with balanceTHE = 0n.
 */
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

/**
 * Read a vault by id or throw if it does not exist.
 *
 * This is the canonical way to get a vault from consensus / sims.
 */
export function getVault(vaults: VaultMap, id: VaultId): Vault {
  const v = vaults.get(id);
  if (!v) {
    throw new Error(`getVault: unknown vault: ${id}`);
  }
  return v;
}

/**
 * Non-throwing existence check.
 */
export function hasVault(vaults: VaultMap, id: VaultId): boolean {
  return vaults.has(id);
}

/**
 * Deposit THE into an existing vault.
 *
 * Invariants:
 *   - amountTHE > 0n
 *   - vault must exist
 */
export function depositToVault(
  vaults: VaultMap,
  id: VaultId,
  amount: Amount
): Vault {
  assertAmountPositive("depositToVault", amount);

  const v = getVault(vaults, id);
  v.balanceTHE += amount;
  return v;
}

/**
 * Withdraw THE from an existing vault.
 *
 * Invariants:
 *   - amountTHE > 0n
 *   - vault must exist
 *   - resulting balance cannot go negative
 */
export function withdrawFromVault(
  vaults: VaultMap,
  id: VaultId,
  amount: Amount
): Vault {
  assertAmountPositive("withdrawFromVault", amount);

  const v = getVault(vaults, id);

  if (v.balanceTHE < amount) {
    throw new Error(`withdrawFromVault: insufficient balance in vault: ${id}`);
  }

  v.balanceTHE -= amount;
  return v;
}
