// src/sims/atomic-eu-enforce-sim.ts
// ---------------------------------------------------------------------------
// Pack 51 — EU Atomic Enforcement Sim (Phase 1)
//
// This harness exercises the EU-facing atomic helpers to ensure that
// they behave exactly like the underlying atomic-coin invariants, while
// keeping the logging and terminology in EU space.
//
// Scope:
//   • Does NOT touch any ledger files.
//   • Does NOT touch consensus or SplitEngine.
//   • Purely a sanity check and documentation harness for Pack 51.
// ---------------------------------------------------------------------------

import {
  DEFAULT_ATOMIC_EU_POLICY,
  validateEUAtomicAmount,
  assertEUAtomicAmount,
  type AtomicEUPolicy,
  type AtomicEUError,
} from "../ledger/atomic-eu-enforce";

function logEUResult(
  label: string,
  policy: AtomicEUPolicy,
  value: bigint,
): void {
  const res: AtomicEUError | null = validateEUAtomicAmount(policy, value);

  if (res === null) {
    console.log(`${label}: OK value=${value.toString()}`);
  } else {
    console.log(
      `${label}: ERROR kind=${res.kind} message=${res.message} value=${value.toString()} atomicUnit=${res.atomicUnit.toString()}` +
        (res.maxSupply !== undefined
          ? ` maxSupply=${res.maxSupply.toString()}`
          : ""),
    );
  }

  try {
    assertEUAtomicAmount(policy, value);
    console.log(`  assertEUAtomicAmount: OK`);
  } catch (e) {
    console.log(`  assertEUAtomicAmount: threw -> ${(e as Error).message}`);
  }
}

function scenario1_baselineDefaultPolicy(): void {
  console.log("=== ATOMIC EU ENFORCE SIM ===");
  console.log("Scenario 1 — Baseline default policy (atomicUnit = 1)");
  const policy: AtomicEUPolicy = { ...DEFAULT_ATOMIC_EU_POLICY };

  logEUResult("EU-0", policy, 0n);
  logEUResult("EU-1", policy, 1n);
  logEUResult("EU-10", policy, 10n);
}

function scenario2_negativeAndCap(): void {
  console.log("=== ATOMIC EU ENFORCE SIM ===");
  console.log("Scenario 2 — Negative + capped supply");

  const cappedPolicy: AtomicEUPolicy = {
    atomicUnit: 1n,
    maxSupply: 100n,
  };

  logEUResult("EU-NEGATIVE", cappedPolicy, -1n);
  logEUResult("EU-OK-50", cappedPolicy, 50n);
  logEUResult("EU-OK-100", cappedPolicy, 100n);
  logEUResult("EU-OVER-101", cappedPolicy, 101n);
}

function scenario3_coarseAtomicUnit(): void {
  console.log("=== ATOMIC EU ENFORCE SIM ===");
  console.log("Scenario 3 — Coarser atomicUnit (100n)");

  const coarsePolicy: AtomicEUPolicy = {
    atomicUnit: 100n,
  };

  logEUResult("EU-COARSE-0", coarsePolicy, 0n);
  logEUResult("EU-COARSE-100", coarsePolicy, 100n);
  logEUResult("EU-COARSE-200", coarsePolicy, 200n);
  logEUResult("EU-COARSE-150", coarsePolicy, 150n);
}

// Entrypoint for ts-node
(function main(): void {
  scenario1_baselineDefaultPolicy();
  scenario2_negativeAndCap();
  scenario3_coarseAtomicUnit();
  console.log("=== ATOMIC EU ENFORCE SIM COMPLETE ===");
})();
