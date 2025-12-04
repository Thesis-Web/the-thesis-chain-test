// TARGET: chain src/sims/chain-split-log-sim-multi.ts
// src/sims/chain-split-log-sim-multi.ts
// ---------------------------------------------------------------------------
// Pack 29 + 30 — Split log sim (discrete thresholds) + logging
// ---------------------------------------------------------------------------
// This sim runs a short multi-block sequence with hand-picked EU/THE prices
// at specific heights. It is *diagnostic only*:
//
//   • applyBlock(...) is the single source of truth.
//   • We read splitShadowInfo from applyBlock's result.
//   • We log any split decisions and the cumulative split factor.
//
// No consensus or ledger behavior is mocked here; we only observe the
// current engine.
// ---------------------------------------------------------------------------

import { makeGenesisState } from "../consensus/state";
import { applyBlock, makeConsensusEnv } from "../consensus/chain";
import { computeBlockHash } from "../consensus/block";
import type { Block } from "../consensus/block";

function makeBlock(h: number, parent: string | null): Block {
  const header = {
    height: h,
    parentHash: parent,
    timestampSec: h * 60,
    nonce: 0n,
  };

  const hash = computeBlockHash(header);

  return {
    header,
    hash,
    body: { txs: [] },
  };
}

const env = makeConsensusEnv({
  flags: {
    powEnforcement: false,
    enableSplitShadowMode: true,
  },
});

// NOTE: generic payload type is `null` for this sim.
let state = makeGenesisState<null>(null);

// Prices chosen to cross policy thresholds at specific heights. If the
// split policy changes in future, these may be re-tuned, but the wiring
// remains valid and non-invasive.
const prices: Record<number, number> = {
  5: 3.5,
  10: 8.0,
  15: 16.0,
};

console.log("=== CHAIN SPLIT LOG SIM (MULTI) ===");

for (let h = 1; h <= 20; h++) {
  const blk = makeBlock(h, state.tipHash);
  const p = prices[h] ?? null;

  const prevState = state;

  const res = applyBlock(env, state, blk, {
    applyLedgerFn: (l) => l,
    euPerThePrice: p,
  });

  state = res.nextState;

  const splitInfo = res.splitShadowInfo;

  console.log(
    "h=",
    h,
    "price=",
    p,
    "shouldSplit=",
    splitInfo.shouldSplit,
    "cumulativeFactor=",
    splitInfo.cumulativeFactor.toString(),
    "reason=",
    splitInfo.reason ?? "none",
    "prevHeight=",
    prevState.height,
    "nextHeight=",
    state.height,
  );
}

console.log("=== splitEvents recorded on state ===");
console.log(state.splitEvents);
