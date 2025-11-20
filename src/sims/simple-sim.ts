import { createGenesisState, applyBlock, type ChainState, type Transaction, type PaymentTx } from "../ledger/state.js";
import type { Block } from "../ledger/block.js";
import { makeSimpleBlock } from "../ledger/block.js";

function logState(label: string, state: ChainState, addrA: string, addrB: string, miner: string): void {
  const acctA = state.accounts.get(addrA);
  const acctB = state.accounts.get(addrB);
  const minerAcct = state.accounts.get(miner);

  console.log(label);
  console.log(" A:", acctA);
  console.log(" B:", acctB);
  console.log(" Miner:", minerAcct);
  console.log("---------------------------------------\n");
}

export function runSimpleSim(): void {
  console.log("=== THE THESIS CHAIN — SIMPLE SIM ===\n");

  const addrA = "addr_A";
  const addrB = "addr_B";
  const miner = "miner_X";

  const state = createGenesisState({
    height: 0,
    accounts: [
      { address: addrA, balanceTHE: 1000n },
      { address: addrB, balanceTHE: 0n },
      { address: miner, balanceTHE: 0n }
    ]
  });

  console.log("Genesis State:");
  logState("", state, addrA, addrB, miner);

  // Block 1: empty txs, just miner reward.
  const block1: Block = makeSimpleBlock({
    height: 1,
    prevHash: "GENESIS",
    miner,
    txs: []
  });

  console.log(">>> Applying Block 1");
  applyBlock(state, block1);
  logState("State After Block: 1", state, addrA, addrB, miner);

  // Block 2: A pays B 150 THE.
  const txsBlock2: PaymentTx[] = [
    {
      kind: "PAY",
      from: addrA,
      to: addrB,
      amountTHE: 150n
    }
  ];

  const block2: Block = makeSimpleBlock({
    height: 2,
    prevHash: block1.header.hash,
    miner,
    txs: txsBlock2 as Transaction[]
  });

  console.log(">>> Applying Block 2");
  applyBlock(state, block2);
  logState("State After Block: 2", state, addrA, addrB, miner);

  // Block 3: no further transfers, just another miner reward.
  const block3: Block = makeSimpleBlock({
    height: 3,
    prevHash: block2.header.hash,
    miner,
    txs: []
  });

  console.log(">>> Applying Block 3");
  applyBlock(state, block3);
  logState("State After Block: 3", state, addrA, addrB, miner);

  console.log("=== SIM COMPLETE ===\n");
}

// Auto-run if executed directly.
if (process.argv[1]?.endsWith("simple-sim.ts")) {
  runSimpleSim();
}
