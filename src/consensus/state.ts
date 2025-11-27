// TARGET: chain src/consensus/state.ts
// Pack 10 — Consensus State with Difficulty integrated

import type { Block } from "./block";
import type { SplitEngineState } from "../splits/engine-types";
import { INITIAL_ENGINE_STATE } from "../splits/engine-initial";
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

export function makeGenesisState<LState>(ledger: LState): ChainState<LState> {
  return {
    height: 0,
    tipHash: null,
    tipBlock: null,
    ledger,
    splitEngineState: INITIAL_ENGINE_STATE,
    difficulty: INITIAL_DIFFICULTY_STATE
  };
}
