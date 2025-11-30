// TARGET: chain src/sims/chain-split-log-sim-multi.ts

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

// Prices to trigger: 2n split at height 5, 3n at 10, 5n at 15 (assuming policy thresholds)
const prices: Record<number, number> = {
  5: 3.5,
  10: 8.0,
  15: 16.0
};

for (let h = 1; h <= 20; h++) {
  const blk = makeBlock(h, state.tipHash);
  const p = prices[h] ?? null;

  const res = applyBlock(env, state, blk, {
    applyLedgerFn: (l) => l,
    euPerThePrice: p
  });

  state = res.nextState;

  console.log("h", h, "price", p, "split?", res.splitShadowInfo.shouldSplit);
}

console.log("=== splitEvents ===");
console.log(state.splitEvents);
