import { createEmptyChainState } from "../ledger/state";
import type { Block, BlockHeader } from "../ledger/block";
import { applyBlock } from "../ledger/block";

console.log("=== SIMPLE BLOCK SIM ===\n");

const state = createEmptyChainState();
const miner = "MINER_X";

function makeHeader(
  height: number,
  prevHash: string | null
): BlockHeader {
  return {
    height,
    prevHash,
    timestamp: Date.now(),
    miner
  };
}

function makeBlock(
  height: number,
  prevHash: string | null
): Block {
  return {
    header: makeHeader(height, prevHash),
    txs: []
  };
}

// GENESIS view
console.log("Initial state:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// Block 1
const block1 = makeBlock(1, state.lastBlockHash);
console.log("\n>>> APPLY BLOCK 1");
applyBlock(state, block1);
console.log("After Block 1:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// Block 2
const block2 = makeBlock(2, state.lastBlockHash);
console.log("\n>>> APPLY BLOCK 2");
applyBlock(state, block2);
console.log("After Block 2:", {
  height: state.height,
  lastBlockHash: state.lastBlockHash
});

// Dump accounts
console.log("\nAccounts:");
for (const [addr, acct] of state.accounts.entries()) {
  console.log("  ", addr, acct);
}

console.log("\n=== SIMPLE BLOCK SIM COMPLETE ===");
