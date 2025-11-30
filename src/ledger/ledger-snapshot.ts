// TARGET: chain src/ledger/ledger-snapshot.ts
// Pack 34/35 – FullLedgerSnapshot generator

import type { ChainState } from "./state";

export interface FullLedgerSnapshot {
  accounts: Map<string, bigint>;
  vaults: Map<string, { owner: string; balanceTHE: bigint }>;
}

export function makeLedgerSnapshot(state: ChainState): FullLedgerSnapshot {
  const accounts = new Map<string, bigint>();
  const vaults = new Map<string, { owner: string; balanceTHE: bigint }>();

  for (const [addr, acct] of state.accounts.entries())
    accounts.set(addr, acct.balanceTHE);

  for (const [vid, v] of state.vaults.entries())
    vaults.set(vid, { owner: v.owner, balanceTHE: v.balanceTHE });

  return { accounts, vaults };
}
