// src/sims/back-wall-sim.ts
// ---------------------------------------------------------------------------
// Pack 48 — Back-Wall Guard Framework Sanity Sim
// ---------------------------------------------------------------------------
//
// This sim exercises the Back-Wall inspection layer on top of the
// FullLedgerStateV1 wrapper. It is intentionally simple and deterministic:
//
//   • Start from an empty FullLedgerStateV1.
//   • Seed a few account + vault balances.
//   • Run checkBackWall with DEFAULT_BACK_WALL_GUARDS (monitor mode).
//   • Run checkBackWall with a stricter guard config to trigger warnings.
// ---------------------------------------------------------------------------

import { createEmptyFullLedgerStateV1 } from "../fullstate/state";
import { creditAccount } from "../ledger/state";
import { createVault, depositToVault } from "../ledger/vault";
import {
  checkBackWall,
  DEFAULT_BACK_WALL_GUARDS,
  type BackWallGuards,
} from "../ledger/back-wall";

export function runBackWallSim(): void {
  console.log("=== BACK-WALL SIM (Pack 48) ===");

  const full = createEmptyFullLedgerStateV1();

  // Seed some simple balances: 1000 THE in an account and 500 THE in a vault.
  creditAccount(full.chain, "alice", 1000n);
  const v1 = createVault(full.chain.vaults, "V1", "alice");
  depositToVault(full.chain.vaults, v1.id, 500n);

  console.log("--- DEFAULT GUARDS (monitor mode) ---");
  const summaryDefault = checkBackWall(full.chain, DEFAULT_BACK_WALL_GUARDS);
  console.log(summaryDefault);

  console.log("--- STRICT GUARDS (demonstrate WARN/BREACH) ---");
  const strictGuards: BackWallGuards = {
    hardFloorTotalThe: 2000n,
    softFloorTotalThe: 1500n,
  };
  const summaryStrict = checkBackWall(full.chain, strictGuards);
  console.log(summaryStrict);
}

runBackWallSim();
