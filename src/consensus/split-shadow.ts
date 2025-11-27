// TARGET: chain src/consensus/split-shadow.ts
// src/consensus/split-shadow.ts
// ---------------------------------------------------------------------------
// Split "shadow mode" helpers (v0)
//
// This module provides pure helper utilities for consensus code or sims that
// want to *observe* what the split engine would do at a given height + price,
// without mutating balances or altering supply. It is designed so that it can
// be imported into block processing logic once that code is available, but does
// not depend on any concrete ChainState types itself.
// ---------------------------------------------------------------------------

import type { FeatureFlags } from "../params/feature-flags";
import {
  DEFAULT_SPLIT_POLICY,
  type SplitPolicyParams,
  type SplitDecision
} from "../splits/split-policy";
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

export interface SplitShadowResult {
  readonly nextEngineState: SplitEngineState;
  readonly decision: SplitDecision;
  readonly appliedInConsensus: boolean;
}

/**
 * Run a single-height split evaluation in "shadow mode".
 *
 * If flags.enableSplitShadowMode is false, this is effectively a no-op that
 * maintains a neutral engine state and reports a "shadow_mode_disabled"
 * decision.
 *
 * If flags.enableSplitShadowMode is true, this computes the policy decision
 * using the split engine, but never insists that the caller mutate balances.
 */
export function evaluateSplitInShadow(
  cfg: SplitShadowConfig,
  input: SplitShadowInput
): SplitShadowResult {
  const { flags } = cfg;

  if (!flags.enableSplitShadowMode) {
    const neutralState = input.prevEngineState ?? initSplitEngineState();
    return {
      nextEngineState: neutralState,
      decision: {
        shouldSplit: false,
        factor: null,
        reason: "shadow_mode_disabled"
      },
      appliedInConsensus: false
    };
  }

  const policy = cfg.policy ?? DEFAULT_SPLIT_POLICY;
  const prev = input.prevEngineState ?? initSplitEngineState();

  const { state: nextEngineState, decision } = stepSplitEngine(prev, {
    height: input.height,
    thePerEuPrice: input.thePerEuPrice,
    policy
  });

  // In v0 shadow mode, we *never* apply the split inside this helper. That
  // must be an explicit decision in consensus code, guarded by both
  // enableConsensusSplits and up-to-date invariants.
  const appliedInConsensus = false;

  return {
    nextEngineState,
    decision,
    appliedInConsensus
  };
}
