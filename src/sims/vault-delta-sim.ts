// src/sims/vault-delta-sim.ts
// ---------------------------------------------------------------------------
// Pack 38 — VaultDelta Full Semantics sim
// ---------------------------------------------------------------------------
//
// This sim exercises the vault snapshot + delta utilities in isolation.
// It uses the real vault engine (createVault, depositToVault, withdrawFromVault)
// to ensure invariants are preserved, then uses the delta layer to diff and
// re-apply state.
// ---------------------------------------------------------------------------

import type { VaultMap, Vault } from "../ledger/vault";
import {
  createVault,
  depositToVault,
  withdrawFromVault,
} from "../ledger/vault";
import {
  makeVaultsSnapshot,
  computeVaultDelta,
  applyVaultDelta,
  isVaultCreated,
  isVaultDeleted,
  isVaultMutated,
} from "../ledger/vault-delta";

console.log("=== VAULT DELTA SIM ===");

function fmtVault(v: Vault | null): string {
  if (!v) return "null";
  return [
    "{",
    `id=${v.id}`,
    `owner=${v.owner}`,
    `balanceTHE=${v.balanceTHE.toString()}n`,
    v.kind ? `kind=${v.kind}` : "",
    v.notes ? `notes=${v.notes}` : "",
    "}",
  ]
    .filter(Boolean)
    .join(" ");
}

// Phase 1: base state with a single funded vault.
const vaults: VaultMap = new Map();

createVault(vaults, "v1", "addr1");
depositToVault(vaults, "v1", 100n);

const snap1 = makeVaultsSnapshot(vaults);

// Phase 2: owner "change" + balance change.
// (Owner change is expressed by replacing the Vault object in the map;
// in production, this would be done via an explicit helper or VM op.)
{
  const v1 = vaults.get("v1") as Vault;
  const v1b: Vault = {
    ...v1,
    owner: "bank-addr-1", // e.g. institutional controller
    notes: "migrated to institutional controller",
  };
  vaults.set("v1", v1b);

  depositToVault(vaults, "v1", 50n); // 150n total
}

const snap2 = makeVaultsSnapshot(vaults);

// Phase 3: withdraw everything and delete the vault.
withdrawFromVault(vaults, "v1", 150n);
vaults.delete("v1");

const snap3 = makeVaultsSnapshot(vaults);

// Compute deltas between phases.
const delta1 = computeVaultDelta(snap1, snap2);
const delta2 = computeVaultDelta(snap2, snap3);

console.log("--- Δ1: snap1 → snap2 ---");
for (const [id, entry] of delta1.vaults.entries()) {
  console.log(`vault=${id} created?=${isVaultCreated(entry)} deleted?=${isVaultDeleted(entry)} mutated?=${isVaultMutated(entry)}`);
  console.log(`  before=${entry.before ? fmtVault(entry.before as any) : "null"}`);
  console.log(`  after=${entry.after ? fmtVault(entry.after as any) : "null"}`);
}

console.log("--- Δ2: snap2 → snap3 ---");
for (const [id, entry] of delta2.vaults.entries()) {
  console.log(`vault=${id} created?=${isVaultCreated(entry)} deleted?=${isVaultDeleted(entry)} mutated?=${isVaultMutated(entry)}`);
  console.log(`  before=${entry.before ? fmtVault(entry.before as any) : "null"}`);
  console.log(`  after=${entry.after ? fmtVault(entry.after as any) : "null"}`);
}

// Round-trip check: apply Δ1 then Δ2 starting from snap1's vaults.
const vaultsFromSnap1: VaultMap = new Map();
for (const [id, v] of vaults.entries()) {
  // vaults currently reflect snap3 (empty), so reconstruct from snap1 instead.
}
for (const [id, v] of snap1.vaults.entries()) {
  vaultsFromSnap1.set(id, {
    id: v.id,
    owner: v.owner,
    balanceTHE: v.balanceTHE,
    kind: v.kind,
    notes: v.notes,
  });
}

const afterDelta1 = applyVaultDelta(vaultsFromSnap1, delta1);
const afterDelta2 = applyVaultDelta(afterDelta1, delta2);

console.log("--- Round-trip check ---");
console.log("afterDelta2 size:", afterDelta2.size);
for (const [id, v] of afterDelta2.entries()) {
  console.log(`  vault=${id} ${fmtVault(v)}`);
}

console.log("=== VAULT DELTA SIM COMPLETE ===");
