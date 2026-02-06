// src/ledger/atomic-eu-enforce.ts
// ---------------------------------------------------------------------------
// Pack 51 — EU Atomic Enforcement (Phase 1: helpers only)
//
// This module provides a thin EU-specific wrapper around the core
// atomic-coin policy and validation helpers. It allows EU Certificate
// code and sims to talk in "EU" terms while reusing the same underlying
// atomic math and error surface as THE.
//
// Design notes:
//   • No existing files are modified in this pack.
//   • We deliberately alias the core AtomicCoin types rather than copy
//     the implementation, so there is a single canonical definition of
//     atomic invariants.
//   • Future packs (52+) can wire these helpers into the EU ledger and
//     EU VM once we stage those integrations against the live repo state.
// ---------------------------------------------------------------------------

import {
  AtomicCoinPolicy,
  AtomicCoinError,
  AtomicCoinErrorKind,
  DEFAULT_ATOMIC_COIN_POLICY,
  validateAtomicAmount as coreValidateAtomicAmount,
  assertAtomicAmount as coreAssertAtomicAmount,
} from "./atomic-coin";

// Re-exported / aliased types so that EU-facing code does not need
// to reference the coin terminology directly.
export type AtomicEUErrorKind = AtomicCoinErrorKind;

export interface AtomicEUError extends AtomicCoinError {}

export interface AtomicEUPolicy extends AtomicCoinPolicy {}

// A conservative default EU policy. For now we keep this identical to
// the default atomic coin policy (atomicUnit = 1n, no maxSupply).
//
// If the EU blueprint later specifies a hard issuance ceiling for a
// particular chain, that can be set via a configured policy at the
// call site rather than by mutating this module.
export const DEFAULT_ATOMIC_EU_POLICY: AtomicEUPolicy = {
  ...DEFAULT_ATOMIC_COIN_POLICY,
};

/**
 * Validate that a raw EU amount respects the given atomic policy.
 *
 * This is a thin wrapper over coreValidateAtomicAmount so that EU code
 * can remain decoupled from the underlying "coin" terminology.
 *
 * Returns `null` when OK, or an AtomicEUError when violated.
 */
export function validateEUAtomicAmount(
  policy: AtomicEUPolicy,
  raw: bigint,
): AtomicEUError | null {
  return coreValidateAtomicAmount(policy, raw);
}

/**
 * Assert-style helper for EU amounts. Throws on violation using the
 * same error surface as the underlying coin helper.
 */
export function assertEUAtomicAmount(
  policy: AtomicEUPolicy,
  raw: bigint,
): void {
  coreAssertAtomicAmount(policy, raw);
}
