// TARGET: chain src/consensus/chain.ts
// src/consensus/chain.ts
// ---------------------------------------------------------------------------
// L1 Consensus skeleton (v0)
// ---------------------------------------------------------------------------
// This module provides a minimal consensus "engine" that can:
//   • validate basic block linkage (parentHash, height),
//   • compute emission for a given height using the emissions model,
//   • run the split engine in SHADOW MODE via runSplitShadowHook,
//   • allow a caller-supplied ledger transition function to update ledger state.
//
// It intentionally does NOT:
//   • enforce difficulty/PoW yet (that will be integrated from 041–046),
//   • mutate balances or supply based on split decisions,
//   • know the concrete ledger shape (ledger is an opaque type parameter).
// ---------------------------------------------------------------------------

import type { ChainState } from "./state";
import type { Block } from "./block";
import type { FeatureFlags } from "../params/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "../params/feature-flags";
import type { EmissionBreakdown } from "../emissions/model";
import { computeEmissionForHeight } from "../emissions/model";
import {
  runSplitShadowHook,
  type SplitHookContext,
  type SplitHookEnv
} from "./split-shadow-hook";

export interface ConsensusConfig {
  readonly flags?: FeatureFlags;
}

export interface ConsensusEnv {
  readonly flags: FeatureFlags;
}

export interface ApplyBlockOptions<LState> {
  // Wall-clock timestamp at the time of validation (for future use with
  // difficulty/timestamp checks). Currently unused.
  readonly nowSec?: number;

  // Caller-supplied ledger transition function. If omitted, the ledger is
  // treated as inert and carried forward unchanged.
  readonly applyLedgerFn?: (prevLedger: LState, block: Block) => LState;
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

/**
 * Construct a ConsensusEnv from a partial config, defaulting missing fields.
 */
export function makeConsensusEnv(cfg?: ConsensusConfig): ConsensusEnv {
  return {
    flags: cfg?.flags ?? DEFAULT_FEATURE_FLAGS
  };
}

/**
 * Apply a single block to the chain in a pure, functional style.
 *
 * This function performs only basic v0 checks:
 *   • parentHash linkage,
 *   • monotonic height progression.
 *
 * Emission is computed via computeEmissionForHeight(height).
 * The split engine is run in SHADOW MODE only; its decisions are returned in
 * splitShadowInfo but are not applied to balances or supply.
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

  // v0: no timestamp or difficulty enforcement yet. Those will be wired in
  // using the 041–046 difficulty governor once all pieces are in place.

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
    thePerEuPrice: null // v0: no oracle wiring yet
  };

  const splitResult = runSplitShadowHook(
    hookEnv,
    hookCtx,
    prevState.splitEngineState
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
    splitEngineState: splitResult.nextEngineState
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
