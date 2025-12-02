// TARGET: chain src/ledger/atomic-coin.ts
// src/ledger/atomic-coin.ts
// ---------------------------------------------------------------------------
// Pack 49 — Atomic-Coin Enforcement (Phase 1: policy + math helpers)
//
// This module defines the canonical "atomic coin" policy for THE at L1,
// together with helpers for quantization, invariant checks, and a basic
// error surface that later ledger/EU/vault code can plug into.
//
// NOTE:
//   • This pack is intentionally *math-only* and non-invasive.
//   • No existing files are modified in Pack 49; wiring into EU/vault
//     ledgers will happen in a later pack (49B/50) once we stage the
//     integration carefully against the live repo state.
// ---------------------------------------------------------------------------

export type AtomicCoinErrorKind =
  | "NEGATIVE"
  | "NON_ATOMIC"
  | "OVER_MAX_SUPPLY";

export interface AtomicCoinError {
  kind: AtomicCoinErrorKind;
  message: string;
  value: bigint;
  atomicUnit: bigint;
  maxSupply?: bigint;
}

export interface AtomicCoinPolicy {
  /**
   * The smallest indivisible unit of THE on this chain.
   *
   * For a simple 1:1 atomic model this will be 1n, but the policy is
   * parametric so that future chains or testnets could choose a different
   * unit (e.g., 10n, 100n) without changing the math.
   */
  atomicUnit: bigint;

  /**
   * Optional hard cap for total supply under this policy. When present,
   * enforcement helpers can ensure that a proposed balance or aggregate
   * amount does not exceed this value.
   */
  maxSupply?: bigint;
}

/**
 * A simple, conservative default policy for this L1.
 *
 * We explicitly keep this export tiny and obvious so that other modules
 * can either import the policy or inline an equivalent constant for
 * tests without creating hidden coupling.
 */
export const DEFAULT_ATOMIC_COIN_POLICY: AtomicCoinPolicy = {
  atomicUnit: 1n,
};

/**
 * Compute the atomic multiple and remainder for a raw bigint amount.
 *
 *   raw = q * atomicUnit + r, with 0 <= r < atomicUnit
 */
export function quantizeToAtomic(
  policy: AtomicCoinPolicy,
  raw: bigint,
): { q: bigint; r: bigint } {
  const { atomicUnit } = policy;

  if (atomicUnit <= 0n) {
    throw new Error("AtomicCoinPolicy.atomicUnit must be positive");
  }

  const q = raw / atomicUnit;
  const r = raw % atomicUnit;

  return { q, r };
}

/**
 * Return true if the given amount is an exact multiple of the atomic unit.
 */
export function isExactAtomic(policy: AtomicCoinPolicy, raw: bigint): boolean {
  const { r } = quantizeToAtomic(policy, raw);
  return r === 0n;
}

/**
 * Validate that a raw amount:
 *   • is non-negative,
 *   • is an exact atomic multiple,
 *   • does not exceed the optional maxSupply.
 *
 * Returns `null` when OK, or a structured AtomicCoinError when violated.
 */
export function validateAtomicAmount(
  policy: AtomicCoinPolicy,
  raw: bigint,
): AtomicCoinError | null {
  const { atomicUnit, maxSupply } = policy;

  if (raw < 0n) {
    return {
      kind: "NEGATIVE",
      message: "Atomic amount must not be negative",
      value: raw,
      atomicUnit,
      maxSupply,
    };
  }

  if (!isExactAtomic(policy, raw)) {
    return {
      kind: "NON_ATOMIC",
      message: "Amount is not an exact multiple of the atomic unit",
      value: raw,
      atomicUnit,
      maxSupply,
    };
  }

  if (maxSupply !== undefined && raw > maxSupply) {
    return {
      kind: "OVER_MAX_SUPPLY",
      message: "Amount exceeds the configured maxSupply",
      value: raw,
      atomicUnit,
      maxSupply,
    };
  }

  return null;
}

/**
 * An assertion-style helper that throws on violation. This is useful for
 * internal invariants (e.g., ledger construction, EU/Vault total checks)
 * once we begin wiring atomic enforcement into the rest of the system.
 */
export function assertAtomicAmount(
  policy: AtomicCoinPolicy,
  raw: bigint,
): void {
  const err = validateAtomicAmount(policy, raw);
  if (err) {
    throw new Error(
      `[AtomicCoinError:${err.kind}] ${err.message} (value=${err.value}, atomicUnit=${err.atomicUnit}` +
        (err.maxSupply !== undefined ? `, maxSupply=${err.maxSupply}` : "") +
        ")",
    );
  }
}
