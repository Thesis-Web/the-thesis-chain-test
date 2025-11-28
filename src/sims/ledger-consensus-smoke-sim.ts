// TARGET: chain src/sims/ledger-consensus-smoke-sim.ts
// src/sims/ledger-consensus-smoke-sim.ts
// ---------------------------------------------------------------------------
// LEDGER / CONSENSUS SMOKE SIM (v0)
// ---------------------------------------------------------------------------
//
// Purpose:
//   - Sanity-check that the consensus ChainState<LState> wiring compiles and
//     runs when LState = FullLedgerStateV1.
//   - This sim does NOT mine real blocks or mutate the ledger yet; it simply
//     constructs a genesis consensus state with an empty FullLedgerStateV1 and
//     prints its shape.
//
// This file is intentionally small and side-effect free so it can be used as a
// quick regression check whenever we touch consensus/ledger boundaries.
// ---------------------------------------------------------------------------

import { makeGenesisState } from "../consensus/state";
import type { FullLedgerStateV1 } from "../consensus/ledger-state";
import { makeEmptyFullLedgerStateV1 } from "../consensus/ledger-state";

function main(): void {
  console.log("=== LEDGER / CONSENSUS SMOKE SIM (v0) ===");

  // Construct an empty ledger snapshot and wrap it in a consensus state.
  const ledger0: FullLedgerStateV1 = makeEmptyFullLedgerStateV1();
  const state = makeGenesisState<FullLedgerStateV1>(ledger0);

  console.log("\n--- Consensus state (top-level) ---");
  console.log("height      :", state.height);
  console.log("tipHash     :", state.tipHash);
  console.log("tipBlock    :", state.tipBlock);

  console.log("\n--- Ledger (FullLedgerStateV1) ---");
  console.log("chain.height      :", state.ledger.chain.height);
  console.log("chain.lastBlockHash:", state.ledger.chain.lastBlockHash);
  console.log("accounts.size     :", state.ledger.chain.accounts.size);
  console.log("vaults.size       :", state.ledger.chain.vaults.size);
  console.log("eu.byId.size      :", state.ledger.eu.byId.size);
  console.log("eu.byOwner.size   :", state.ledger.eu.byOwner.size);

  console.log("\n=== SMOKE SIM COMPLETE ===");
}

main();
