// src/sims/emission-sim.ts
// ---------------------------------------------------------------------------
// EMISSION + EPOCH SIM
// ---------------------------------------------------------------------------
//
//  • walks through several epoch boundaries
//  • applies empty blocks (no txs, only rewards)
//  • prints miner + NIP balances at key heights
// ---------------------------------------------------------------------------

import { createEmptyChainState } from "../ledger/state";
import { makeSimpleBlock, applyBlock } from "../ledger/block";
import { getEpochIndex, EPOCH_LENGTH_BLOCKS } from "../epoch/epoch";
import { NODE_POOL_ADDRESS } from "../rewards/rewards";

const MINER: string = "MINER_EPOCH";

console.log("=== EMISSION / EPOCH SIM ===\n");
console.log("Blocks per epoch:", EPOCH_LENGTH_BLOCKS);

const state = createEmptyChainState();

function applyHeight(height: number) {
  const block = makeSimpleBlock(height, state.lastBlockHash, MINER, []);
  applyBlock(state, block);
}

function logSnapshot(label: string) {
  const epoch = getEpochIndex(state.height);
  const minerAcct = state.accounts.get(MINER);
  const nipAcct = state.accounts.get(NODE_POOL_ADDRESS);
  console.log(`\n[${label}] height=${state.height} epoch=${epoch}`);
  console.log("  MINER:", minerAcct ?? { balanceTHE: 0n });
  console.log("  NIP  :", nipAcct ?? { balanceTHE: 0n });
}

// Checkpoints across first 3 epochs.
const checkpoints = [
  1,
  10,
  EPOCH_LENGTH_BLOCKS,                 // end of epoch 0
  EPOCH_LENGTH_BLOCKS + 1,             // start of epoch 1
  2 * EPOCH_LENGTH_BLOCKS,             // end of epoch 1
  2 * EPOCH_LENGTH_BLOCKS + 1,         // start of epoch 2
  2 * EPOCH_LENGTH_BLOCKS + 10,        // a bit into epoch 2
];

let currentHeight = 0;

for (const target of checkpoints) {
  while (currentHeight < target) {
    currentHeight += 1;
    applyHeight(currentHeight);
  }
  logSnapshot(`checkpoint @ ${target}`);
}

console.log("\n=== EMISSION / EPOCH SIM COMPLETE ===");
