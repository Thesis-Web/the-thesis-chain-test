// src/ledger/atomic-eu-ledger-debug.ts
// ---------------------------------------------------------------------------
// Pack 53D — EU Atomic Ledger Debug Helpers (non-invasive)
// ---------------------------------------------------------------------------
//
// Purpose:
//   • Provide *read-only* helpers to inspect a ChainState and EuRegistry and
//     derive a LedgerEuSnapshot suitable for atomic invariant checks.
//   • Bridge from the existing EU registry (src/ledger/eu.ts) into the
//     atomic EU enforcement helpers from Pack 52.
//   • Stay completely out of the hot consensus path for now. These utilities
//     are intended for sims, BoT tooling, and internal audits.
//
// This file does NOT:
//   • change consensus validation logic;
//   • mutate ChainState or EuRegistry;
//   • run automatically from applyLedgerWithRewards.
//
// Wiring this into consensus (if/when we decide that is appropriate per the
// blueprint) will be done in a later pack, once the policy is finalised.
// ---------------------------------------------------------------------------

import type { ChainState } from "./state";
import type { EuRegistry } from "./eu";
import type { AtomicCoinPolicy } from "./atomic-coin";
import {
  assertLedgerEuSnapshotAtomic,
  type LedgerEuSnapshot,
  type EuCertSnapshot
} from "./atomic-eu-ledger-enforce";

// ---------------------------------------------------------------------------
// Snapshot builder
// ---------------------------------------------------------------------------

/**
 * Build a LedgerEuSnapshot from the current ChainState + EuRegistry.
 *
 * Notes / assumptions (per 030-ledger-architecture + 070/085 docs):
 *   • EU is a *claim* on vault THE, not a separate asset in the core ledger.
 *   • For now we only care about the EU "face value" as recorded on each
 *     certificate, expressed in raw EU units (bigint).
 *
 * The exact semantics of oracleValueEUAtIssuance vs. current EU index are
 * handled at higher layers (BoT/oracle). Here we simply surface the raw
 * EU measurement attached to each ACTIVE certificate and aggregate totals.
 */
export function buildEuLedgerSnapshotFromRegistry(
  state: ChainState,
  registry: EuRegistry
): LedgerEuSnapshot {
  const certs: EuCertSnapshot[] = [];
  let totalEuSupply = 0n;

  for (const [id, cert] of registry.byId.entries()) {
    // We currently treat all statuses the same for atomicity purposes; the
    // policy can decide later whether to ignore non-ACTIVE certs.
    const valueEU = cert.oracleValueEUAtIssuance;

    // Basic sanity: ensure the backing vault exists. This mirrors the
    // invariant checks in src/ledger/eu.ts but stays read-only.
    const vault = state.vaults.get(cert.backingVaultId as any);
    if (!vault) {
      // We *do not* throw here; the atomic helpers are meant to be
      // introspective. Structural invariants (like missing vaults) are
      // handled by assertEuInvariants in eu.ts.
      continue;
    }

    const snapshotCert: EuCertSnapshot = {
      certId: id,
      value: valueEU
    };
    certs.push(snapshotCert);
    totalEuSupply += valueEU;
  }

  const snapshot: LedgerEuSnapshot = {
    totalEuSupply,
    certs
  };

  return snapshot;
}

// ---------------------------------------------------------------------------
// Debug / audit helpers
// ---------------------------------------------------------------------------

/**
 * Run atomic EU checks against the current ChainState + EuRegistry under a
 * given AtomicCoinPolicy. This is a *debug* helper only.
 *
 * It will either:
 *   • return normally (no violations), or
 *   • throw LedgerEuAtomicInvariantError (from Pack 52) if any violation
 *     is found.
 */
export function assertEuLedgerAtomicFromState(
  state: ChainState,
  registry: EuRegistry,
  policy: AtomicCoinPolicy
): void {
  const snapshot = buildEuLedgerSnapshotFromRegistry(state, registry);
  assertLedgerEuSnapshotAtomic(policy, snapshot);
}
