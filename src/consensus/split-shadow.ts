// TARGET: chain src/consensus/split-shadow.ts
// src/consensus/split-shadow.ts
// ---------------------------------------------------------------------------
// Split Shadow Helpers (v0)
//
// This module provides a thin wrapper around the split engine orchestrator
// in src/splits/split-orchestrator.ts so that consensus and sims can
// *observe* split decisions in SHADOW MODE:
//
//   • never mutates ChainState
//   • never applies splits directly
//   • only returns the next SplitEngineState + decision
//
// It matches the API expected by src/consensus/split-shadow-hook.ts:
//   - SplitShadowConfig
//   - SplitShadowResult
//   - evaluateSplitInShadow(cfg, input)
// ---------------------------------------------------------------------------

import type { FeatureFlags } from "../params/feature-flags";
import type { SplitPolicyParams, SplitDecision } from "../splits/split-policy";
import {
  initSplitEngineState,
  stepSplitEngine,
  type SplitEngineState
} from "../splits/split-orchestrator";

export interface SplitShadowConfig {
  readonly flags: FeatureFlags;
  readonly policy?: SplitPolicyParams;
}

export interface SplitShadowInput {
  readonly height: number;
  readonly thePerEuPrice: number | null;
  readonly prevEngineState?: SplitEngineState;
}

/**
 * Result shape used by split-shadow-hook and sims.
 *
 * appliedInConsensus is always false in v0: this layer NEVER mutates
 * balances or consensus state. It only reports what the engine *would* do.
 */
export interface SplitShadowResult {
  readonly nextEngineState: SplitEngineState;
  readonly decision: SplitDecision;
  readonly appliedInConsensus: boolean;
}

/**
 * Evaluate the split engine in SHADOW MODE for a single height.
 *
 * - If no previous engine state is provided, initSplitEngineState() is used.
 * - The policy is taken from cfg.policy, or DEFAULT_SPLIT_POLICY inside
 *   stepSplitEngine via its own default behavior.
 * - FeatureFlags.enableSplitShadowMode is honored as a gate: if disabled,
 *   we simply pass through the previous state and return a "no split" decision.
 */
export function evaluateSplitInShadow(
  cfg: SplitShadowConfig,
  input: SplitShadowInput
): SplitShadowResult {
  const { flags, policy } = cfg;

  // If shadow mode is disabled, pass through unchanged state and a
  // "no split" decision. We don't try to manufacture a fake SplitDecision
  // here; instead, we simply avoid calling the engine when disabled.
  if (!flags.enableSplitShadowMode) {
    const prevState = input.prevEngineState ?? initSplitEngineState();

    return {
      nextEngineState: prevState,
      decision: {
        shouldSplit: false,
        reason: "shadow-disabled",
        factor: null
      },
      appliedInConsensus: false
    };
  }

  const prevState = input.prevEngineState ?? initSplitEngineState();

  const { state, decision } = stepSplitEngine(prevState, {
    height: input.height,
    thePerEuPrice: input.thePerEuPrice,
    policy
  });

  return {
    nextEngineState: state,
    decision,
    appliedInConsensus: false
  };
}
