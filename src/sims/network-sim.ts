// src/sims/network-sim.ts
// ---------------------------------------------------------------------------
// NETWORK SIM — Multi-node, mempool, and block-builder test
// ---------------------------------------------------------------------------
//
// What this sim demonstrates:
//
//   • 3 independent nodes (N1, N2, N3)
//   • Each has its own ChainState + Mempool
//   • Simple tx gossip (broadcast to all nodes)
//   • Round-robin mining (each node mines one block)
//   • Blocks are validated & applied on all nodes
//   • Final states across nodes should match (consensus v0)
//
// Run with:
//   npx ts-node src/sims/network-sim.ts
// ---------------------------------------------------------------------------

import { Node } from "../node/node";
import { getOrCreateAccount } from "../ledger/state";
import type { PaymentTx, AnyTx, Block } from "../ledger/block";
import type { Address, Amount } from "../types/primitives";

// Helper to make a payment tx.
function makePaymentTx(
  from: Address,
  to: Address,
  amount: Amount
): PaymentTx {
  return {
    txType: "PAYMENT",
    from,
    to,
    amount
  };
}

// Simple broadcast helpers ---------------------------------------------------

function broadcastTx(nodes: Node[], tx: AnyTx): void {
  for (const node of nodes) {
    node.receiveTxFromPeer(tx);
  }
}

function broadcastBlock(nodes: Node[], from: Node, block: Block): void {
  for (const node of nodes) {
    if (node === from) continue;
    try {
      node.receiveBlockFromPeer(block);
    } catch (err) {
      console.log(
        `[${node.id}] Rejected block at height=${block.header.height}:`,
        (err as Error).message
      );
    }
  }
}

// ---------------------------------------------------------------------------
// SIM START
// ---------------------------------------------------------------------------

console.log("=== NETWORK SIM ===\n");

// Create 3 nodes with distinct miner addresses.
const nodes: Node[] = [
  new Node("N1", "MINER_1"),
  new Node("N2", "MINER_2"),
  new Node("N3", "MINER_3")
];

// Seed identical balances on all nodes.
const A: Address = "ADDR_A";
const B: Address = "ADDR_B";

for (const node of nodes) {
  getOrCreateAccount(node.state, A).balanceTHE = 1000n;
  getOrCreateAccount(node.state, B).balanceTHE = 0n;
}

// We'll mine a small chain of blocks, with round-robin miners.
const NUM_BLOCKS = 6;
const PAYMENT_AMOUNT: Amount = 25n;

console.log("Initial heights:");
for (const node of nodes) {
  console.log(`  ${node.id}:`, {
    height: node.state.height,
    lastBlockHash: node.state.lastBlockHash
  });
}
console.log("");

// ---------------------------------------------------------------------------
// Main loop: each "height" we:
//   1) Create one new PAYMENT tx and broadcast it
//   2) Select a miner (round-robin) and let it mine a block
//   3) Gossip the block to all other nodes
// ---------------------------------------------------------------------------

for (let i = 1; i <= NUM_BLOCKS; i++) {
  console.log(`>>> TICK ${i}`);

  // Alternate direction: odd ticks A→B, even ticks B→A.
  const from: Address = i % 2 === 1 ? A : B;
  const to: Address = i % 2 === 1 ? B : A;

  const tx: PaymentTx = makePaymentTx(from, to, PAYMENT_AMOUNT);
  console.log(`  New tx: ${from} -> ${to} : ${PAYMENT_AMOUNT} THE`);

  broadcastTx(nodes, tx);

  // Choose miner in round-robin style.
  const minerIndex = (i - 1) % nodes.length;
  const miner = nodes[minerIndex];

  console.log(`  Miner: ${miner.id} (${miner.minerAddress})`);

  // Miner builds + applies its own block.
  const block = miner.mineNextBlock();
  console.log(
    `  Mined block h=${block.header.height} hash=${block.header.hash}`
  );

  // Gossip block to other nodes.
  broadcastBlock(nodes, miner, block);

  // Print current heights.
  for (const node of nodes) {
    console.log(`    ${node.id} state:`, {
      height: node.state.height,
      lastBlockHash: node.state.lastBlockHash
    });
  }

  console.log("");
}

// ---------------------------------------------------------------------------
// FINAL STATE CHECK
// ---------------------------------------------------------------------------

console.log("=== FINAL STATE AFTER NETWORK SIM ===");

for (const node of nodes) {
  console.log(`\nNode ${node.id}:`);
  console.log("  Height:", node.state.height);
  console.log("  Last hash:", node.state.lastBlockHash);

  console.log("  Accounts:");
  for (const [addr, acct] of node.state.accounts.entries()) {
    console.log("   ", addr, acct);
  }
}

console.log("\n=== NETWORK SIM COMPLETE ===");
