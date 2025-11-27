// TARGET: chain src/sims/chain-sim.ts
// src/sims/chain-sim.ts
// ---------------------------------------------------------------------------
// Pack 14.3 — Chain sim updated for canonical block hashes
// ---------------------------------------------------------------------------
// This sim exercises applyBlock using the canonical block constructor
// (makeBlock), so that:
//   • block.hash is always computeBlockHash(header),
//   • header-hash validation in applyBlock (Pack 14.2) passes,
//   • PoW enforcement still uses the same hash value.
// ---------------------------------------------------------------------------

import { makeGenesisState, type ChainState } from "../consensus/state";
import {
  makeConsensusEnv,
  applyBlock,
  type ApplyBlockResult
} from "../consensus/chain";
import {
  makeBlock,
  type BlockHeader,
  type BlockBody,
  type Block
} from "../consensus/block";

type LedgerState = null;

function buildBlock(prev: ChainState<LedgerState>, height: number): Block {
  const baseTs = 1_700_000_000;
  const header: BlockHeader = {
    height,
    parentHash: prev.tipHash,
    timestampSec: baseTs + height * 240,
    nonce: BigInt(height)
  };
  const body: BlockBody = {
    txs: []
  };
  return makeBlock(header, body);
}

function runSim(): void {
  console.log("=== Chain Sim (Pack 14.3, canonical hashes) ===");

  const env = makeConsensusEnv();
  let state = makeGenesisState<LedgerState>(null);

  for (let h = 1; h <= 5; h++) {
    const block = buildBlock(state, h);

    const result: ApplyBlockResult<LedgerState> = applyBlock(env, state, block, {
      nowSec: block.header.timestampSec
    });

    state = result.nextState;

    console.log(
      "h",
      state.height,
      "hash",
      state.tipHash,
      "target",
      state.difficulty.target.toString()
    );
  }

  console.log("=== Chain Sim COMPLETE ===");
}

runSim();
