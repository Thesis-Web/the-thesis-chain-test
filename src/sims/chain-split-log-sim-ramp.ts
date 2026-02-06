// src/sims/chain-split-log-sim-ramp.ts
// ---------------------------------------------------------------------------
// Pack 29 + 30 — Split log sim (ramping EU/THE) + logging
// ---------------------------------------------------------------------------
// This sim ramps EU/THE price upward each height and observes when the split
// engine fires. It is *diagnostic only*:
//
//   • applyBlock(...) is the single source of truth.
//   • We read splitShadowInfo from applyBlock's result.
//   • We log split decisions and the cumulative split factor.
//
// No consensus or ledger behavior is mocked here; we only observe the
// current engine under a gradually increasing price.
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

// Simple exponential-ish ramp: start near 1.0 and grow each height.
// The exact curve is *not* consensus-critical; this is just to exercise
// the split thresholds under rising price.
function getEuPerThePrice(height: number): number {
  const base = 1.0;
  const step = 0.15; // ~15% per block
  return base * Math.pow(1 + step, Math.max(0, height - 1));
}

console.log("=== CHAIN SPLIT LOG SIM (RAMP) ===");

for (let h = 1; h <= 40; h++) {
  const blk = makeBlock(h, state.tipHash);
  const price = getEuPerThePrice(h);

  const prevState = state;

  const res = applyBlock(env, state, blk, {
    applyLedgerFn: (l) => l,
    euPerThePrice: price,
  });

  state = res.nextState;

  const splitInfo = res.splitShadowInfo;

  console.log(
    "h=",
    h,
    "price=",
    price.toFixed(4),
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
