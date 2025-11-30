// TARGET: chain src/consensus/consensus-delta.ts
// src/consensus/consensus-delta.ts
// ---------------------------------------------------------------------------
// Pack 30 — ConsensusDelta helper (engine-level state change view)
// ---------------------------------------------------------------------------
// This module defines a small, pure helper that derives a ConsensusDelta
// snapshot from:
//   • prevState
//   • nextState
//   • the applied Block
//   • the EmissionBreakdown for that block
//   • the FeatureFlags in effect
//
// It is explicitly *non-consensus-critical*:
//   • It never mutates ChainState.
//   • It is never used to decide block validity.
//   • All fields are derivable from existing canonical data.
//
// This makes it safe to use in sims, explorers, and analytics, and easy
// to port to Rust as a plain struct + helper.
// ---------------------------------------------------------------------------

import type { Block } from "./block";
import type { ChainState } from "./state";
import type { DifficultyState } from "./difficulty-governor";
import type { SplitEngineState } from "../splits/split-orchestrator";
import type { SplitEvent, SplitEventLog } from "./split-events";
import type { EmissionBreakdown } from "../emissions/model";
import type { FeatureFlags } from "../params/feature-flags";

export interface ConsensusDelta {
  // Identity / header view
  readonly height: number;
  readonly blockHash: string;
  readonly parentHash: string | null;
  readonly timestampSec: number;

  // Emissions model output for this block
  readonly emission: EmissionBreakdown;

  // Difficulty evolution
  readonly difficultyBefore: DifficultyState;
  readonly difficultyAfter: DifficultyState;

  // Split engine evolution
  readonly splitEngineBefore: SplitEngineState;
  readonly splitEngineAfter: SplitEngineState;

  // If a new split event was appended at this height, it appears here.
  readonly splitEvent: SplitEvent | null;

  // Flags that influenced validation / checks
  readonly powEnforced: boolean;
}

export interface ConsensusDeltaInput<LState> {
  readonly prevState: ChainState<LState>;
  readonly nextState: ChainState<LState>;
  readonly block: Block;
  readonly emission: EmissionBreakdown;
  readonly flags: FeatureFlags;
}

/**
 * Derive a ConsensusDelta from the provided inputs.
 *
 * Notes:
 *   • This function is pure and side-effect free.
 *   • It is NOT used by consensus validity logic.
 *   • It is SAFE to recompute anywhere (sims, tools, explorers).
 */
export function makeConsensusDelta<LState>(
  input: ConsensusDeltaInput<LState>
): ConsensusDelta {
  const { prevState, nextState, block, emission, flags } = input;

  const prevLog = (prevState as any).splitEvents as SplitEventLog | undefined ?? [];
  const nextLog = (nextState as any).splitEvents as SplitEventLog | undefined ?? [];

  let splitEvent: SplitEvent | null = null;
  if (nextLog.length > prevLog.length) {
    splitEvent = nextLog[nextLog.length - 1] ?? null;
  }

  return {
    height: block.header.height,
    blockHash: block.hash,
    parentHash: block.header.parentHash,
    timestampSec: block.header.timestampSec,

    emission,

    difficultyBefore: prevState.difficulty,
    difficultyAfter: nextState.difficulty,

    splitEngineBefore: prevState.splitEngineState,
    splitEngineAfter: nextState.splitEngineState,
    splitEvent,

    powEnforced: flags.powEnforcement
  };
}
