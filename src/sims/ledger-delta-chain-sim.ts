// TARGET: chain src/sims/ledger-delta-chain-sim.ts
// Using real ChainState + real vault API

import { createEmptyChainState } from "../ledger/state";
import { createVault, depositToVault } from "../ledger/vault";
import { createEmptyLedgerDelta, recordAccountChange } from "../ledger/ledger-delta";

console.log("=== LEDGER DELTA CHAINSTATE SIM ===");

const state = createEmptyChainState();

createVault(state.vaults, "v1", "addr1");
depositToVault(state.vaults, "v1", 100n);

const delta = createEmptyLedgerDelta();

recordAccountChange(delta, "addr1",
  { balanceTHE: 100n, balanceEU: 0n, nonce: 0 },
  { balanceTHE: 90n, balanceEU: 0n, nonce: 1 });

recordAccountChange(delta, "addr3",
  null,
  { balanceTHE: 10n, balanceEU: 0n, nonce: 0 });

console.log(delta);

console.log("=== LEDGER DELTA CHAINSTATE SIM COMPLETE ===");
