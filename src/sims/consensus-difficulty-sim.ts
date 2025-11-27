// TARGET: chain src/sims/consensus-difficulty-sim.ts
// src/sims/consensus-difficulty-sim.ts
// ---------------------------------------------------------------------------
// Consensus + Difficulty + Split Shadow sim (Pack 11.3)
// ---------------------------------------------------------------------------
// This sim drives the real consensus pipeline end-to-end using the v0.1
// consensus engine with:
//   • emission from the emissions model,
//   • split engine in SHADOW MODE,
//   • difficulty evolution over time,
//   • a simple demo ledger that tracks total emitted THE.
// ---------------------------------------------------------------------------

import { makeGenesisState } from "../consensus/state";
import {
  makeConsensusEnv,
  applyBlock,
  type ApplyBlockResult
} from "../consensus/chain";
import type { ChainState } from "../consensus/state";
import type { Block } from "../consensus/block";
import type { EmissionBreakdown } from "../emissions/model";
import { TARGET_BLOCK_TIME_SEC } from "../consensus/difficulty-governor";

type DemoLedger = { readonly totalEmission: number };

function makeInitialLedger(): DemoLedger {
  return { totalEmission: 0 };
}

function applyDemoLedger(prev: DemoLedger, _block: Block, emission: EmissionBreakdown): DemoLedger {
  // For now we just accumulate the totalRewardTHE as a number for logging.
  const total = Number(emission.totalRewardTHE);
  return { totalEmission: prev.totalEmission + total };
}

const INITIAL_TIMESTAMP_SEC = 1_700_000_000;

function makeDummyBlock(
  height: number,
  parentHash: string | null,
  timestampSec: number
): Block {
  // In sims we can get away with a dummy hash; in real nodes this would be
  // computed via computeBlockHash(header) at construction time.
  return {
    hash: `SIM_HASH_${height}`,
    header: { height, parentHash, timestampSec, nonce: 0n },
    body: { txs: [] }
  };
}

function runSim(): void {
  console.log("=== CONSENSUS + DIFFICULTY + SPLIT SHADOW SIM (Pack 11.3) ===");

  let state: ChainState<DemoLedger> = makeGenesisState(makeInitialLedger());
  const env = makeConsensusEnv();

  let lastTimestampSec = INITIAL_TIMESTAMP_SEC;
  const totalBlocks = 24;

  for (let i = 1; i <= totalBlocks; i++) {
    const jitter = Math.floor(Math.random() * 120) - 60;
    const deltaSec = Math.max(60, TARGET_BLOCK_TIME_SEC + jitter);
    const timestampSec = lastTimestampSec + deltaSec;

    const block = makeDummyBlock(i, state.tipHash, timestampSec);

    // Compute effective ratio vs target using the DifficultyState carried on state.
    const prevTarget = state.difficulty.target;
    const prevTs = state.difficulty.lastTimestampSec;
    const effDelta = Math.max(1, timestampSec - prevTs);
    const ratio = effDelta / TARGET_BLOCK_TIME_SEC;

    // Apply consensus.
    const result: ApplyBlockResult<DemoLedger> = applyBlock(env, state, block, {
      applyLedgerFn: (prevLedger, blk) =>
        applyDemoLedger(prevLedger, blk, result.emission) // will be overridden below
    } as any);
    // The above cast is a minor TS hack to keep the sim lightweight; in a real
    // node we'd wire the ledger more strictly. For logging we can update the
    // ledger after the fact using result.emission.
    const emission = result.emission;
    const nextLedger = applyDemoLedger(state.ledger, block, emission);

    const nextState: ChainState<DemoLedger> = {
      ...result.nextState,
      ledger: nextLedger
    };

    const nextTarget = nextState.difficulty.target;
    const splitInfo = result.splitShadowInfo;

    console.log("------------------------------------------------------------");
    console.log(`#${i.toString().padStart(4, "0")}  t=${timestampSec}s  Δt=${deltaSec}s`);
    console.log(
      "difficulty:",
      "prev=", prevTarget.toString(),
      "next=", nextTarget.toString(),
      "ratio≈", ratio.toFixed(3)
    );
    console.log("ledger: totalEmission=", nextState.ledger.totalEmission);
    console.log(
      "splitShadow:",
      "cumFactor≈", String(splitInfo.cumulativeFactor),
      "shouldSplit=", splitInfo.shouldSplit,
      "reason=", splitInfo.reason
    );

    state = nextState;
    lastTimestampSec = timestampSec;
  }

  console.log("=== SIM COMPLETE ===");
}

runSim();
