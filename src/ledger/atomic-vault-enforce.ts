// TARGET: chain src/ledger/atomic-vault-enforce.ts
// src/ledger/atomic-vault-enforce.ts
// ---------------------------------------------------------------------------
// Pack 50 — Atomic-Coin Phase 2 (vault-side helpers, non-invasive)
//
// This module adds *vault-focused* helpers on top of the atomic coin policy.
// It does **not** modify any existing ledger or vault code. Instead, it
// provides small, well-scoped utilities that other modules (or sims) can call
// when they want to enforce "everything that touches vault balances must
// respect the atomic policy".
//
// Design goals:
//   • No imports from the rest of the ledger (no VaultState coupling here).
//   • Pure helpers over bigints + AtomicCoinPolicy.
//   • Reusable both in sims and in future ledger integration packs.
// ---------------------------------------------------------------------------

import {
  type AtomicCoinError,
  type AtomicCoinPolicy,
  DEFAULT_ATOMIC_COIN_POLICY,
  validateAtomicAmount,
} from "./atomic-coin";

/**
 * A single vault-balance check result. When `error === null`, the balance
 * is considered valid under the given policy.
 */
export interface AtomicVaultAmountCheck {
  label: string;
  value: bigint;
  error: AtomicCoinError | null;
}

/**
 * Check a single vault balance against the atomic policy.
 */
export function checkVaultAmountAtomic(
  label: string,
  value: bigint,
  policy: AtomicCoinPolicy = DEFAULT_ATOMIC_COIN_POLICY,
): AtomicVaultAmountCheck {
  const error = validateAtomicAmount(policy, value);
  return { label, value, error };
}

/**
 * Assert that a vault balance respects the atomic policy.
 *
 * This is meant for internal invariants. Ledger / replay code that wants
 * to fail loudly when an invariant is violated can call this helper.
 */
export function assertVaultAmountAtomic(
  label: string,
  value: bigint,
  policy: AtomicCoinPolicy = DEFAULT_ATOMIC_COIN_POLICY,
): void {
  const error = validateAtomicAmount(policy, value);
  if (error) {
    throw new Error(
      `[AtomicVaultInvariant:${error.kind}] ` +
        `${label} violated atomic policy ` +
        `(value=${error.value}, atomicUnit=${error.atomicUnit}` +
        (error.maxSupply !== undefined ? `, maxSupply=${error.maxSupply}` : "") +
        ")",
    );
  }
}

/**
 * Check each vault balance individually and also check the aggregate sum.
 *
 * Returns a summary object that can be logged or inspected in sims.
 */
export interface AtomicVaultAggregateCheck {
  policy: AtomicCoinPolicy;
  perVault: AtomicVaultAmountCheck[];
  total: {
    value: bigint;
    error: AtomicCoinError | null;
  };
}

export function checkVaultSetAtomic(
  vaultValues: readonly [string, bigint][],
  policy: AtomicCoinPolicy = DEFAULT_ATOMIC_COIN_POLICY,
): AtomicVaultAggregateCheck {
  const perVault: AtomicVaultAmountCheck[] = vaultValues.map(([label, value]) =>
    checkVaultAmountAtomic(label, value, policy),
  );

  let total = 0n;
  for (const [, value] of vaultValues) {
    total += value;
  }

  const totalError = validateAtomicAmount(policy, total);

  return {
    policy,
    perVault,
    total: {
      value: total,
      error: totalError,
    },
  };
}
