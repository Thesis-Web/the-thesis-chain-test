// TARGET: chain src/consensus/chain.ts
// Pack 10.1 — applyBlock wired with difficulty evolution (aligned to current repo)

import { computeBlockHash } from "./block";
import type { Block } from "./block";
import type { ChainState } from "./state";
import { applyDifficultyStep } from "./apply-difficulty";
import { computeEmissionForHeight } from "../emissions/model";
import { runSplitShadowHook } from "./split-shadow-hook";

export interface ConsensusEnv<LState> {
  readonly applyLedger: (prev: LState, emission: number) => LState;
}

export function makeConsensusEnv<LState>(
  applyLedger: (prev: LState, emission: number) => LState
): ConsensusEnv<LState> {
  return { applyLedger };
}

export function applyBlock<LState>(
  prevState: ChainState<LState>,
  block: Block,
  env: ConsensusEnv<LState>
): ChainState<LState> {
  if (block.header.height !== prevState.height + 1) {
    throw new Error("height_mismatch");
  }
  if (block.header.parentHash !== prevState.tipHash) {
    throw new Error("parent_hash_mismatch");
  }
  const hash = computeBlockHash(block);
  if (hash !== block.hash) {
    throw new Error("invalid_block_hash");
  }

  const emission = computeEmissionForHeight(block.header.height);

  const splitResult = runSplitShadowHook(
    prevState.splitEngineState,
    block.header.height,
    emission
  );

  const diffStep = applyDifficultyStep(
    prevState.difficulty,
    block.header.timestampSec
  );

  const nextLedger = env.applyLedger(prevState.ledger, emission);

  return {
    height: block.header.height,
    tipHash: block.hash,
    tipBlock: block,
    ledger: nextLedger,
    splitEngineState: splitResult.nextEngineState,
    difficulty: diffStep.next
  };
}
