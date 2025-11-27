// TARGET: chain src/consensus/split-shadow.ts
// src/consensus/split-shadow.ts
// ---------------------------------------------------------------------------
// Split Engine – SHADOW MODE hook
//
// This module runs the SplitEngine without mutating balances or supply.
// It is a pure prediction engine used by consensus to determine:
//   • cumulativeFactor
//   • next split decision
//
// Controlled by FeatureFlags.splitShadow.
// ---------------------------------------------------------------------------

import type { FeatureFlags } from "../params/feature-flags";
import type { SplitEngineState, SplitDecision } from "../splits/split-orchestrator";
import { runSplitEngine } from "../splits/split-orchestrator";

export interface SplitHookEnv {
  readonly flags: FeatureFlags;
}

export interface SplitHookContext {
  readonly height: number;
  readonly thePerEuPrice: number | null; // oracle wiring later
}

export interface SplitHookResult {
  readonly nextEngineState: SplitEngineState;
  readonly decision: SplitDecision;
}

/**
 * SHADOW MODE: never mutate balances, never apply a real split.
 */
export function runSplitShadowHook(
  env: SplitHookEnv,
  ctx: SplitHookContext,
  prev: SplitEngineState
): SplitHookResult {

  // NEW flag name (Pack 14.4)
  if (!env.flags.splitShadow) {
    // If disabled, pass through unchanged.
    return {
      nextEngineState: prev,
      decision: {
        shouldSplit: false,
        reason: "shadow-disabled"
      }
    };
  }

  // We run the orchestrator in shadow=true mode.
  const { nextState, decision } = runSplitEngine({
    height: ctx.height,
    thePerEuPrice: ctx.thePerEuPrice,
    prevState: prev,
    shadow: true
  });

  return {
    nextEngineState: nextState,
    decision
  };
}
