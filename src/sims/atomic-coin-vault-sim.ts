// TARGET: chain src/sims/atomic-coin-vault-sim.ts
// src/sims/atomic-coin-vault-sim.ts
// ---------------------------------------------------------------------------
// Pack 50C — Atomic coin Phase 2 vault invariants sim (standalone harness)
// ---------------------------------------------------------------------------

import { validateAtomicAmount } from "../ledger/atomic-coin";

/**
 * Very small in-memory "demo vault" used only inside this sim.
 * It is intentionally decoupled from src/ledger/vault.ts so that
 * we do not guess at that module's internal structure.
 */
interface DemoVault {
  id: string;
  balanceRaw: bigint; // raw atomic coin units
}

/**
 * Helper to run validateAtomicAmount and print a readable line.
 */
function logValidation(label: string, value: bigint, atomicUnit: bigint): void {
  const res = validateAtomicAmount(value, atomicUnit);

  if (res.kind === "OK") {
    console.log(`${label}: OK value=${value} atomicUnit=${atomicUnit}`);
  } else {
    console.log(
      `${label}: ERROR kind=${res.kind} message=${res.message} value=${value} atomicUnit=${atomicUnit}`
    );
  }
}

export function runAtomicCoinVaultSim(): void {
  console.log("=== ATOMIC COIN VAULT SIM (Pack 50C) ===");

  const atomicUnit = 1n;

  // 1) Start with an empty vault.
  const vault: DemoVault = { id: "vault-atomic-test", balanceRaw: 0n };
  logValidation("initial", vault.balanceRaw, atomicUnit);

  // 2) Normal positive deposit.
  const deposit1 = 10n;
  vault.balanceRaw += deposit1;
  logValidation("after deposit +10", vault.balanceRaw, atomicUnit);

  // 3) Second deposit.
  const deposit2 = 5n;
  vault.balanceRaw += deposit2;
  logValidation("after deposit +5", vault.balanceRaw, atomicUnit);

  // 4) Normal withdrawal (stays non-negative).
  const withdraw1 = 7n;
  vault.balanceRaw -= withdraw1;
  logValidation("after withdraw -7", vault.balanceRaw, atomicUnit);

  // 5) Over-withdraw to force a NEGATIVE error.
  const overWithdraw = vault.balanceRaw + 1n;
  const badBalance = vault.balanceRaw - overWithdraw;
  logValidation("after over-withdraw (expect NEGATIVE)", badBalance, atomicUnit);

  console.log("Final demo vault balanceRaw =", vault.balanceRaw);
  console.log("=== ATOMIC COIN VAULT SIM COMPLETE ===");
}

runAtomicCoinVaultSim();
