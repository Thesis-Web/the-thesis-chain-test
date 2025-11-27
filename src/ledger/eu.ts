// TARGET: chain src/ledger/eu.ts
// src/ledger/eu.ts
// ---------------------------------------------------------------------------
// Ledger v1 — EU Certificate registry wired to vaults (Option B)
// ---------------------------------------------------------------------------
//
// This module layers EU Certificates on top of the existing ChainState
// (accounts + vaults) without changing the core ledger types.
//
// Per docs/sections/030-ledger.md, 085-split-engine.md, 090-oracle.md:
//   • Each EU Certificate is a 1:1 claim on a specific vault's THE contents.
//   • Vaults remain the source of truth for balances (balanceTHE).
//   • EU is a *claim* mapped onto those vaults, not a new asset type inside
//     the L1 ledger (yet).
//
// This file does NOT mutate ChainState's shape. Instead, it introduces a
// standalone EuRegistry that can be composed with ChainState by higher layers
// (BoT, wallet, POS, sims, etc.).
// ---------------------------------------------------------------------------

import type { Address } from "../types/primitives";
import type { VaultId, VaultMap } from "./vault";
import type { ChainState } from "./state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EuCertificateId = string;

export type EuStatus = "ACTIVE" | "REDEEMED";

export interface EuCertificate {
  readonly id: EuCertificateId;
  readonly owner: Address;
  readonly backingVaultId: VaultId;
  readonly issuedAtHeight: number;
  readonly status: EuStatus;
}

/**
 * EuRegistry keeps a bidirectional index:
 *   • byId:     EU id → certificate
 *   • byOwner:  owner → list of EU ids
 *
 * This allows:
 *   • quick lookup by certificate id (validation, redemption)
 *   • quick lookup by owner (wallet views, BoT dashboards)
 */
export interface EuRegistry {
  readonly byId: Map<EuCertificateId, EuCertificate>;
  readonly byOwner: Map<Address, EuCertificateId[]>;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function createEmptyEuRegistry(): EuRegistry {
  return {
    byId: new Map(),
    byOwner: new Map()
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a vault exists in the given ChainState.
 * Throws if the vault is missing.
 */
function assertBackingVaultExists(state: ChainState, vaultId: VaultId): void {
  const vault = state.vaults.get(vaultId);
  if (!vault) {
    throw new Error(`EU: backing vault does not exist: ${vaultId}`);
  }
}

/**
 * Register a new EU certificate bound to a specific backing vault.
 *
 * This does NOT create or modify the vault itself. That is handled by the
 * vault helpers in src/ledger/vault.ts. This simply records the mapping
 * between an EU id and an existing vault.
 */
export function registerEuCertificate(
  state: ChainState,
  registry: EuRegistry,
  cert: EuCertificate
): void {
  // Invariants:
  //   • backing vault must exist
  //   • id must be unique
  //   • once a vault is bound to a given EU, we discourage re-use while ACTIVE
  assertBackingVaultExists(state, cert.backingVaultId);

  if (registry.byId.has(cert.id)) {
    throw new Error(`EU: certificate already exists: ${cert.id}`);
  }

  registry.byId.set(cert.id, cert);

  const list = registry.byOwner.get(cert.owner) ?? [];
  list.push(cert.id);
  registry.byOwner.set(cert.owner, list);
}

/**
 * Mark an EU certificate as redeemed.
 *
 * This does NOT move any THE out of the vault; that must be done via
 * higher-level logic (e.g. BoT redemption flows). This only flips the
 * certificate status in the registry.
 */
export function markEuRedeemed(registry: EuRegistry, id: EuCertificateId): void {
  const existing = registry.byId.get(id);
  if (!existing) {
    throw new Error(`EU: cannot redeem unknown certificate: ${id}`);
  }

  if (existing.status === "REDEEMED") {
    // Idempotent: redeeming a redeemed certificate is a no-op.
    return;
  }

  const updated: EuCertificate = {
    ...existing,
    status: "REDEEMED"
  };

  registry.byId.set(id, updated);
}

/**
 * Get all EU certificates owned by a given address.
 */
export function getEuCertificatesForOwner(
  registry: EuRegistry,
  owner: Address
): EuCertificate[] {
  const ids = registry.byOwner.get(owner) ?? [];
  const result: EuCertificate[] = [];
  for (const id of ids) {
    const cert = registry.byId.get(id);
    if (cert) {
      result.push(cert);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

/**
 * Assert a set of invariants across the ChainState and EuRegistry:
 *
 *   • Every EU.backingVaultId must exist in state.vaults.
 *   • No ACTIVE EU certificates share the same backing vault.
 *
 * This is a runtime check intended for sims and internal sanity, not something
 * that should run in a hot path of block validation.
 */
export function assertEuInvariants(
  state: ChainState,
  registry: EuRegistry
): void {
  const activeVaults = new Set<VaultId>();

  for (const cert of registry.byId.values()) {
    // 1) backing vault must exist
    assertBackingVaultExists(state, cert.backingVaultId);

    // 2) active EU certificates must not share a backing vault
    if (cert.status === "ACTIVE") {
      if (activeVaults.has(cert.backingVaultId)) {
        throw new Error(
          `EU invariant violation: multiple ACTIVE certs bound to vault ${cert.backingVaultId}`
        );
      }
      activeVaults.add(cert.backingVaultId);
    }
  }
}
