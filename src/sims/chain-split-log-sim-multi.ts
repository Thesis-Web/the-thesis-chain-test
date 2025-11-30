// TARGET: chain src/sims/chain-split-log-sim-multi.ts
// src/sims/chain-split-log-sim-multi.ts
// ---------------------------------------------------------------------------
// Pack 29 + 30 — Split log sim (discrete thresholds) + ConsensusDelta logging
// ---------------------------------------------------------------------------
// This sim exercises applyBlock with a few hand-picked EU/THE prices at
// specific heights to trigger the split engine, while also deriving a
// ConsensusDelta snapshot per block for analysis.
// ---------------------------------------------------------------------------

import { makeGenesisState } from "../consensus/state";
import { applyBlock, makeConsensusEnv } from "../consensus/chain";
import { computeBlockHash } from "../consensus/block";
import type { Block } from "../consensus/block";
import { makeConsensusDelta } from "../consensus/consensus-delta";

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

// Prices chosen to cross policy thresholds at specific heights (assuming
// reasonable defaults in the split policy). If thresholds ever change, these
// can be adjusted, but the wiring remains valid.
const prices: Record<number, number> = {
  5: 3.5,
  10: 8.0,
  15: 16.0
};

for (let h = 1; h <= 20; h++) {
  const blk = makeBlock(h, state.tipHash);
  const p = prices[h] ?? null;

  const prevState = state;

  const res = applyBlock(env, state, blk, {
    applyLedgerFn: (l) => l,
    euPerThePrice: p
  });

  state = res.nextState;

  const delta = makeConsensusDelta({
    prevState,
    nextState: state,
    block: blk,
    emission: res.emission,
    flags: env.flags
  });

  console.log(
    "h",
    h,
    "price",
    p,
    "split?",
    res.splitShadowInfo.shouldSplit,
    "Δ.splitEvent?",
    delta.splitEvent ? `factor=${delta.splitEvent.factor.toString()}` : "none"
  );
}

console.log("=== splitEvents ===");
console.log(state.splitEvents);
