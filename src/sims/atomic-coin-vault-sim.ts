// TARGET: chain src/sims/atomic-coin-vault-sim.ts
// src/sims/atomic-coin-vault-sim.ts
// ---------------------------------------------------------------------------
// Pack 50B — Atomic Coin Phase 2 Vault Sim Fix
// ---------------------------------------------------------------------------

import { validateAtomicAmount } from "../atomic/atomic-coin";
import { createVault, initVaultLedger } from "../ledger/vault";

export function runAtomicCoinVaultSim(): void {
  console.log("=== ATOMIC COIN VAULT SIM (Pack 50B) ===");

  const vaults = initVaultLedger();

  const v = createVault(vaults, "vault-atomic-test", "owner-atomic-test");

  const tests = [
    { label: "zero", value: 0n },
    { label: "small", value: 10n },
    { label: "neg", value: -1n }
  ];

  for (const t of tests) {
    const res = validateAtomicAmount(t.value);
    if (res && res.kind === "OK") {
      console.log(`${t.label}: OK`);
    } else {
      console.log(`${t.label}: ERROR kind=${res.kind} message=${res.message}`);
    }
  }

  console.log("=== ATOMIC COIN VAULT SIM COMPLETE ===");
}

runAtomicCoinVaultSim();
