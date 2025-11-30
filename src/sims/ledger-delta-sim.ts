// TARGET: chain src/sims/ledger-delta-sim.ts
// src/sims/ledger-delta-sim.ts
// ---------------------------------------------------------------------------
// Pack 34 — Synthetic LedgerDelta demo (no ChainState)
//
// This sim builds two synthetic LedgerSnapshot instances and shows how the
// neutral delta format behaves without touching the real ChainState.
// ---------------------------------------------------------------------------

import {
  type LedgerSnapshot,
  type AccountSnapshot,
  type EuCertSnapshot,
  computeLedgerDelta,
  printLedgerDelta
} from "../ledger/ledger-delta";

function makeSnapshot(): { before: LedgerSnapshot; after: LedgerSnapshot } {
  const a1Before: AccountSnapshot = { THE: 100n, EU: 0n, nonce: 0 };
  const a1After: AccountSnapshot = { THE: 90n, EU: 0n, nonce: 1 };

  const a2Before: AccountSnapshot = { THE: 50n, EU: 10n, nonce: 1 };

  const a3After: AccountSnapshot = { THE: 10n, EU: 0n, nonce: 0 };

  const cert1Before: EuCertSnapshot = {
    faceEU: 1000n,
    status: "PENDING",
    activatedAt: null
  };
  const cert1After: EuCertSnapshot = {
    faceEU: 1000n,
    status: "ACTIVE",
    activatedAt: 1_700_000_000
  };
  const cert2After: EuCertSnapshot = {
    faceEU: 500n,
    status: "ACTIVE",
    activatedAt: 1_700_000_100
  };

  const before: LedgerSnapshot = {
    accounts: new Map([
      ["addr1", a1Before],
      ["addr2", a2Before]
    ]),
    vaults: new Map(),
    euCerts: new Map([["cert1", cert1Before]])
  };

  const after: LedgerSnapshot = {
    accounts: new Map([
      ["addr1", a1After],
      ["addr3", a3After]
    ]),
    vaults: new Map(),
    euCerts: new Map([
      ["cert1", cert1After],
      ["cert2", cert2After]
    ])
  };

  return { before, after };
}

function run(): void {
  console.log("=== LEDGER DELTA SIM (synthetic) ===");
  const { before, after } = makeSnapshot();
  const delta = computeLedgerDelta(before, after);
  printLedgerDelta(delta);
  console.log("=== LEDGER DELTA SIM COMPLETE ===");
}

run();
