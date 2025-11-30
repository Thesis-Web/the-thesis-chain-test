// TARGET: chain src/ledger/eu.ts
// src/ledger/eu.ts
// ---------------------------------------------------------------------------
// Ledger v1 — EU Certificate registry wired to vaults (Option B)
// ---------------------------------------------------------------------------
//
// This module layers EU Certificates on top of the existing ChainState
// (accounts + vaults) without changing the core ledger types.
//
// Per docs/sections/030-ledger-architecture.md, 085-split-engine-spec.md, 070-oracles-and-energy-measurement.md:
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
import type { VaultId } from "./vault";
import type { ChainState } from "./state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EuCertificateId = string;

export type EuStatus =
  | "ACTIVE"
  | "REDEEMED"
  | "LOST"
  | "STOLEN"
  | "FRAUD"
  | "REISSUED";

/**
 * EuCertificate — legal-tender EU note metadata.
 *
 * NOTE:
 *   - `owner` here is the activation owner (the on-chain address that
 *     initiated the mint), not the real-world physical bearer.
 *   - `physicalBearer = true` indicates that control in the real world is
 *     determined by who holds the note, not who controls this address.
 */
export interface EuCertificate {
  readonly id: EuCertificateId;

  // Legal-tender / activation metadata
  readonly owner: Address;
  readonly activatedByInstitutionId: string;
  readonly physicalBearer: boolean;

  // Chain anchoring
  readonly issuedAtHeight: number;
  readonly chainHashProof: string;

  // EU measurement metadata
  readonly oracleValueEUAtIssuance: bigint;

  // Vault linkage
  readonly backingVaultId: VaultId;

  // Lifecycle + recovery metadata
  readonly status: EuStatus;
  readonly damagedFlag?: boolean;
  readonly reissueParentId?: EuCertificateId;
  readonly institutionSignature?: string;
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
// Internal helpers
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

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Get a single EU certificate by id (if present).
 */
export function getEuCertificate(
  registry: EuRegistry,
  id: EuCertificateId
): EuCertificate | undefined {
  return registry.byId.get(id);
}

/**
 * Convenience: check whether a certificate is ACTIVE.
 */
export function isEuActive(
  registry: EuRegistry,
  id: EuCertificateId
): boolean {
  const cert = registry.byId.get(id);
  return cert?.status === "ACTIVE";
}

/**
 * Convenience: check whether a certificate is REDEEMED.
 */
export function isEuRedeemed(
  registry: EuRegistry,
  id: EuCertificateId
): boolean {
  const cert = registry.byId.get(id);
  return cert?.status === "REDEEMED";
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
 *   • For ACTIVE certs, the vault owner must match cert.owner.
 *   • For ACTIVE certs, the backing vault must have non-zero THE balance.
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
    const vault = state.vaults.get(cert.backingVaultId);
    if (!vault) {
      throw new Error(`EU invariant violation: missing backing vault ${cert.backingVaultId}`);
    }

    if (cert.status === "ACTIVE") {
      // 1) active EU certificates must not share a backing vault
      if (activeVaults.has(cert.backingVaultId)) {
        throw new Error(
          `EU invariant violation: multiple ACTIVE certs bound to vault ${cert.backingVaultId}`
        );
      }
      activeVaults.add(cert.backingVaultId);

      // 2) vault owner must match EU owner
      if (vault.owner !== cert.owner) {
        throw new Error(
          `EU invariant violation: vault owner ${vault.owner} does not match EU owner ${cert.owner} for cert ${cert.id}`
        );
      }

      // 3) backing vault must have non-zero THE balance
      if (vault.balanceTHE === 0n) {
        throw new Error(
          `EU invariant violation: ACTIVE EU ${cert.id} bound to empty vault ${cert.backingVaultId}`
        );
      }
    }
  }
}
