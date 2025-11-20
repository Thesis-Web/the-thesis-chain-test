import { createGenesisState, applyBlock } from "../ledger/state.js";
import type { Block, Transaction } from "../ledger/block.js";
import type { Address, Hash } from "../types/primitives.js";

// Very dumb hash generator for dev sims
let HASH_COUNTER = 0;
function fakeHash(): Hash {
  return "0x" + (++HASH_COUNTER).toString(16).padStart(64, "0");
}

// Create a fake TX
function makeTransfer(from: Address, to: Address, amount: bigint, nonce: bigint): Transaction {
  return {
    hash: fakeHash(),
    from,
    to,
    kind: "TRANSFER",
    amount,
    nonce,
    data: null
  };
}

// Create a fake block
function makeBlock(
  height: number,
  prevHash: Hash | null,
  miner: Address,
  txs: Transaction[]
): Block {
  return {
    header: {
      height,
      timestamp: Math.floor(Date.now() / 1000) + height * 240, // fake timestamps
      prevHash: prevHash ?? "0xGENESIS",
      stateRoot: fakeHash(),
      txRoot: fakeHash(),
      miner,
      vrfCommit: fakeHash()
    },
    txs
  };
}

// ---------------------------------------------------------------------------
// SIMPLE SIM
// ---------------------------------------------------------------------------

export function runSimpleSim(): void {
  console.log("\n=== THE THESIS CHAIN — SIMPLE SIM ===\n");

  const addrA: Address = "addr_A";
  const addrB: Address = "addr_B";
  const miner: Address = "miner_X";

  // Start fresh
  let state = createGenesisState();

  // Manually fund addr_A so transfers aren't zero
  state.accounts.set(addrA, { address: addrA, balanceTHE: 1000n });
  state.accounts.set(addrB, { address: addrB, balanceTHE: 0n });

  console.log("Genesis State:");
  console.log(" A:", state.accounts.get(addrA));
  console.log(" B:", state.accounts.get(addrB));
  console.log(" Miner:", miner);
  console.log("---------------------------------------\n");

  let lastHash: Hash | null = null;

  // Produce 3 blocks
  for (let h = 1; h <= 3; h++) {
    // Block 2 will contain a transfer A → B
    const txs: Transaction[] =
      h === 2
        ? [makeTransfer(addrA, addrB, 150n, 1n)]
        : [];

    const block = makeBlock(h, lastHash, miner, txs);

    console.log(`\n>>> Applying Block ${h}`);
    state = applyBlock(state, block);

    /// Store pseudo "hash"
    lastHash = block.header.prevHash;

    // Print state after block
    console.log("State After Block:", h);
    console.log(" A:", state.accounts.get(addrA));
    console.log(" B:", state.accounts.get(addrB));
    console.log(" Miner:", state.accounts.get(miner));
    console.log("---------------------------------------");
  }

  console.log("\n=== SIM COMPLETE ===\n");
}

// Run automatically if called directly (npm run dev on this file)
if (process.argv[1].endsWith("simple-sim.ts")) {
  runSimpleSim();
}

