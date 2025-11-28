// TARGET: chain src/consensus/tx/ledger-stub.ts

// Pack 15.1 — Ledger stub (immutable pass-through)
export type LState = {
  accounts: Map<string, { balanceTHE: bigint }>
};

export function cloneLedger(l: LState): LState {
  return {
    accounts: new Map(l.accounts)
  };
}
