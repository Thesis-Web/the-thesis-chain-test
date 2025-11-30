// TARGET: chain src/sims/fullstate-sim.ts
// src/sims/fullstate-sim.ts
// ---------------------------------------------------------------------------
// Pack 41 — FullLedgerStateV1 smoke-test sim
// ---------------------------------------------------------------------------
//
// This sim is intentionally small: it verifies that the new FullLedgerStateV1
// and FullLedgerDeltaV1 types compose cleanly with the existing ledger, vault,
// and EU registry layers, and that basic construction + cloning behave as
// expected.
//
// It does **not** perform real block application. That wiring is reserved for
// later packs (applyBlock + replay harness).
// ---------------------------------------------------------------------------

import { createEmptyFullLedgerStateV1, cloneFullLedgerStateV1 } from "../fullstate/state";
import type { FullLedgerDeltaV1 } from "../fullstate/delta";
import { printFullLedgerDeltaV1 } from "../fullstate/delta";

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";

console.log("=== FULL LEDGER STATE V1 SIM ===");

// 1) Construct an empty full-ledger state
const s0 = createEmptyFullLedgerStateV1();

console.log("s0.chain.height =", s0.chain.height);
console.log("s0.chain.accounts.size =", s0.chain.accounts.size);
console.log("s0.chain.vaults.size =", s0.chain.vaults.size);
console.log("s0.euRegistry.byId.size =", s0.euRegistry.byId.size);
console.log("s0.euRegistry.byOwner.size =", s0.euRegistry.byOwner.size);

// 2) Clone it and verify shallow structure
const s1 = cloneFullLedgerStateV1(s0);

console.log("s1.chain.height (clone) =", s1.chain.height);
console.log("s1.euRegistry.byId.size (clone) =", s1.euRegistry.byId.size);

// 3) Build an empty composed delta just to validate types + logging

const emptyLedgerDelta: LedgerDelta = {
  accounts: new Map(),
  vaults: new Map(),
  euCerts: new Map()
};

const emptyVaultDelta: VaultDelta = {
  vaults: new Map()
};

const emptyEuDelta: EuRegistryDelta = {
  certs: new Map()
};

const fullDelta: FullLedgerDeltaV1 = {
  ledger: emptyLedgerDelta,
  vaults: emptyVaultDelta,
  eu: emptyEuDelta
};

printFullLedgerDeltaV1(fullDelta);

console.log("=== FULL LEDGER STATE V1 SIM COMPLETE ===");
