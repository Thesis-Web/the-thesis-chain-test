// TARGET: chain src/sims/consensus-difficulty-sim.ts
// Pack 11.2 — Consensus + Difficulty sim (aligned to orchestrator-based split engine)

import { makeGenesisState } from "../consensus/state";
import { makeConsensusEnv, applyBlock } from "../consensus/chain";
import type { ChainState } from "../consensus/state";
import type { Block } from "../consensus/block";
import { TARGET_BLOCK_TIME_SEC } from "../consensus/difficulty-governor";

type DemoLedger = { readonly totalEmission: number };

function makeInitialLedger(): DemoLedger {
  return { totalEmission: 0 };
}

function applyDemoLedger(prev: DemoLedger, emission: number): DemoLedger {
  return { totalEmission: prev.totalEmission + emission };
}

const INITIAL_TIMESTAMP_SEC = 1_700_000_000;

function makeDummyBlock(
  height: number,
  parentHash: string | null,
  timestampSec: number
): Block {
  return {
    hash: "",
    header: { height, parentHash, timestampSec },
    body: { txs: [] }
  } as unknown as Block;
}

function runSim(): void {
  console.log("=== CONSENSUS + DIFFICULTY SIM (Pack 11.2) ===");

  let state: ChainState<DemoLedger> = makeGenesisState(makeInitialLedger());
  const env = makeConsensusEnv(applyDemoLedger);

  let lastTimestampSec = INITIAL_TIMESTAMP_SEC;
  const totalBlocks = 24;

  for (let i = 1; i <= totalBlocks; i++) {
    const jitter = Math.floor(Math.random() * 120) - 60;
    const deltaSec = Math.max(60, TARGET_BLOCK_TIME_SEC + jitter);
    const timestampSec = lastTimestampSec + deltaSec;

    const block = makeDummyBlock(i, state.tipHash, timestampSec);

    const prevTarget = state.difficulty.target;
    const prevTs = state.difficulty.lastTimestampSec;
    const effDelta = Math.max(1, timestampSec - prevTs);
    const ratio = effDelta / TARGET_BLOCK_TIME_SEC;

    const nextState = applyBlock(state, block, env);

    const nextTarget = nextState.difficulty.target;

    const splitFactor =
      (nextState.splitEngineState as any).cumulativeFactor ??
      (nextState.splitEngineState as any).cumulativeFactorDec ??
      null;

    console.log("------------------------------------------------------------");
    console.log(`#${i.toString().padStart(4, "0")}  t=${timestampSec}s  Δt=${deltaSec}s`);
    console.log(
      "difficulty:",
      "prev=", prevTarget.toString(),
      "next=", nextTarget.toString(),
      "ratio≈", ratio.toFixed(3)
    );
    console.log("ledger: totalEmission=", nextState.ledger.totalEmission);
    if (splitFactor !== null) {
      console.log("splitShadow: cumulativeFactor≈", splitFactor);
    } else {
      console.log("splitShadow: (no cumulative factor)");
    }

    state = nextState;
    lastTimestampSec = timestampSec;
  }

  console.log("=== SIM COMPLETE ===");
}

runSim();
