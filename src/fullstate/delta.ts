// TARGET: chain src/fullstate/delta.ts
// src/fullstate/delta.ts
// ---------------------------------------------------------------------------
// Pack 41 — FullLedgerDeltaV1 (composed view)
// ---------------------------------------------------------------------------
//
// This module does not introduce new mutation rules. Instead, it provides a
// *composed* delta view that groups the existing per-layer deltas:
//   • LedgerDelta      — accounts / vaults / euCerts (neutral ledger view)
//   • VaultDelta       — full vault semantics (id, owner, kind, notes, ...)
//   • EuRegistryDelta  — certificate registry evolution
//
// Consensus / tooling can use this as a single inspection surface without
// changing how individual modules work. Block application wiring will happen
// in later packs.
// ---------------------------------------------------------------------------

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";

export interface FullLedgerDeltaV1 {
  readonly ledger: LedgerDelta;
  readonly vaults: VaultDelta;
  readonly eu: EuRegistryDelta;
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
}
