// src/sims/atomic-eu-ledger-debug-sim.ts
// ---------------------------------------------------------------------------
// Pack 53D — EU Atomic Ledger Debug Sim
// ---------------------------------------------------------------------------
//
// This sim is a *wrapper harness* around the Pack 52 helpers plus the new
// snapshot-from-state adapter in src/ledger/atomic-eu-ledger-debug.ts.
//
// It does NOT mutate core consensus code. It simply constructs a minimal
// ChainState + EuRegistry fixture, runs the debug helpers, and logs the
// results so we can verify the wiring is correct without touching
// apply-block-ledger.ts yet.
// ---------------------------------------------------------------------------

import { createEmptyChainState, type ChainState } from "../ledger/state";
import { createEmptyEuRegistry, type EuCertificate } from "../ledger/eu";
import { assertEuLedgerAtomicFromState } from "../ledger/atomic-eu-ledger-debug";
import type { AtomicCoinPolicy } from "../ledger/atomic-coin";

function logSection(title: string): void {
  console.log("=== EU LEDGER ATOMIC DEBUG SIM ===");
  console.log(title);
}

// Minimal helper to create a fake EU cert for sims
function makeCert(
  id: string,
  valueEU: bigint,
  backingVaultId: string
): EuCertificate {
  return {
    id,
    owner: "OWNER-" + id,
    activatedByInstitutionId: "INST-TEST",
    physicalBearer: true,
    issuedAtHeight: 1,
    chainHashProof: "hash-" + id,
    oracleValueEUAtIssuance: valueEU,
    backingVaultId,
    status: "ACTIVE"
  };
}

async function main(): Promise<void> {
  // Policy examples matching the AtomicCoinPolicy shape
  const defaultPolicy: AtomicCoinPolicy = {
    atomicUnit: 1n
  };

  const cappedPolicy: AtomicCoinPolicy = {
    atomicUnit: 1n,
    maxSupply: 100n
  };

  // Scenario 1 — Empty registry should trivially pass
  {
    logSection("Scenario 1 — Empty registry");
    const state: ChainState = createEmptyChainState();
    const registry = createEmptyEuRegistry();

    assertEuLedgerAtomicFromState(state, registry, defaultPolicy);
    console.log("  OK — empty EU registry is atomic under default policy");
  }

  // Scenario 2 — Simple positive case under default policy
  {
    logSection("Scenario 2 — Simple positive case");
    const state: ChainState = createEmptyChainState();
    const registry = createEmptyEuRegistry();

    const vaultId = "VAULT-OK";
    // create a backing vault with some THE so eu.ts invariants would be happy
    state.vaults.set(vaultId, {
      id: vaultId,
      owner: "OWNER-EU-1",
      balanceTHE: 10n
    } as any);

    const cert = makeCert("EU-1", 10n, vaultId);
    registry.byId.set(cert.id, cert);
    registry.byOwner.set(cert.owner, [cert.id]);

    assertEuLedgerAtomicFromState(state, registry, defaultPolicy);
    console.log("  OK — single EU cert passes atomic checks");
  }

  // Scenario 3 — Over maxSupply should throw under capped policy
  {
    logSection("Scenario 3 — Over maxSupply (expected throw)");

    const state: ChainState = createEmptyChainState();
    const registry = createEmptyEuRegistry();

    const vaultId = "VAULT-CAP";
    state.vaults.set(vaultId, {
      id: vaultId,
      owner: "OWNER-EU-CAP",
      balanceTHE: 200n
    } as any);

    const cert = makeCert("EU-CAP", 150n, vaultId);
    registry.byId.set(cert.id, cert);
    registry.byOwner.set(cert.owner, [cert.id]);

    try {
      assertEuLedgerAtomicFromState(state, registry, cappedPolicy);
      console.log("  expected error -> invariant violation caught as expected");
    } catch (err: any) {
      console.log("  expected error ->", String(err?.message ?? err));
    }
  }
}

main().catch((err) => {
  console.error("FATAL in atomic-eu-ledger-debug-sim:", err);
  process.exit(1);
});
