// src/consensus/chain.ts
// ---------------------------------------------------------------------------
// L1 Consensus skeleton (v0.4 with Difficulty + SplitEngine shadow integration,
// basic timestamp validation, canonical header-hash check, and PoW flag)
// ---------------------------------------------------------------------------
// This module provides a minimal consensus "engine" that can:
//   • validate basic block linkage (parentHash, height),
//   • validate basic timestamp monotonicity + future drift bounds,
//   • enforce that block.hash matches the canonical header hash,
//   • optionally enforce a basic PoW rule via ensurePowMeetsTarget,
//   • compute emission for a given height using the emissions model,
//   • run the split engine in SHADOW MODE via runSplitShadowHook,
//   • allow a caller-supplied ledger transition function to update ledger state.
//
// It intentionally does NOT (yet):
//   • define the full production header layout (merkle roots, etc.),
//   • mutate balances or supply based on split decisions,
//   • know the concrete ledger shape (ledger is an opaque type parameter).
// ---------------------------------------------------------------------------

import type { ChainState } from "./state";
import type { Block } from "./block";
import { computeBlockHash } from "./block";

import type { FeatureFlags } from "../params/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "../params/feature-flags";

import type { EmissionBreakdown } from "../emissions/model";
import { computeEmissionForHeight } from "../emissions/model";

import {
  runSplitShadowHook,
  type SplitHookContext,
  type SplitHookEnv
} from "./split-shadow-hook";

import { applyDifficultyStep } from "./apply-difficulty";
import { ensurePowMeetsTarget } from "./pow";
import { appendSplitEvent, type SplitEvent, type SplitEventLog } from "./split-events";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ConsensusConfig {
  readonly flags?: FeatureFlags;
}

export interface ConsensusEnv {
  readonly flags: FeatureFlags;
}

export interface ApplyBlockOptions<LState> {
  // Wall-clock timestamp at the time of validation (used with timestamp
  // drift checks).
  readonly nowSec?: number;

  // Caller-supplied ledger transition function. If omitted, the ledger is
  // treated as inert and carried forward unchanged.
  readonly applyLedgerFn?: (prevLedger: LState, block: Block) => LState;

  // Optional split shadow input for sims / dev: EU/THE (EU per 1 THE) price
  // to feed the split engine at this height. In production, consensus SHOULD
  // derive this from oracle state / events instead of passing it ad-hoc.
  readonly euPerThePrice?: number | null;
}

export interface ApplyBlockResult<LState> {
  readonly nextState: ChainState<LState>;
  readonly emission: EmissionBreakdown;
  readonly splitShadowInfo: {
    readonly cumulativeFactor: bigint;
    readonly shouldSplit: boolean;
    readonly reason: string | null;
  };
}

// Basic bound on how far into the future a block timestamp is allowed to be
// relative to the validation time (if provided).
const MAX_FUTURE_DRIFT_SEC = 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

/**
 * Construct a ConsensusEnv from a partial config, defaulting missing fields.
 */
export function makeConsensusEnv(cfg?: ConsensusConfig): ConsensusEnv {
  return {
    flags: cfg?.flags ?? DEFAULT_FEATURE_FLAGS
  };
}

// ---------------------------------------------------------------------------
// Core block application
// ---------------------------------------------------------------------------

/**
 * Apply a single block to the chain in a pure, functional style.
 *
 * This function performs v0.4 checks:
 *   • parentHash linkage,
 *   • monotonic height progression,
 *   • basic timestamp monotonicity and future-drift bounds,
 *   • canonical header-hash consistency (block.hash must match),
 *   • optional PoW enforcement when powEnforcement = true.
 *
 * Emission is computed via computeEmissionForHeight(height).
 * The split engine is run in SHADOW MODE only (never mutating balances).
 * Difficulty is evolved over time via applyDifficultyStep.
 */
export function applyBlock<LState>(
  env: ConsensusEnv,
  prevState: ChainState<LState>,
  block: Block,
  opts: ApplyBlockOptions<LState> = {}
): ApplyBlockResult<LState> {
  const prevHeight = prevState.height;
  const expectedHeight = prevHeight + 1;

  if (block.header.height !== expectedHeight) {
    throw new Error(
      `applyBlock: unexpected height ${block.header.height}, expected ${expectedHeight}`
    );
  }

  if (prevState.tipHash !== null && block.header.parentHash !== prevState.tipHash) {
    throw new Error("applyBlock: parentHash mismatch");
  }

  // -------------------------------------------------------------------------
  // Timestamp checks (monotonicity + future drift)
  // -------------------------------------------------------------------------
  const blockTs = block.header.timestampSec;

  if (prevState.tipBlock) {
    const prevTs = prevState.tipBlock.header.timestampSec;
    if (blockTs < prevTs) {
      throw new Error(
        `applyBlock: non-monotonic timestamp ${blockTs} < ${prevTs}`
      );
    }
  }

  if (typeof opts.nowSec === "number") {
    const maxAllowed = opts.nowSec + MAX_FUTURE_DRIFT_SEC;
    if (blockTs > maxAllowed) {
      throw new Error(
        `applyBlock: block timestamp ${blockTs} is too far in the future (max ${maxAllowed})`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Canonical header-hash consistency
  // -------------------------------------------------------------------------
  const expectedHash = computeBlockHash(block.header);
  if (block.hash !== expectedHash) {
    throw new Error("applyBlock: block.hash does not match canonical header hash");
  }

  // -------------------------------------------------------------------------
  // Optional PoW enforcement (guarded by feature flag)
  // -------------------------------------------------------------------------
  if (env.flags.powEnforcement) {
    try {
      ensurePowMeetsTarget(block.hash, prevState.difficulty.target);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`applyBlock: PoW check failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // Emission for this height
  // -------------------------------------------------------------------------
  const emission: EmissionBreakdown = computeEmissionForHeight(block.header.height);

  // -------------------------------------------------------------------------
  // Split engine in SHADOW MODE
  // -------------------------------------------------------------------------
  const hookEnv: SplitHookEnv = {
    flags: env.flags
  };

  const hookCtx: SplitHookContext = {
    height: block.header.height,
    euPerThePrice: opts.euPerThePrice ?? null
  };

  const splitResult = runSplitShadowHook(
    hookEnv,
    hookCtx,
    prevState.splitEngineState
  );

  let nextSplitEvents: SplitEventLog = (prevState as any).splitEvents ?? [];

  if (splitResult.decision.shouldSplit && splitResult.decision.factor != null) {
    const evt: SplitEvent = {
      height: block.header.height,
      factor: splitResult.decision.factor,
      cumulativeFactor: splitResult.nextEngineState.cumulativeFactor,
      euPerThePrice: hookCtx.euPerThePrice ?? Number.NaN,
      reason: splitResult.decision.reason ?? "unknown"
    };
    nextSplitEvents = appendSplitEvent(nextSplitEvents, evt);
  }

  // -------------------------------------------------------------------------
  // Difficulty evolution
  // -------------------------------------------------------------------------
  const prevDiffTs = prevState.tipBlock
    ? prevState.tipBlock.header.timestampSec
    : null;

  const diffStep = applyDifficultyStep(
    prevState.difficulty,
    block.header.timestampSec,
    prevDiffTs
  );

  // -------------------------------------------------------------------------
  // Ledger transition
  // -------------------------------------------------------------------------
  const applyLedgerFn = opts.applyLedgerFn;
  const nextLedger = applyLedgerFn
    ? applyLedgerFn(prevState.ledger, block)
    : prevState.ledger;

  const nextState: ChainState<LState> = {
    height: block.header.height,
    tipHash: block.hash,
    tipBlock: block,
    ledger: nextLedger,
    splitEngineState: splitResult.nextEngineState,
    difficulty: diffStep.next,
    splitEvents: nextSplitEvents
  };

  return {
    nextState,
    emission,
    splitShadowInfo: {
      cumulativeFactor: splitResult.nextEngineState.cumulativeFactor,
      shouldSplit: splitResult.decision.shouldSplit,
      reason: splitResult.decision.reason
    }
  };
}
