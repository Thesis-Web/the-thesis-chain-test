// TARGET: chain src/sims/atomic-coin-vault-sim.ts
// src/sims/atomic-coin-vault-sim.ts
// ---------------------------------------------------------------------------
// Pack 50 — Atomic coin Phase 2 (vault integration)
// ---------------------------------------------------------------------------

import { DEFAULT_ATOMIC_COIN_POLICY, validateAtomicAmount } from "../ledger/atomic-coin";
import { createVault, depositToVault, withdrawFromVault } from "../ledger/vault";
import type { VaultMap } from "../ledger/vault";
import type { Amount } from "../types/primitives";

function logResult(label: string, value: Amount) {
  const res = validateAtomicAmount(DEFAULT_ATOMIC_COIN_POLICY, value);
  if (res.kind === "OK") {
    console.log(`${label}: OK (value=${value.toString()})`);
  } else {
    console.log(`${label}: ERROR kind=${res.kind} message=${res.message}`);
  }
}

export function runAtomicCoinVaultSim(): void {
  console.log("=== ATOMIC COIN VAULT SIM (Pack 50) ===");

  const vaults: VaultMap = new Map();
  const v = createVault(vaults, "vault-atomic-test");

  console.log("--- Initial vault ---");
  console.log(v);

  console.log("\n--- Atomic OK operations (unit=1) ---");
  depositToVault(vaults, v.id, 10n);
  console.log("After deposit 10:", vaults.get(v.id));

  withdrawFromVault(vaults, v.id, 5n);
  console.log("After withdraw 5:", vaults.get(v.id));

  console.log("\n--- validateAtomicAmount samples ---");
  logResult("value=0", 0n);
  logResult("value=1", 1n);
  logResult("value=10", 10n);
  logResult("value=-1", -1n as any);

  console.log("=== ATOMIC COIN VAULT SIM COMPLETE ===");
}

runAtomicCoinVaultSim();
