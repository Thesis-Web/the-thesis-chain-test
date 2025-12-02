// TARGET: chain src/fullstate/delta.ts
// src/fullstate/delta.ts
// ---------------------------------------------------------------------------
// Pack 41 + 44 — FullLedgerDeltaV1 (composed view + SplitEngine summary)
// ---------------------------------------------------------------------------
//
// This module does not introduce new mutation rules. Instead, it provides a
// *composed* delta view that groups the existing per-layer deltas:
//   • LedgerDelta      — accounts / vaults / euCerts (neutral ledger view)
//   • VaultDelta       — full vault semantics (id, owner, kind, notes, ...)
//   • EuRegistryDelta  — certificate registry evolution
//
// Pack 44 extends this with a lightweight SplitEngine summary:
//   • SplitEventSummary — single-block upward split description
//
// Consensus / tooling can use this as a single inspection surface without
// changing how individual modules work. Block application wiring will happen
// in applyBlock + higher-level sims.
// ---------------------------------------------------------------------------

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";
import type { BackWallEventSummary } from "../ledger/back-wall";

// ---------------------------------------------------------------------------
// Split engine summary
// ---------------------------------------------------------------------------
//
// This is intentionally small and mirrors the shape emitted by the existing
// split sims (chain-split-log-sim-ramp.ts). It is *not* a full engine state;
// it is a per-block event summary suitable for deltas, logs, and invariants.
// ---------------------------------------------------------------------------

export interface SplitEventSummary {
  readonly height: number;
  readonly factor: bigint;
  readonly cumulativeFactor: bigint;
  readonly euPerThePrice: number;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Composed delta
// ---------------------------------------------------------------------------

export interface FullLedgerDeltaV1 {
  readonly ledger: LedgerDelta;
  readonly vaults: VaultDelta;
  readonly eu: EuRegistryDelta;
  readonly splitEvent?: SplitEventSummary | null;

  /**
   * Optional back-wall inspection summary for this block.
   * Present when consensus has run the Back-Wall check for the block.
   */
  readonly backWallEvent?: BackWallEventSummary | null;
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

export function printFullLedgerDeltaV1(delta: FullLedgerDeltaV1): void {
  console.log("=== FullLedgerDeltaV1 ===");
  console.log(
    `  ledger: accounts=${delta.ledger.accounts.size}, ` +
      `vaults=${delta.ledger.vaults.size}, ` +
      `euCerts=${delta.ledger.euCerts.size}`
  );
  console.log(`  vaultDelta.vaults=${delta.vaults.vaults.size}`);
  console.log(`  euDelta.certs=${delta.eu.certs.size}`);

  if (delta.splitEvent) {
    const e = delta.splitEvent;
    console.log(
      `  splitEvent: height=${e.height}, factor=${e.factor}, ` +
        `cumulativeFactor=${e.cumulativeFactor}, ` +
        `euPerThePrice=${e.euPerThePrice}, reason=${e.reason}`
    );
  } else {
    console.log("  splitEvent: none");
  }

  if (delta.backWallEvent) {
    const b = delta.backWallEvent;
    console.log(
      `  backWallEvent: height=${b.height}, kind=${b.kind}, ` +
        `totalThe=${b.totalThe}, totalAccountThe=${b.totalAccountThe}, ` +
        `totalVaultThe=${b.totalVaultThe}`
    );
  } else {
    console.log("  backWallEvent: none");
  }
}
