// TARGET: chain src/consensus/state.ts
// Pack 10.3 — Consensus State with Difficulty + SplitEngine integrated to actual orchestrator API

import type { Block } from "./block";
import type { SplitEngineState } from "../splits/split-orchestrator";
import { initSplitEngineState } from "../splits/split-orchestrator";
import type { DifficultyState } from "./difficulty-governor";
import { INITIAL_DIFFICULTY_STATE } from "./difficulty-governor";

export interface ChainState<LState = unknown> {
  readonly height: number;
  readonly tipHash: string | null;
  readonly tipBlock: Block | null;
  readonly ledger: LState;
  readonly splitEngineState: SplitEngineState;
  readonly difficulty: DifficultyState;
}

/**
 * Initialize a new ChainState from an initial ledger snapshot.
 *
 * We start at height 0 for the first real block and initialize:
 *  - splitEngineState via initSplitEngineState()
 *  - difficulty via INITIAL_DIFFICULTY_STATE
 */
export function makeGenesisState<LState>(ledger: LState): ChainState<LState> {
  return {
    height: 0,
    tipHash: null,
    tipBlock: null,
    ledger,
    splitEngineState: initSplitEngineState(),
    difficulty: INITIAL_DIFFICULTY_STATE
  };
}
