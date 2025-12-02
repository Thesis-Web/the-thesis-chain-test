// TARGET: chain src/ledger/back-wall.ts
// src/ledger/back-wall.ts
// ---------------------------------------------------------------------------
// Pack 48 — Back-Wall Ledger Framework (monitor-mode scaffolding)
// ---------------------------------------------------------------------------
//
// This module provides a minimal, ledger-local "back-wall" inspection surface.
// It does **not** implement BoT policy or external price/oracle logic.
//
// Goals in Pack 48:
//   • Aggregate basic THE supply metrics from the L1 ledger view.
//   • Classify each block into a small set of BackWallEventKind values.
//   • Keep semantics conservative and monitor-oriented so later packs can
//     wire in real floors and BoT reactions without rewrites.
//
// This is intentionally simple and forward-compatible: later packs can
// extend BackWallGuards and BackWallEventSummary if the blueprint adds
// more structure to the back-wall definitions.
// ---------------------------------------------------------------------------

import type { Amount } from "../types/primitives";
import type { ChainState as LedgerChainState, AccountState } from "./state";
import type { Vault } from "./vault";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * BackWallGuards — tunable thresholds for "soft" and "hard" floors.
 *
 * Pack 48 keeps this deliberately minimal: just total on-ledger THE.
 * Later packs may extend this with EU-aware or BoT-aware dimensions.
 */
export interface BackWallGuards {
  readonly hardFloorTotalThe: Amount;
  readonly softFloorTotalThe: Amount;
}

/**
 * BackWallEventKind — coarse classification of back-wall status.
 *
 *  • "OK"              — comfortably above soft floor
 *  • "SOFT_FLOOR_WARN" — below soft floor but above hard floor
 *  • "HARD_FLOOR_BREACH" — below hard floor
 */
export type BackWallEventKind = "OK" | "SOFT_FLOOR_WARN" | "HARD_FLOOR_BREACH";

/**
 * BackWallEventSummary — per-block back-wall inspection result.
 *
 * This attaches to FullLedgerDeltaV1 so sims and auditors can see the
 * back-wall status alongside normal ledger deltas.
 */
export interface BackWallEventSummary {
  readonly height: number;

  readonly totalAccountThe: Amount;
  readonly totalVaultThe: Amount;
  readonly totalThe: Amount;

  readonly kind: BackWallEventKind;
}

/**
 * DEFAULT_BACK_WALL_GUARDS
 *
 * In Pack 48 we keep floors at 0n so the system is effectively in pure
 * monitoring mode. Later packs will raise these based on blueprint math.
 */
export const DEFAULT_BACK_WALL_GUARDS: BackWallGuards = {
  hardFloorTotalThe: 0n,
  softFloorTotalThe: 0n
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumAccountBalances(accounts: ReadonlyMap<string, AccountState>): Amount {
  let total: Amount = 0n;
  for (const acct of accounts.values()) {
    total += acct.balanceTHE;
  }
  return total;
}

function sumVaultBalances(vaults: ReadonlyMap<string, Vault>): Amount {
  let total: Amount = 0n;
  for (const v of vaults.values()) {
    total += v.balanceTHE;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * checkBackWall
 *
 * Compute a BackWallEventSummary given the current ledger ChainState and a
 * set of BackWallGuards. This is **pure inspection**: it does not mutate
 * ChainState or interact with external systems.
 */
export function checkBackWall(
  chain: LedgerChainState,
  guards: BackWallGuards
): BackWallEventSummary {
  const totalAccountThe = sumAccountBalances(chain.accounts as ReadonlyMap<string, AccountState>);
  const totalVaultThe = sumVaultBalances(chain.vaults as ReadonlyMap<string, Vault>);
  const totalThe = (totalAccountThe ?? 0n) + (totalVaultThe ?? 0n);

  let kind: BackWallEventKind = "OK";

  if (guards.hardFloorTotalThe > 0n && totalThe < guards.hardFloorTotalThe) {
    kind = "HARD_FLOOR_BREACH";
  } else if (guards.softFloorTotalThe > 0n && totalThe < guards.softFloorTotalThe) {
    kind = "SOFT_FLOOR_WARN";
  }

  return {
    height: chain.height,
    totalAccountThe,
    totalVaultThe,
    totalThe,
    kind
  };
}
