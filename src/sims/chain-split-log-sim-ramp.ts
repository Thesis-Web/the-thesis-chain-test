// TARGET: chain src/sims/chain-split-log-sim-ramp.ts
// src/sims/chain-split-log-sim-ramp.ts
// ---------------------------------------------------------------------------
// Pack 29 + 30 — Split log sim (ramping EU/THE) + ConsensusDelta logging
// ---------------------------------------------------------------------------
// This sim ramps EU/THE price upward each height and observes when the split
// engine fires, while also deriving a ConsensusDelta snapshot per block for
// analysis.
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

// Ramp EU/THE price upward so we cross multiple thresholds over time.
for (let h = 1; h <= 25; h++) {
  const price = h * 1.2;

  const blk = makeBlock(h, state.tipHash);
  const prevState = state;

  const res = applyBlock(env, state, blk, {
    applyLedgerFn: (l) => l,
    euPerThePrice: price
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
    price.toFixed(2),
    "split?",
    res.splitShadowInfo.shouldSplit,
    "Δ.splitEvent?",
    delta.splitEvent ? `factor=${delta.splitEvent.factor.toString()}` : "none"
  );
}

console.log("=== splitEvents ===");
console.log(state.splitEvents);
