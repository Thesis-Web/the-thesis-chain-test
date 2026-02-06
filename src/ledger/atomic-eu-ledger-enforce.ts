// src/ledger/atomic-eu-ledger-enforce.ts
// ---------------------------------------------------------------------------
// Pack 52 — EU Atomic Phase 2 (Ledger enforcement layer)
//
// This module defines ledger-level helpers for enforcing that EU supplies
// and per-certificate values respect the configured atomic coin policy.
// It stays non-invasive: no existing ledger or apply-block files are
// modified in this pack. Later packs can wire these helpers into the
// live EU ledger / LedgerDelta pipeline.
//
// Dependencies:
//   • atomic-coin.ts       — core AtomicCoinPolicy + validateAtomicAmount
//   • atomic-eu-enforce.ts — EU-flavoured assertion helpers (Pack 51)
// ---------------------------------------------------------------------------

import {
  AtomicCoinPolicy,
  AtomicCoinError,
  validateAtomicAmount,
} from "./atomic-coin";
import { assertEUAtomicAmount } from "./atomic-eu-enforce";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal view of an EU certificate as seen by the ledger-level atomic
 * enforcement layer. We deliberately keep this decoupled from the concrete
 * on-chain EU cert representation so that we can reuse these helpers in
 * sims and future refactors.
 */
export interface EuCertSnapshot {
  certId: string;
  value: bigint;
}

/**
 * Minimal snapshot of the EU "surface" of the ledger.
 *
 * Implementations are expected to treat totalEuSupply as the canonical
 * scalar for economic invariants, while certs[] exposes the per-certificate
 * breakdown used for structural checks.
 */
export interface LedgerEuSnapshot {
  /** Canonical total EU supply as seen by the ledger. */
  totalEuSupply: bigint;

  /** Per-certificate view of EU balances. */
  certs: EuCertSnapshot[];
}

/**
 * Enriched error type used when checking a LedgerEuSnapshot against an
 * AtomicCoinPolicy. The underlying AtomicCoinError describes the numeric
 * violation; scope/certId localise it to a particular part of the snapshot.
 */
export interface LedgerEuAtomicInvariantError extends AtomicCoinError {
  scope: "CERT" | "TOTAL";
  certId?: string;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Validate a full LedgerEuSnapshot against the given atomic policy.
 *
 * This enforces that:
 *   • every certificate value is a valid atomic amount, and
 *   • the totalEuSupply itself is a valid atomic amount.
 *
 * If the policy has a maxSupply, that bound is enforced for both each
 * certificate and the total supply. Callers can choose whether to treat
 * per-cert or total violations as fatal.
 *
 * NOTE: This helper does *not* currently enforce that the sum of cert
 * values equals totalEuSupply; that check belongs to a more general
 * ledger accounting invariant that we can wire separately.
 */
export function validateLedgerEuSnapshotAtomic(
  policy: AtomicCoinPolicy,
  snapshot: LedgerEuSnapshot,
): LedgerEuAtomicInvariantError[] {
  const errors: LedgerEuAtomicInvariantError[] = [];

  // Per-certificate checks
  for (const cert of snapshot.certs) {
    const err = validateAtomicAmount(policy, cert.value);
    if (err) {
      errors.push({
        ...err,
        scope: "CERT",
        certId: cert.certId,
      });
    }
  }

  // Total-supply check
  const totalErr = validateAtomicAmount(policy, snapshot.totalEuSupply);
  if (totalErr) {
    errors.push({
      ...totalErr,
      scope: "TOTAL",
    });
  }

  return errors;
}

/**
 * Return true if the given snapshot is fully compliant with the atomic
 * policy (no per-cert or total-supply violations).
 */
export function isLedgerEuSnapshotAtomic(
  policy: AtomicCoinPolicy,
  snapshot: LedgerEuSnapshot,
): boolean {
  return validateLedgerEuSnapshotAtomic(policy, snapshot).length === 0;
}

/**
 * Assertion-style helper that throws when any invariant is violated.
 *
 * This is intended for wiring into ledger construction / replay code in a
 * later pack, as well as for use in sims. For now it is a thin wrapper
 * around validateLedgerEuSnapshotAtomic that produces a readable error
 * surface for debugging.
 */
export function assertLedgerEuSnapshotAtomic(
  policy: AtomicCoinPolicy,
  snapshot: LedgerEuSnapshot,
): void {
  const errors = validateLedgerEuSnapshotAtomic(policy, snapshot);
  if (errors.length === 0) return;

  const lines: string[] = [
    "[LedgerEuAtomicInvariantError] One or more EU atomic invariants were violated:",
  ];

  for (const err of errors) {
    const scopeLabel =
      err.scope === "CERT" && err.certId
        ? `CERT(${err.certId})`
        : err.scope;
    lines.push(
      `  - scope=${scopeLabel}, kind=${err.kind}, message=${err.message}, ` +
        `value=${err.value}, atomicUnit=${err.atomicUnit}` +
        (err.maxSupply !== undefined ? `, maxSupply=${err.maxSupply}` : ""),
    );
  }

  throw new Error(lines.join("\n"));
}

/**
 * Convenience helper for scenarios where the caller already knows that
 * totalEuSupply is being tracked and asserted elsewhere, and only wants
 * to ensure that per-certificate values are atomic.
 */
export function assertAllEuCertsAtomic(
  policy: AtomicCoinPolicy,
  certs: EuCertSnapshot[],
): void {
  for (const cert of certs) {
    // Re-use the EU-flavoured assertion helper to keep behaviour aligned
    // with Pack 51.
    try {
      assertEUAtomicAmount(policy, cert.value);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      throw new Error(
        `[LedgerEuAtomicInvariantError:CERT] certId=${cert.certId} ` +
          `violated EU atomic policy: ${err.message}`,
      );
    }
  }
}
