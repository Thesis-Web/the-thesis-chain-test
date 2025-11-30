// TARGET: chain src/sims/chain-split-log-sim-ramp.ts

import { makeGenesisState } from "../consensus/state";
import { applyBlock, makeConsensusEnv } from "../consensus/chain";
import { computeBlockHash } from "../consensus/block";
import type { Block } from "../consensus/block";

function makeBlock(h: number, parent: string | null): Block {
  const header = {
    height: h,
    parentHash: parent,
    timestampSec: h * 60,
    nonce: 0n
  };

  const hash = computeBlockHash(header);

  return {
    header,
    hash,
    body: { txs: [] }
  };
}

const env = makeConsensusEnv({
  flags: {
    powEnforcement: false,
    enableSplitShadowMode: true
  }
});

let state = makeGenesisState<null>(null);

// Ramp EU/THE price upward so we cross multiple thresholds over time.
for (let h = 1; h <= 25; h++) {
  const price = h * 1.2;

  const blk = makeBlock(h, state.tipHash);

  const res = applyBlock(env, state, blk, {
    applyLedgerFn: (l) => l,
    euPerThePrice: price
  });

  state = res.nextState;

  console.log("h", h, "price", price.toFixed(2), "split?", res.splitShadowInfo.shouldSplit);
}

console.log("=== splitEvents ===");
console.log(state.splitEvents);
