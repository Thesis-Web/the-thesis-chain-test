// TARGET: chain src/sims/eu-registry-delta-sim.ts
// src/sims/eu-registry-delta-sim.ts
// ---------------------------------------------------------------------------
// Pack 37 — Synthetic EU registry snapshot + delta sim
// ---------------------------------------------------------------------------
//
// This sim exercises the EuRegistry snapshot + delta utilities in isolation.
// It does not depend on the full consensus pipeline.
// ---------------------------------------------------------------------------

import type { EuCertificate } from "../ledger/eu";
import { createEmptyEuRegistry, registerEuCertificate, markEuRedeemed } from "../ledger/eu";
import { makeEuRegistrySnapshot, computeEuRegistryDelta, applyEuRegistryDelta } from "../ledger/eu-registry-delta";

console.log("=== EU REGISTRY DELTA SIM ===");

// Minimal mock ChainState with a single vault to satisfy registerEuCertificate's
// backing-vault invariant.
const mockChainState: any = {
  vaults: new Map<string, { owner: string; balanceTHE: bigint }>([
    ["v1", { owner: "addr1", balanceTHE: 100n }]
  ])
};

const registry = createEmptyEuRegistry();

// Create a single ACTIVE certificate.
const certA: EuCertificate = {
  id: "EU-1",
  owner: "addr1",
  activatedByInstitutionId: "inst-1",
  physicalBearer: true,
  issuedAtHeight: 1,
  chainHashProof: "hash-1",
  oracleValueEUAtIssuance: 1000n,
  backingVaultId: "v1",
  status: "ACTIVE"
};

registerEuCertificate(mockChainState, registry, certA);

// Snapshot before any lifecycle changes.
const snapBefore = makeEuRegistrySnapshot(registry);

// Redeem the certificate (in-place mutation of registry).
markEuRedeemed(registry, "EU-1");

// Snapshot after redemption.
const snapAfter = makeEuRegistrySnapshot(registry);

// Compute delta.
const delta = computeEuRegistryDelta(snapBefore, snapAfter);

console.log("Delta cert count:", delta.certs.size);
for (const [id, ch] of delta.certs.entries()) {
  console.log(
    `  id=${id} before=${JSON.stringify(ch.before)} after=${JSON.stringify(ch.after)}`
  );
}

// Apply the delta to a fresh empty registry just to prove round-trip works.
const applied = applyEuRegistryDelta(createEmptyEuRegistry(), delta);
console.log("Applied registry byId size:", applied.byId.size);
console.log("Applied registry byOwner size:", applied.byOwner.size);

console.log("=== EU REGISTRY DELTA SIM COMPLETE ===");
