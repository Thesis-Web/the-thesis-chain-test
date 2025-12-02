// TARGET: chain src/sims/multiblock-sim.ts
// src/sims/multiblock-sim.ts
// ---------------------------------------------------------------------------
// Pack 48B — multiblock-sim fix
// ---------------------------------------------------------------------------

import { applyBlock } from "../consensus/apply-block";
import { makeGenesisFullLedgerStateV1 } from "../fullstate/state";
import type { FullLedgerStateV1 } from "../fullstate/state";
import type { Block } from "../consensus/types";

export function runMultiBlockSim(): void {
  console.log("=== MULTIBLOCK SIM (Pack 48B) ===");

  let state: FullLedgerStateV1 = makeGenesisFullLedgerStateV1();

  const blocks: Block[] = [];
  for (let i = 1; i <= 10; i++) {
    blocks.push({
      height: i,
      parentHash: i === 1 ? "genesis" : `block-${i - 1}`,
      timestamp: state.chain.timestamp + 240,
      hash: `block-${i}`,
      txs: []
    });
  }

  for (const block of blocks) {
    const prev: FullLedgerStateV1 = state;

    const result = applyBlock(prev, block);
    const next: FullLedgerStateV1 = result.next;

    console.log(
      `  Block h=${block.height} | prev.height=${prev.chain.height} -> next.height=${next.chain.height}`
    );

    state = next;
  }

  console.log("=== MULTIBLOCK SIM COMPLETE (48B) ===");
}

runMultiBlockSim();
