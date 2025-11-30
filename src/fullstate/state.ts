// TARGET: chain src/fullstate/state.ts
// src/fullstate/state.ts
// ---------------------------------------------------------------------------
// Pack 41 — FullLedgerStateV1 (L1 machine-state aggregator)
// ---------------------------------------------------------------------------
//
// This module defines a small orchestration layer that merges the existing
// ledger ChainState (accounts + vaults) with the EuRegistry into a single
// "FullLedgerStateV1".
//
// It does **not** change how the underlying ledger or EU modules work. It is
// a thin, strongly-typed wrapper that gives consensus / sims / tools one
// place to look when they need the full L1 economic view.
//
// Later packs (applyBlock wiring, replay harness, etc.) will thread this
// through ConsensusState, but Pack 41 is intentionally minimal: it focuses on
// clean structure, not new behavior.
// ---------------------------------------------------------------------------

import type { ChainState as LedgerChainState } from "../ledger/state";
import { createEmptyChainState } from "../ledger/state";
import type { EuRegistry } from "../ledger/eu";
import { createEmptyEuRegistry } from "../ledger/eu";

export interface FullLedgerStateV1 {
  readonly chain: LedgerChainState;
  readonly euRegistry: EuRegistry;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function createEmptyFullLedgerStateV1(): FullLedgerStateV1 {
  return {
    chain: createEmptyChainState(),
    euRegistry: createEmptyEuRegistry()
  };
}

// ---------------------------------------------------------------------------
// Cloning
// ---------------------------------------------------------------------------
//
// For now we keep cloning shallow-but-safe by copying all Map instances.
// This is sufficient for sims and non-critical tooling. If/when we add more
// nested structures, we can tighten this further or introduce snapshot
// helpers.
// ---------------------------------------------------------------------------

export function cloneFullLedgerStateV1(state: FullLedgerStateV1): FullLedgerStateV1 {
  const chain: LedgerChainState = {
    height: state.chain.height,
    lastBlockHash: state.chain.lastBlockHash,
    accounts: new Map(state.chain.accounts),
    vaults: new Map(state.chain.vaults)
  };

  const euRegistry: EuRegistry = {
    byId: new Map(state.euRegistry.byId),
    byOwner: new Map(state.euRegistry.byOwner)
  };

  return { chain, euRegistry };
}
