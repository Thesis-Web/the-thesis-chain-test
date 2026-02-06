// src/sims/atomic-coin-vault-sim.ts
// ---------------------------------------------------------------------------
// Pack 50C — Atomic coin Phase 2 vault invariants sim (policy-aligned)
// ---------------------------------------------------------------------------
//
// Purpose:
//   • Exercise validateAtomicAmount against a simple "demo vault" balance.
//   • Verify three core invariants from src/ledger/atomic-coin.ts:
//       1) Non-negative amounts are allowed.
//       2) Amounts must be exact multiples of atomicUnit.
//       3) Amounts must not exceed optional maxSupply.
//   • Do NOT guess or depend on any vault/ledger internals.
//     This sim treats the atomic-coin module as the single source of truth.
// ---------------------------------------------------------------------------

import {
  DEFAULT_ATOMIC_COIN_POLICY,
  validateAtomicAmount,
} from "../ledger/atomic-coin";
import type { AtomicCoinPolicy, AtomicCoinError } from "../ledger/atomic-coin";

interface DemoVault {
  id: string;
  balanceRaw: bigint; // raw atomic coin units
}

/**
 * Pretty-prints the result of validateAtomicAmount(policy, raw).
 * This is strictly aligned with the real return type:
 *   AtomicCoinError | null
 */
function logValidation(
  label: string,
  raw: bigint,
  policy: AtomicCoinPolicy,
): void {
  const err: AtomicCoinError | null = validateAtomicAmount(policy, raw);

  if (err === null) {
    console.log(
      `${label}: OK raw=${raw.toString()} atomicUnit=${policy.atomicUnit.toString()}`,
    );
  } else {
    console.log(
      `${label}: ERROR kind=${err.kind} message="${err.message}" ` +
        `raw=${err.value.toString()} atomicUnit=${err.atomicUnit.toString()}` +
        (err.maxSupply !== undefined
          ? ` maxSupply=${err.maxSupply.toString()}`
          : ""),
    );
  }
}

export function runAtomicCoinVaultSim(): void {
  console.log("=== ATOMIC COIN VAULT SIM (Pack 50C) ===");

  // Start from the canonical default, optionally adding a maxSupply
  const policy: AtomicCoinPolicy = {
    ...DEFAULT_ATOMIC_COIN_POLICY,
    maxSupply: 1_000_000_000n, // demo cap for this sim only
  };

  const vault: DemoVault = {
    id: "vault-atomic-test",
    balanceRaw: 0n,
  };

  // 1) Initial empty vault.
  logValidation("initial", vault.balanceRaw, policy);

  // 2) Normal positive deposit, within maxSupply.
  vault.balanceRaw += 10n;
  logValidation("after deposit +10", vault.balanceRaw, policy);

  // 3) Second deposit, still valid.
  vault.balanceRaw += 5n;
  logValidation("after deposit +5", vault.balanceRaw, policy);

  // 4) Normal withdrawal that stays non-negative.
  vault.balanceRaw -= 7n;
  logValidation("after withdraw -7", vault.balanceRaw, policy);

  // 5) Over-withdraw: this creates a NEGATIVE balance and should error.
  const negativeBalance = vault.balanceRaw - (vault.balanceRaw + 1n);
  logValidation("after over-withdraw (expect NEGATIVE)", negativeBalance, policy);

  // 6) Over maxSupply: construct a raw value beyond the configured cap.
  if (policy.maxSupply !== undefined) {
    const overMax = policy.maxSupply + policy.atomicUnit;
    logValidation("over maxSupply (expect OVER_MAX_SUPPLY)", overMax, policy);
  }

  console.log("Final demo vault balanceRaw =", vault.balanceRaw.toString());
  console.log("=== ATOMIC COIN VAULT SIM COMPLETE ===");
}

// Run the sim when invoked via ts-node.
runAtomicCoinVaultSim();
