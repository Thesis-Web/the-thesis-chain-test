// TARGET: chain src/sims/atomic-eu-ledger-enforce-sim.ts
// src/sims/atomic-eu-ledger-enforce-sim.ts
// ---------------------------------------------------------------------------
// Pack 52 — EU Atomic Phase 2 (Ledger enforcement sim)
//
// This sim exercises the ledger-level EU atomic enforcement helpers defined
// in atomic-eu-ledger-enforce.ts against a few synthetic snapshots.
//
// It is deliberately small and self-contained; no real chain state or
// LedgerDelta wiring occurs here. Later packs can extend this or add
// higher-level sims once the helpers are integrated into the live ledger.
// ---------------------------------------------------------------------------

import {
  DEFAULT_ATOMIC_COIN_POLICY,
  AtomicCoinPolicy,
} from "../ledger/atomic-coin";
import {
  EuCertSnapshot,
  LedgerEuSnapshot,
  validateLedgerEuSnapshotAtomic,
  assertLedgerEuSnapshotAtomic,
} from "../ledger/atomic-eu-ledger-enforce";

function logHeader(title: string): void {
  console.log("=== EU LEDGER ATOMIC SIM ===");
  console.log(title);
}

function scenarioBaseline(): void {
  logHeader("Scenario 1 — Baseline default policy (atomicUnit = 1)");

  const policy = DEFAULT_ATOMIC_COIN_POLICY;

  const certs: EuCertSnapshot[] = [
    { certId: "EU-0", value: 0n },
    { certId: "EU-1", value: 1n },
    { certId: "EU-9", value: 9n },
  ];

  const snapshot: LedgerEuSnapshot = {
    totalEuSupply: 10n,
    certs,
  };

  const errors = validateLedgerEuSnapshotAtomic(policy, snapshot);
  if (errors.length === 0) {
    console.log("Snapshot: OK — all EU values are atomic under default policy");
  } else {
    console.log("Snapshot: ERROR(s):", errors);
  }

  console.log("assertLedgerEuSnapshotAtomic:");
  try {
    assertLedgerEuSnapshotAtomic(policy, snapshot);
    console.log("  OK");
  } catch (e) {
    console.log("  threw ->", e);
  }
}

function scenarioNegativeAndCap(): void {
  logHeader("Scenario 2 — Negative + capped total supply");

  const policy: AtomicCoinPolicy = {
    atomicUnit: 1n,
    maxSupply: 100n,
  };

  const certs: EuCertSnapshot[] = [
    { certId: "EU-NEG", value: -1n },
    { certId: "EU-50", value: 50n },
  ];

  const snapshotBadTotal: LedgerEuSnapshot = {
    totalEuSupply: 150n, // exceeds maxSupply
    certs,
  };

  const errors = validateLedgerEuSnapshotAtomic(policy, snapshotBadTotal);
  for (const err of errors) {
    console.log(
      `scope=${err.scope}, kind=${err.kind}, message=${err.message}, ` +
        `value=${err.value}, atomicUnit=${err.atomicUnit}, maxSupply=${err.maxSupply}`,
    );
  }

  console.log("assertLedgerEuSnapshotAtomic (expected to throw):");
  try {
    assertLedgerEuSnapshotAtomic(policy, snapshotBadTotal);
    console.log("  UNEXPECTED: no error");
  } catch (e) {
    console.log("  threw ->", e);
  }
}

function scenarioCoarserAtomicUnit(): void {
  logHeader("Scenario 3 — Coarser atomicUnit (100n)");

  const policy: AtomicCoinPolicy = {
    atomicUnit: 100n,
    maxSupply: 1_000n,
  };

  const certs: EuCertSnapshot[] = [
    { certId: "EU-COARSE-OK-100", value: 100n },
    { certId: "EU-COARSE-OK-200", value: 200n },
    { certId: "EU-COARSE-BAD-150", value: 150n }, // non-atomic
  ];

  const snapshot: LedgerEuSnapshot = {
    totalEuSupply: 450n, // also non-atomic under this policy
    certs,
  };

  const errors = validateLedgerEuSnapshotAtomic(policy, snapshot);
  for (const err of errors) {
    console.log(
      `scope=${err.scope}, kind=${err.kind}, message=${err.message}, ` +
        `value=${err.value}, atomicUnit=${err.atomicUnit}, maxSupply=${err.maxSupply}`,
    );
  }

  console.log("assertLedgerEuSnapshotAtomic (expected to throw):");
  try {
    assertLedgerEuSnapshotAtomic(policy, snapshot);
    console.log("  UNEXPECTED: no error");
  } catch (e) {
    console.log("  threw ->", e);
  }
}

export function main(): void {
  scenarioBaseline();
  console.log();
  scenarioNegativeAndCap();
  console.log();
  scenarioCoarserAtomicUnit();
}

// Allow `npx ts-node src/sims/atomic-eu-ledger-enforce-sim.ts` to run this file
// directly.
if (require.main === module) {
  main();
}
