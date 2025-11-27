// TARGET: chain src/sims/consensus-skeleton-sim.ts
// src/sims/consensus-skeleton-sim.ts
// ---------------------------------------------------------------------------
// Pack 14.3 — Consensus skeleton sim using canonical block hashes
// ---------------------------------------------------------------------------
// This is a lighter variant of chain-sim that focuses on the consensus
// pipeline shape:
//
//   genesis -> applyBlock(block1) -> applyBlock(block2)
//
// It exists mainly as a smoke test for:
//   • makeGenesisState
//   • makeConsensusEnv
//   • makeBlock
//   • applyBlock (including header-hash + PoW checks)
// ---------------------------------------------------------------------------

import { makeGenesisState, type ChainState } from "../consensus/state";
import { makeConsensusEnv, applyBlock } from "../consensus/chain";
import {
  makeBlock,
  type BlockHeader,
  type BlockBody,
  type Block
} from "../consensus/block";

type LedgerState = null;

function buildBlock(
  prev: ChainState<LedgerState>,
  height: number,
  tsOffsetSec: number
): Block {
  const header: BlockHeader = {
    height,
    parentHash: prev.tipHash,
    timestampSec: tsOffsetSec,
    nonce: BigInt(height)
  };
  const body: BlockBody = { txs: [] };
  return makeBlock(header, body);
}

function runSim(): void {
  console.log("=== Consensus Skeleton Sim (Pack 14.3) ===");

  const env = makeConsensusEnv();
  let state = makeGenesisState<LedgerState>(null);

  // First block
  const b1 = buildBlock(state, 1, 1_700_000_000);
  const r1 = applyBlock(env, state, b1, { nowSec: b1.header.timestampSec });
  state = r1.nextState;
  console.log("applied h", state.height, "hash", state.tipHash);

  // Second block
  const b2 = buildBlock(state, 2, 1_700_000_000 + 240);
  const r2 = applyBlock(env, state, b2, { nowSec: b2.header.timestampSec });
  state = r2.nextState;
  console.log("applied h", state.height, "hash", state.tipHash);

  console.log("=== Consensus Skeleton Sim COMPLETE ===");
}

runSim();
