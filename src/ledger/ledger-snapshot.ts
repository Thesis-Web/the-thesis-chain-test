// TARGET: chain src/ledger/ledger-snapshot.ts
// src/ledger/ledger-snapshot.ts
// ---------------------------------------------------------------------------
// Pack 35 — Snapshot adapter from ChainState → LedgerSnapshot
// ---------------------------------------------------------------------------
//
// This module provides a thin adapter that turns the in-memory ChainState
// (accounts + vaults) into the neutral LedgerSnapshot shape defined in
// src/ledger/ledger-delta.ts.
//
// For now there is no on-chain EU registry wired into ChainState, so we
// simply expose an empty euCerts map. Later, when EuRegistry is threaded
// through ChainState, a corresponding adapter can be added.
// ---------------------------------------------------------------------------

import type { ChainState, AccountState } from "./state";
import type { Vault } from "./vault";
import type {
  LedgerSnapshot,
  AccountSnapshot,
  VaultSnapshot
} from "./ledger-delta";

export function snapshotFromChainState(state: ChainState): LedgerSnapshot {
  const accounts = new Map<string, AccountSnapshot>();
  const vaults = new Map<string, VaultSnapshot>();
  const euCerts = new Map<string, never>(); // placeholder for future EuRegistry wiring

  for (const [addr, acct] of state.accounts.entries()) {
    const a: AccountState = acct;
    accounts.set(addr, {
      THE: a.balanceTHE,
      EU: 0n,
      nonce: 0
    });
  }

  for (const [vaultId, vault] of state.vaults.entries()) {
    const v = vault as Vault;
    vaults.set(vaultId, {
      THE: v.balanceTHE
    });
  }

  return {
    accounts,
    vaults,
    euCerts
  };
}
