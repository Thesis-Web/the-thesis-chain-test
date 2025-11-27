// TARGET: chain src/splits/split-orchestrator.ts
// src/splits/split-orchestrator.ts
// ---------------------------------------------------------------------------
// Split engine orchestrator (v0)
//
// This module provides a small, self-contained state machine around the
// split-policy surface defined in src/splits/split-policy.ts. It does NOT
// mutate ChainState and does NOT run in consensus code yet. It is designed for
// sims and for future integration into block processing once the policy is
// finalized and governance hooks are in place.
// ---------------------------------------------------------------------------

import {
  DEFAULT_SPLIT_POLICY,
  evaluateSplitDecision,
  type SplitPolicyParams,
  type SplitDecision,
  type SplitFactor
} from "./split-policy";

export interface SplitEngineState {
  readonly lastSplitHeight: number | null;
  readonly cumulativeFactor: bigint; // product of all prior split factors
}

export function initSplitEngineState(): SplitEngineState {
  return {
    lastSplitHeight: null,
    cumulativeFactor: 1n
  };
}

export interface SplitStepInput {
  readonly height: number;
  readonly thePerEuPrice: number | null;
  readonly policy?: SplitPolicyParams;
}

export interface SplitStepResult {
  readonly state: SplitEngineState;
  readonly decision: SplitDecision;
}

/**
 * Advance the split engine by one block height.
 *
 * This returns a new SplitEngineState and the policy decision used to produce
 * it. The engine only tracks height + cumulative factor; it is up to callers
 * (sims or future block processors) to actually apply splits to ChainState and
 * to any emission/reward tables.
 */
export function stepSplitEngine(
  prevState: SplitEngineState,
  input: SplitStepInput
): SplitStepResult {
  const policy = input.policy ?? DEFAULT_SPLIT_POLICY;

  const decision = evaluateSplitDecision({
    height: input.height,
    thePerEuPrice: input.thePerEuPrice,
    lastSplitHeight: prevState.lastSplitHeight,
    params: policy
  });

  if (!decision.shouldSplit || decision.factor == null) {
    // No split: state unchanged.
    return {
      state: prevState,
      decision
    };
  }

  const factor: SplitFactor = decision.factor;

  const nextState: SplitEngineState = {
    lastSplitHeight: input.height,
    cumulativeFactor: prevState.cumulativeFactor * factor
  };

  return {
    state: nextState,
    decision
  };
}
