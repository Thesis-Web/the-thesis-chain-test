// TARGET: chain src/consensus/tx/tx-dispatcher.ts

// Pack 15.1 — Ledger transition dispatcher (stub)
import { TheTx } from "./tx-types";

export function applyBlockTx(prevLedger: any, tx: TheTx) {
  switch (tx.txType) {
    case "TRANSFER_THE":
      return prevLedger;
    case "MINT_EU":
      return prevLedger;
    case "REDEEM_EU":
      return prevLedger;
    case "SPLIT_AWARD":
      return prevLedger;
    case "INTERNAL_REWARD":
      return prevLedger;
    default:
      throw new Error("unknown tx");
  }
}
