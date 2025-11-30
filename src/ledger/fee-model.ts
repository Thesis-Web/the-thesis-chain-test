// TARGET: chain src/ledger/fee-model.ts
// src/ledger/fee-model.ts
// Pack 39 — Neutral Fee Model (L1)
//
// Pure fee computation; no ledger or consensus writes here.

import type { Amount } from "../types/primitives";

export interface TxLike {
  sender: string;
  sizeBytes: number;
}

export const BASE_FEE: Amount = 1n;
export const PER_BYTE_FEE: Amount = 0n; // adjustable

export function computeTxFee(tx: TxLike): Amount {
  return BASE_FEE + BigInt(tx.sizeBytes) * PER_BYTE_FEE;
}
