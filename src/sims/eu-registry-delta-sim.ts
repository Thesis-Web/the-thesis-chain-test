// src/sims/eu-registry-delta-sim.ts
// ---------------------------------------------------------------------------
// Pack 37.1 — EU registry snapshot + delta sim (BigInt-safe logging)
// ---------------------------------------------------------------------------
//
// This sim exercises the EuRegistry snapshot + delta utilities in isolation.
// It avoids JSON.stringify because EuCertificate contains bigint fields.
// ---------------------------------------------------------------------------

import type { EuCertificate } from "../ledger/eu";
import {
  createEmptyEuRegistry,
  registerEuCertificate,
  markEuRedeemed,
} from "../ledger/eu";
import {
  makeEuRegistrySnapshot,
  computeEuRegistryDelta,
  applyEuRegistryDelta,
} from "../ledger/eu-registry-delta";

console.log("=== EU REGISTRY DELTA SIM ===");

// Minimal mock ChainState with a single vault to satisfy registerEuCertificate's
// backing-vault invariant.
const mockChainState: any = {
  vaults: new Map<string, { owner: string; balanceTHE: bigint }>([
    ["v1", { owner: "addr1", balanceTHE: 100n }],
  ]),
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
  status: "ACTIVE",
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

// BigInt-safe pretty-printer for EuCertificate.
function fmtCert(c: EuCertificate | null): string {
  if (!c) return "null";
  return [
    "{",
    `id=${c.id}`,
    `owner=${c.owner}`,
    `status=${c.status}`,
    `backingVaultId=${c.backingVaultId}`,
    `issuedAtHeight=${c.issuedAtHeight}`,
    `oracleValueEUAtIssuance=${c.oracleValueEUAtIssuance.toString()}n`,
    `activatedByInstitutionId=${c.activatedByInstitutionId}`,
    `physicalBearer=${c.physicalBearer}`,
    `chainHashProof=${c.chainHashProof}`,
    "}",
  ].join(" ");
}

for (const [id, ch] of delta.certs.entries()) {
  console.log(`  id=${id}`);
  console.log(`    before=${fmtCert(ch.before)}`);
  console.log(`    after=${fmtCert(ch.after)}`);
}

// Apply the delta to a fresh empty registry just to prove round-trip works.
const applied = applyEuRegistryDelta(createEmptyEuRegistry(), delta);
console.log("Applied registry byId size:", applied.byId.size);
console.log("Applied registry byOwner size:", applied.byOwner.size);

console.log("=== EU REGISTRY DELTA SIM COMPLETE ===");
