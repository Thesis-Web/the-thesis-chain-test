// TARGET: chain src/ledger/vault-delta.ts
// src/ledger/vault-delta.ts
// ---------------------------------------------------------------------------
// Pack 38.1 — VaultDelta Full Semantics (structural-only apply)
// ---------------------------------------------------------------------------
//
// This module defines a neutral snapshot + delta format for the vault layer.
// It is intentionally kept separate from the generic LedgerDelta so that we
// can capture full vault semantics, including:
//   - id
//   - controlling owner (ledger address / institution account)
//   - balanceTHE
//   - optional kind/notes metadata
//
// IMPORTANT:
//   • This layer is *structural only*. It does NOT re-enforce vault invariants
//     like "a vault must be empty before deletion". Those invariants belong in
//     the transaction / vault engine (vault.ts) and ledger pipeline that
//     produced the snapshots in the first place.
//   • applyVaultDelta is therefore a pure, best-effort mechanism to reconstruct
//     a VaultMap from a base map + delta, assuming the delta came from valid
//     snapshots.
//
// The pattern mirrors other delta modules:
//   • Take snapshots (VaultsSnapshot) from a VaultMap.
//   • Diff snapshots into a VaultDelta (id → {before, after}).
//   • Optionally apply deltas to a VaultMap in a pure, replayable way.
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";
import type { VaultId, Vault, VaultMap } from "./vault";

// ---------------------------------------------------------------------------
// Snapshot / Delta types
// ---------------------------------------------------------------------------

export interface VaultSnapshot {
  readonly id: VaultId;
  readonly owner: Address;
  readonly balanceTHE: Amount;
  readonly kind?: "STANDARD" | "TREASURY" | "INSTITUTIONAL";
  readonly notes?: string;
}

export interface VaultsSnapshot {
  readonly vaults: Map<VaultId, VaultSnapshot>;
}

export interface VaultDeltaEntry {
  readonly before: VaultSnapshot | null;
  readonly after: VaultSnapshot | null;
}

export interface VaultDelta {
  readonly vaults: Map<VaultId, VaultDeltaEntry>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneVaultSnapshot(v: VaultSnapshot): VaultSnapshot {
  return {
    id: v.id,
    owner: v.owner,
    balanceTHE: v.balanceTHE,
    kind: v.kind,
    notes: v.notes,
  };
}

function toSnapshot(v: Vault): VaultSnapshot {
  return {
    id: v.id,
    owner: v.owner,
    balanceTHE: v.balanceTHE,
    kind: v.kind,
    notes: v.notes,
  };
}

// ---------------------------------------------------------------------------
// Public API — snapshot + diff
// ---------------------------------------------------------------------------

/**
 * Build a VaultsSnapshot from a VaultMap.
 */
export function makeVaultsSnapshot(vaults: VaultMap): VaultsSnapshot {
  const snap = new Map<VaultId, VaultSnapshot>();
  for (const [id, v] of vaults.entries()) {
    snap.set(id, toSnapshot(v));
  }
  return { vaults: snap };
}

/**
 * Compute a VaultDelta by diffing two VaultsSnapshots.
 *
 * Semantics:
 *   • before=null, after!=null  => vault created
 *   • before!=null, after=null  => vault deleted
 *   • both non-null, values differ => vault mutated
 */
export function computeVaultDelta(
  before: VaultsSnapshot,
  after: VaultsSnapshot
): VaultDelta {
  const allIds = new Set<VaultId>();

  for (const id of before.vaults.keys()) allIds.add(id);
  for (const id of after.vaults.keys()) allIds.add(id);

  const vaults = new Map<VaultId, VaultDeltaEntry>();

  for (const id of allIds) {
    const b = before.vaults.get(id) ?? null;
    const a = after.vaults.get(id) ?? null;

    if (b === null && a === null) continue;

    const entry: VaultDeltaEntry = {
      before: b ? cloneVaultSnapshot(b) : null,
      after: a ? cloneVaultSnapshot(a) : null,
    };

    vaults.set(id, entry);
  }

  return { vaults };
}

// ---------------------------------------------------------------------------
// Public API — apply
// ---------------------------------------------------------------------------

/**
 * Apply a VaultDelta to a base VaultMap to produce a new VaultMap.
 *
 * This function is *structural only*:
 *   • Deletion of non-empty vaults is allowed here, because the snapshots
 *     already embed whatever sequence of withdraw/delete operations occurred
 *     in the underlying ledger engine.
 *   • Negative balances are still guarded against, because they are never
 *     valid in the vault engine and would indicate a misuse of the delta.
 *
 * NOTE:
 *   This function does not re-check that `base` matches the `before` side
 *   of the delta; it assumes the caller is consistent (e.g. using deltas
 *   produced by computeVaultDelta). The `before` snapshots are retained
 *   purely for logging and analysis.
 */
export function applyVaultDelta(base: VaultMap, delta: VaultDelta): VaultMap {
  const next = new Map<VaultId, Vault>();

  // Start from base (cloned).
  for (const [id, v] of base.entries()) {
    next.set(id, { ...v });
  }

  for (const [id, change] of delta.vaults.entries()) {
    const { after } = change;

    if (after === null) {
      // Deletion (structural).
      next.delete(id);
      continue;
    }

    if (after.balanceTHE < 0n) {
      throw new Error(
        `applyVaultDelta: negative balanceTHE for vault ${id}: ${after.balanceTHE}`
      );
    }

    const v: Vault = {
      id: after.id,
      owner: after.owner,
      balanceTHE: after.balanceTHE,
      kind: after.kind,
      notes: after.notes,
    };

    next.set(id, v);
  }

  return next;
}

// ---------------------------------------------------------------------------
// Convenience classification helpers (optional)
// ---------------------------------------------------------------------------

export function isVaultCreated(entry: VaultDeltaEntry): boolean {
  return entry.before === null && entry.after !== null;
}

export function isVaultDeleted(entry: VaultDeltaEntry): boolean {
  return entry.before !== null && entry.after === null;
}

export function isVaultMutated(entry: VaultDeltaEntry): boolean {
  return entry.before !== null && entry.after !== null;
}
