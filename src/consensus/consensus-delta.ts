// TARGET: chain src/consensus/consensus-delta.ts
// src/consensus/consensus-delta.ts
// ---------------------------------------------------------------------------
// Pack 30 + 36 + 37 — ConsensusDelta helper with LedgerDelta + EuRegistryDelta
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
//   • It is SAFE to recompute in sims, tools, explorers.
//
// Pack 36: adds an optional LedgerDelta bridge derived from the consensus
//          ledger snapshots when they follow the canonical L1 shape.
// Pack 37: adds an optional EuRegistryDelta bridge when the ledger exposes
//          a EuRegistry (e.g. FullLedgerStateV1.eu).
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

import type { EuRegistryDelta } from "../ledger/eu-registry-delta";
import {
  makeEuRegistrySnapshot,
  computeEuRegistryDelta,
} from "../ledger/eu-registry-delta";

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
  readonly ledgerDelta?: LedgerDelta;

  // Optional EU registry delta view (Pack 37 bridge).
  readonly euRegistryDelta?: EuRegistryDelta;
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

// Helper to extract the accounts/vaults pair from a generic ledger state.
// This supports both:
//   • legacy ledger states with { accounts, vaults }
//   • FullLedgerStateV1-style states with { chain: { accounts, vaults }, eu: ... }
function extractAccountsAndVaults(
  ledger: unknown
): {
  accounts?: Map<string, any>;
  vaults?: Map<string, any>;
} {
  if (!ledger) return {};

  const root: any = ledger as any;

  if (root.accounts instanceof Map || root.vaults instanceof Map) {
    return {
      accounts: root.accounts instanceof Map ? root.accounts : undefined,
      vaults: root.vaults instanceof Map ? root.vaults : undefined,
    };
  }

  const chain = root.chain;
  if (chain && (chain.accounts instanceof Map || chain.vaults instanceof Map)) {
    return {
      accounts: chain.accounts instanceof Map ? chain.accounts : undefined,
      vaults: chain.vaults instanceof Map ? chain.vaults : undefined,
    };
  }

  return {};
}

/**
 * Best-effort derivation of a LedgerDelta from generic ledger snapshots.
 *
 * When the underlying ledger exposes accounts + vaults in the canonical
 * L1 shape, we compute account + vault deltas. EU certificate deltas are
 * handled by the dedicated EuRegistryDelta bridge (Pack 37).
 */
function deriveLedgerDeltaFromLedgerStateAny(
  prevLedger: unknown,
  nextLedger: unknown
): LedgerDelta | undefined {
  const { accounts: beforeAccounts, vaults: beforeVaults } =
    extractAccountsAndVaults(prevLedger);
  const { accounts: afterAccounts, vaults: afterVaults } =
    extractAccountsAndVaults(nextLedger);

  if (!beforeAccounts && !beforeVaults) return undefined;
  if (!afterAccounts && !afterVaults) return undefined;

  const delta = createEmptyLedgerDelta();

  if (beforeAccounts && afterAccounts) {
    const allAddrs = new Set<string>();
    for (const addr of beforeAccounts.keys()) allAddrs.add(addr);
    for (const addr of afterAccounts.keys()) allAddrs.add(addr);

    for (const addr of allAddrs) {
      const bAcct = beforeAccounts.get(addr) as
        | { balanceTHE: bigint; balanceEU?: bigint; nonce?: number }
        | undefined;
      const aAcct = afterAccounts.get(addr) as
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

  if (beforeVaults && afterVaults) {
    const allVaultIds = new Set<string>();
    for (const id of beforeVaults.keys()) allVaultIds.add(id);
    for (const id of afterVaults.keys()) allVaultIds.add(id);

    for (const id of allVaultIds) {
      const bVault = beforeVaults.get(id) ?? null;
      const aVault = afterVaults.get(id) ?? null;
      if (bVault !== null || aVault !== null) {
        recordVaultChange(delta, id, bVault, aVault);
      }
    }
  }

  return delta;
}

/**
 * Best-effort derivation of a EuRegistryDelta from generic ledger snapshots.
 *
 * This looks for a EuRegistry-shaped object hanging off the ledger, using the
 * most common naming patterns:
 *
 *   • FullLedgerStateV1.eu
 *   • ledger.euRegistry
 *
 * If no such registry is found, or there are no differences, this returns
 * undefined.
 */
function deriveEuRegistryDeltaFromLedgerStateAny(
  prevLedger: unknown,
  nextLedger: unknown
): EuRegistryDelta | undefined {
  if (!prevLedger || !nextLedger) return undefined;

  const beforeAny: any = prevLedger as any;
  const afterAny: any = nextLedger as any;

  const beforeEu =
    beforeAny.eu ?? beforeAny.euRegistry ?? undefined;
  const afterEu =
    afterAny.eu ?? afterAny.euRegistry ?? undefined;

  if (!beforeEu || !afterEu) return undefined;
  if (!(beforeEu.byId instanceof Map) || !(afterEu.byId instanceof Map)) {
    return undefined;
  }

  const snapBefore = makeEuRegistrySnapshot(beforeEu);
  const snapAfter = makeEuRegistrySnapshot(afterEu);
  const delta = computeEuRegistryDelta(snapBefore, snapAfter);

  if (delta.certs.size === 0) {
    return undefined;
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

  // Best-effort ledger + EU registry delta bridges.
  const ledgerDelta = deriveLedgerDeltaFromLedgerStateAny(
    prevState.ledger,
    nextState.ledger
  );

  const euRegistryDelta = deriveEuRegistryDeltaFromLedgerStateAny(
    prevState.ledger,
    nextState.ledger
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
    euRegistryDelta,
  };
}
