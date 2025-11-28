// TARGET: chain src/consensus/ledger-state.ts
// src/consensus/ledger-state.ts
// ---------------------------------------------------------------------------
// FullLedgerStateV1 — canonical ledger state for consensus (v1)
// ---------------------------------------------------------------------------
//
// This module defines the concrete LState that the consensus engine will use.
// It composes the existing ledger ChainState (accounts + vaults) with the
// EuRegistry claim layer, without changing any of their internal shapes.
//
// Nothing in this file mutates global state. Constructors return fresh
// in-memory instances so sims and orchestrators can supply their own genesis
// snapshots when needed.
// ---------------------------------------------------------------------------

import type { ChainState as LedgerChainState } from "../ledger/state";
import { createEmptyChainState } from "../ledger/state";
import type { EuRegistry } from "../ledger/eu";
import { createEmptyEuRegistry } from "../ledger/eu";

// ---------------------------------------------------------------------------
// Canonical L1 ledger state for consensus v1
// ---------------------------------------------------------------------------

/**
 * FullLedgerStateV1 is the concrete LState used by the consensus engine.
 *
 *  - chain: the base ledger (accounts + vaults + height/hash metadata)
 *  - eu:    the EU certificate registry layered on top of vaults
 *
 * This type does not add new behavior; it simply packages the existing
 * ledger modules into a single object suitable for ChainState<LState>.
 */
export interface FullLedgerStateV1 {
  readonly chain: LedgerChainState;
  readonly eu: EuRegistry;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Construct an empty FullLedgerStateV1 suitable for genesis.
 *
 * Higher layers may replace this with a pre-populated snapshot (e.g. a
 * bootstrapped vault or pre-allocated balances) but this serves as the
 * minimal, neutral starting point for sims and dev tooling.
 */
export function makeEmptyFullLedgerStateV1(): FullLedgerStateV1 {
  return {
    chain: createEmptyChainState(),
    eu: createEmptyEuRegistry()
  };
}
