// TARGET: chain src/ledger/eu-registry-delta.ts
// src/ledger/eu-registry-delta.ts
// ---------------------------------------------------------------------------
// Pack 37 — EU Registry Snapshot + Delta utilities
// ---------------------------------------------------------------------------
//
// This module provides a neutral snapshot + delta format for the EuRegistry
// layer, mirroring the pattern used by the LedgerDelta engine.
//
// It is intentionally side-effect free:
//
//   • Snapshots mirror EuRegistry.byId (id → EuCertificate).
//   • Deltas describe per-certificate before/after changes.
//   • Apply functions return fresh EuRegistry instances and rebuild the
//     byOwner index from byId.
//
// This keeps the EU layer easy to inspect from sims, tools, and future
// language ports, without depending on any particular consensus wiring.
// ---------------------------------------------------------------------------

import type { EuCertificateId, EuCertificate, EuRegistry } from "./eu";
import { createEmptyEuRegistry } from "./eu";

// ---------------------------------------------------------------------------
// Snapshot / Delta Types
// ---------------------------------------------------------------------------

export interface EuRegistrySnapshot {
  readonly certs: Map<EuCertificateId, EuCertificate>;
}

export interface EuCertDelta {
  readonly before: EuCertificate | null;
  readonly after: EuCertificate | null;
}

export interface EuRegistryDelta {
  readonly certs: Map<EuCertificateId, EuCertDelta>;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Create a snapshot that mirrors registry.byId.
 *
 * NOTE: This is a shallow snapshot. EuCertificate is treated as immutable
 * value data at this layer.
 */
export function makeEuRegistrySnapshot(registry: EuRegistry): EuRegistrySnapshot {
  return {
    certs: new Map(registry.byId)
  };
}

/**
 * Compute a EuRegistryDelta by diffing two snapshots.
 */
export function computeEuRegistryDelta(
  before: EuRegistrySnapshot,
  after: EuRegistrySnapshot
): EuRegistryDelta {
  const allIds = new Set<EuCertificateId>();

  for (const id of before.certs.keys()) allIds.add(id);
  for (const id of after.certs.keys()) allIds.add(id);

  const certs = new Map<EuCertificateId, EuCertDelta>();

  for (const id of allIds) {
    const b = before.certs.get(id) ?? null;
    const a = after.certs.get(id) ?? null;

    // If nothing existed before or after, skip (should not happen).
    if (b === null && a === null) continue;

    certs.set(id, { before: b, after: a });
  }

  return { certs };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Apply a EuRegistryDelta to a base registry to produce a new EuRegistry.
 *
 * This only updates the EuRegistry maps. It does NOT touch any ChainState
 * vault balances or perform cross-ledger invariants; those remain the
 * responsibility of higher layers and invariant checks in eu.ts.
 */
export function applyEuRegistryDelta(
  base: EuRegistry,
  delta: EuRegistryDelta
): EuRegistry {
  // Start from a shallow copy of byId.
  const byId = new Map(base.byId);

  for (const [id, change] of delta.certs.entries()) {
    if (change.after === null) {
      byId.delete(id);
    } else {
      byId.set(id, change.after);
    }
  }

  // Rebuild byOwner index from byId.
  const byOwner = new Map<EuCertificate["owner"], EuCertificateId[]>();

  for (const [id, cert] of byId.entries()) {
    const list = byOwner.get(cert.owner) ?? [];
    list.push(id);
    byOwner.set(cert.owner, list);
  }

  const reg = createEmptyEuRegistry();
  // Overwrite with our new maps.
  (reg.byId as Map<EuCertificateId, EuCertificate>) = byId;
  (reg.byOwner as Map<EuCertificate["owner"], EuCertificateId[]>) = byOwner;

  return reg;
}
