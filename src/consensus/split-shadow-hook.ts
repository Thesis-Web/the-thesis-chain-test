// TARGET: chain src/consensus/split-shadow-hook.ts
// src/consensus/split-shadow-hook.ts
// ---------------------------------------------------------------------------
// Split Shadow Hook (v0)
// ---------------------------------------------------------------------------
// This file provides a narrow, consensus-friendly entry point around the split
// shadow helpers in src/consensus/split-shadow.ts. It is intentionally
// decoupled from any concrete Block / ChainState / Env types so that
// integration into the consensus loop can be done surgically, with explicit
// approval, once those types are known.
// ---------------------------------------------------------------------------

import type { FeatureFlags } from "../params/feature-flags";
import type { SplitPolicyParams } from "../splits/split-policy";
import type { SplitEngineState } from "../splits/split-orchestrator";
import type { SplitShadowResult } from "./split-shadow";
import {
  evaluateSplitInShadow,
  type SplitShadowConfig
} from "./split-shadow";

export interface SplitHookContext {
  readonly height: number;
  // EU/THE (EU per 1 THE) price at this height, or null if oracle data is unavailable.
  readonly euPerThePrice: number | null;
}

export interface SplitHookEnv {
  readonly flags: FeatureFlags;
  readonly policy?: SplitPolicyParams;
}

/**
 * runSplitShadowHook (v0)
 *
 * This is the single function that consensus code should eventually call when
 * it wants to *observe* the effect of the split engine at a given height.
 *
 * In this v0 version it:
 *   • never mutates balances,
 *   • never mutates chain state,
 *   • never applies splits (appliedInConsensus is always false),
 *   • only returns the SplitShadowResult for logging / analysis.
 */
export function runSplitShadowHook(
  env: SplitHookEnv,
  ctx: SplitHookContext,
  prevEngineState?: SplitEngineState
): SplitShadowResult {
  const cfg: SplitShadowConfig = {
    flags: env.flags,
    policy: env.policy
  };

  const result = evaluateSplitInShadow(cfg, {
    height: ctx.height,
    euPerThePrice: ctx.euPerThePrice,
    prevEngineState
  });

  return result;
}
