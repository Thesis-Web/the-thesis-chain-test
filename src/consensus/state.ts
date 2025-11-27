// TARGET: chain src/consensus/state.ts
// src/consensus/state.ts
// ---------------------------------------------------------------------------
// ChainState definition for the L1 chain (v0 consensus skeleton).
//
// This module defines a minimal, generic ChainState that tracks only consensus-
// relevant metadata plus an opaque ledger state. The concrete structure of the
// ledger is delegated to the ledger layer and injected via type parameter.
// ---------------------------------------------------------------------------

import type { Block } from "./block";
import type { SplitEngineState } from "../splits/split-orchestrator";
import { initSplitEngineState } from "../splits/split-orchestrator";

export interface ChainState<LState = unknown> {
  readonly height: number;
  readonly tipHash: string | null;
  readonly tipBlock: Block | null;
  readonly ledger: LState;
  readonly splitEngineState: SplitEngineState;
}

/**
 * Initialize a new ChainState from an initial ledger snapshot.
 *
 * The initial height is set to -1 so that the first accepted block is expected
 * to have height 0.
 */
export function initChainState<LState>(initialLedger: LState): ChainState<LState> {
  return {
    height: -1,
    tipHash: null,
    tipBlock: null,
    ledger: initialLedger,
    splitEngineState: initSplitEngineState()
  };
}
