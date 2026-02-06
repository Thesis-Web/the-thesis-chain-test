// src/sims/atomic-vault-enforce-sim.ts
// ---------------------------------------------------------------------------
// Pack 50 — Atomic-Coin Phase 2 (vault invariants sim)
//
// This sim exercises the atomic-vault-enforce helpers in isolation. It does
// **not** depend on the real vault ledger types; instead it uses simple
// labelled balances to:
//   • prove that strictly atomic, non-negative vaults pass;
//   • show structured errors for negative balances;
//   • show structured errors when using a coarser atomicUnit policy.
// ---------------------------------------------------------------------------

import {
  DEFAULT_ATOMIC_COIN_POLICY,
  type AtomicCoinPolicy,
} from "../ledger/atomic-coin";
import {
  checkVaultAmountAtomic,
  checkVaultSetAtomic,
  assertVaultAmountAtomic,
} from "../ledger/atomic-vault-enforce";

function logHeader(title: string): void {
  console.log("=== ATOMIC VAULT ENFORCE SIM ===");
  console.log(title);
  console.log("---");
}

function logCheckResult(prefix: string, label: string, value: bigint, policy: AtomicCoinPolicy): void {
  const res = checkVaultAmountAtomic(label, value, policy);
  if (!res.error) {
    console.log(`${prefix} ${label}: OK value=${res.value.toString()}`);
  } else {
    console.log(
      `${prefix} ${label}: ERROR kind=${res.error.kind} message=${res.error.message} ` +
        `value=${res.error.value.toString()} atomicUnit=${res.error.atomicUnit.toString()}` +
        (res.error.maxSupply !== undefined
          ? ` maxSupply=${res.error.maxSupply.toString()}`
          : ""),
    );
  }
}

function scenarioBaseline(): void {
  logHeader("Scenario 1 — Baseline default policy (atomicUnit = 1)");
  const policy = DEFAULT_ATOMIC_COIN_POLICY;

  const vaults: [string, bigint][] = [
    ["VAULT-TEST-0", 0n],
    ["VAULT-TEST-1", 1n],
    ["VAULT-TEST-10", 10n],
  ];

  const agg = checkVaultSetAtomic(vaults, policy);

  for (const v of agg.perVault) {
    if (!v.error) {
      console.log(`vault ${v.label}: OK value=${v.value.toString()}`);
    } else {
      console.log(
        `vault ${v.label}: ERROR kind=${v.error.kind} message=${v.error.message} ` +
          `value=${v.error.value.toString()} atomicUnit=${v.error.atomicUnit.toString()}`,
      );
    }
  }

  if (!agg.total.error) {
    console.log(`TOTAL: OK value=${agg.total.value.toString()}`);
  } else {
    const e = agg.total.error;
    console.log(
      `TOTAL: ERROR kind=${e.kind} message=${e.message} ` +
        `value=${e.value.toString()} atomicUnit=${e.atomicUnit.toString()}`,
    );
  }
}

function scenarioNegative(): void {
  logHeader("Scenario 2 — Negative vault balance");
  const policy = DEFAULT_ATOMIC_COIN_POLICY;

  const label = "VAULT-NEGATIVE";
  const value = -5n;

  logCheckResult("  ", label, value, policy);

  try {
    assertVaultAmountAtomic(label, value, policy);
    console.log("  assertVaultAmountAtomic unexpectedly passed");
  } catch (err) {
    console.log(`  assertVaultAmountAtomic threw: ${(err as Error).message}`);
  }
}

function scenarioCoarserUnit(): void {
  logHeader("Scenario 3 — Coarser atomicUnit (10n)");
  const coarsePolicy: AtomicCoinPolicy = {
    atomicUnit: 10n,
  };

  logCheckResult("  ", "VAULT-ATOMIC-OK", 20n, coarsePolicy);
  logCheckResult("  ", "VAULT-NON-ATOMIC", 21n, coarsePolicy);

  const agg = checkVaultSetAtomic(
    [
      ["VAULT-A", 10n],
      ["VAULT-B", 15n], // non-atomic under coarse policy
    ],
    coarsePolicy,
  );

  for (const v of agg.perVault) {
    if (!v.error) {
      console.log(`vault ${v.label}: OK value=${v.value.toString()}`);
    } else {
      console.log(
        `vault ${v.label}: ERROR kind=${v.error.kind} message=${v.error.message} ` +
          `value=${v.error.value.toString()} atomicUnit=${v.error.atomicUnit.toString()}`,
      );
    }
  }

  if (!agg.total.error) {
    console.log(`TOTAL (coarse policy): OK value=${agg.total.value.toString()}`);
  } else {
    const e = agg.total.error;
    console.log(
      `TOTAL (coarse policy): ERROR kind=${e.kind} message=${e.message} ` +
        `value=${e.value.toString()} atomicUnit=${e.atomicUnit.toString()}`,
    );
  }
}

export function main(): void {
  scenarioBaseline();
  scenarioNegative();
  scenarioCoarserUnit();
  console.log("=== ATOMIC VAULT ENFORCE SIM COMPLETE ===");
}

if (require.main === module) {
  main();
}
