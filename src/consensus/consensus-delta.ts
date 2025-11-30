// TARGET: chain src/consensus/consensus-delta.ts
// src/consensus/consensus-delta.ts
// ---------------------------------------------------------------------------
// Pack 30 + 36 — ConsensusDelta helper with optional LedgerDelta bridge
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
//
// Pack 36 extends the view with an optional LedgerDelta, derived in a
// best-effort way from the consensus-level ledger snapshots when they
// follow the canonical L1 ledger shape (accounts + vaults maps).
// ---------------------------------------------------------------------------

import type { Block } from "./block";
import type { ChainState } from "./state";
import type { DifficultyState } from "./difficulty-governor";
import type { SplitEngineState } from "../splits/split-orchestrator";
import type { SplitEvent, SplitEventLog } from "./split-events";
import type { EmissionBreakdown } from "../emissions/model";
import type { FeatureFlags } from "../params/feature-flags";
import type { LedgerDelta } from "../ledger/ledger-delta";
import {
  createEmptyLedgerDelta,
  recordAccountChange,
  recordVaultChange,
} from "../ledger/ledger-delta";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ConsensusDeltaInput<LState> {
  readonly prevState: ChainState<LState>;
  readonly nextState: ChainState<LState>;
  readonly block: Block;
  readonly emission: EmissionBreakdown;
  readonly flags: FeatureFlags;
}

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

  // Optional ledger delta view (Pack 36 bridge).
  // This is only populated when the underlying ledger snapshots follow the
  // canonical L1 ledger shape (accounts + vaults maps). For other ledger
  // types, this will be undefined.
  readonly ledgerDelta?: LedgerDelta;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function deriveSplitEvent<LState>(
  prevState: ChainState<LState>,
  nextState: ChainState<LState>
): SplitEvent | null {
  const prevLog =
    ((prevState as unknown as { splitEvents?: SplitEventLog }).splitEvents ??
      []) as SplitEventLog;
  const nextLog =
    ((nextState as unknown as { splitEvents?: SplitEventLog }).splitEvents ??
      []) as SplitEventLog;

  if (nextLog.length > prevLog.length) {
    return nextLog[nextLog.length - 1] ?? null;
  }
  return null;
}

/**
 * Best-effort derivation of a LedgerDelta from generic ledger snapshots.
 *
 * This intentionally performs only a shallow, shape-based inspection of the
 * ledger. When the ledger matches the canonical L1 form:
 *
 *   { accounts: Map<string, { balanceTHE: bigint; ... }>,
 *     vaults:   Map<string, VaultLike> }
 *
 * …we compute account + vault deltas. EU certificate deltas are left for
 * later packs once the EU registry is fully integrated.
 */
function deriveLedgerDeltaFromLedgerStateAny(
  prevLedger: unknown,
  nextLedger: unknown
): LedgerDelta | undefined {
  if (!prevLedger || !nextLedger) return undefined;

  const before: any = prevLedger;
  const after: any = nextLedger;

  const hasAccounts =
    before.accounts instanceof Map && after.accounts instanceof Map;
  const hasVaults =
    before.vaults instanceof Map && after.vaults instanceof Map;

  if (!hasAccounts && !hasVaults) {
    return undefined;
  }

  const delta = createEmptyLedgerDelta();

  if (hasAccounts) {
    const allAddrs = new Set<string>();
    for (const addr of before.accounts.keys()) allAddrs.add(addr);
    for (const addr of after.accounts.keys()) allAddrs.add(addr);

    for (const addr of allAddrs) {
      const bAcct = before.accounts.get(addr) as
        | { balanceTHE: bigint; balanceEU?: bigint; nonce?: number }
        | undefined;
      const aAcct = after.accounts.get(addr) as
        | { balanceTHE: bigint; balanceEU?: bigint; nonce?: number }
        | undefined;

      const beforeSnap =
        bAcct != null
          ? {
              balanceTHE: bAcct.balanceTHE,
              balanceEU: bAcct.balanceEU,
              nonce: bAcct.nonce,
            }
          : null;

      const afterSnap =
        aAcct != null
          ? {
              balanceTHE: aAcct.balanceTHE,
              balanceEU: aAcct.balanceEU,
              nonce: aAcct.nonce,
            }
          : null;

      if (beforeSnap !== null || afterSnap !== null) {
        recordAccountChange(delta, addr, beforeSnap, afterSnap);
      }
    }
  }

  if (hasVaults) {
    const allVaultIds = new Set<string>();
    for (const id of before.vaults.keys()) allVaultIds.add(id);
    for (const id of after.vaults.keys()) allVaultIds.add(id);

    for (const id of allVaultIds) {
      const bVault = before.vaults.get(id) ?? null;
      const aVault = after.vaults.get(id) ?? null;
      if (bVault !== null || aVault !== null) {
        recordVaultChange(delta, id, bVault, aVault);
      }
    }
  }

  return delta;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

  const splitEvent = deriveSplitEvent(prevState, nextState);

  // Best-effort ledger delta bridge (Pack 36).
  const ledgerDelta = deriveLedgerDeltaFromLedgerStateAny(
    (prevState as any).ledger,
    (nextState as any).ledger
  );

  return {
    height: block.header.height,
    blockHash: block.hash,
    parentHash: block.header.parentHash ?? null,
    timestampSec: block.header.timestampSec,

    emission,

    difficultyBefore: prevState.difficulty,
    difficultyAfter: nextState.difficulty,

    splitEngineBefore: prevState.splitEngineState,
    splitEngineAfter: nextState.splitEngineState,
    splitEvent,

    powEnforced: flags.powEnforcement,
    ledgerDelta,
  };
}
