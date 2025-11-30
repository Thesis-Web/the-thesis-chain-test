// TARGET: chain src/sims/ledger-delta-chain-sim.ts
// src/sims/ledger-delta-chain-sim.ts
// ---------------------------------------------------------------------------
// Pack 35 — LedgerDelta demo on real ChainState
// ---------------------------------------------------------------------------
//
// This sim exercises the snapshot + delta path against the concrete
// ChainState defined in src/ledger/state.ts and the vault helpers.
// ---------------------------------------------------------------------------

import { createEmptyChainState, creditAccount } from "../ledger/state";
import { createVault, depositToVault } from "../ledger/vault";
import { snapshotFromChainState } from "../ledger/ledger-snapshot";
import { computeLedgerDelta, printLedgerDelta } from "../ledger/ledger-delta";

function setupBeforeState() {
  const state = createEmptyChainState();

  creditAccount(state, "addr1", 100n);

  const v1 = createVault("v1", "addr1", 0n);
  state.vaults.set("v1", v1);
  depositToVault(state, "v1", 100n);

  return state;
}

function setupAfterState() {
  const state = createEmptyChainState();

  creditAccount(state, "addr1", 90n);
  creditAccount(state, "addr3", 10n);

  const v1 = createVault("v1", "addr1", 0n);
  state.vaults.set("v1", v1);
  depositToVault(state, "v1", 100n);

  return state;
}

function run(): void {
  console.log("=== LEDGER DELTA CHAINSTATE SIM ===");

  const beforeState = setupBeforeState();
  const afterState = setupAfterState();

  const beforeSnap = snapshotFromChainState(beforeState);
  const afterSnap = snapshotFromChainState(afterState);

  const delta = computeLedgerDelta(beforeSnap, afterSnap);
  printLedgerDelta(delta);

  console.log("=== LEDGER DELTA CHAINSTATE SIM COMPLETE ===");
}

run();
