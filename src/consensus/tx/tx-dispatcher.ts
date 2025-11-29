// TARGET: chain src/consensus/tx/tx-dispatcher.ts
// src/consensus/tx/tx-dispatcher.ts
// ---------------------------------------------------------------------------
// Pack 22.1 — THE/EU VM wiring (consensus-side)
// ---------------------------------------------------------------------------
//
// This module provides a single entry point:
//
//   applyBlockTx(prevLedger, tx) => nextLedger
//
// In Pack 15.2 this was a structural no-op used only to validate tx shapes.
// Pack 17.0 introduced *real* value movement for TRANSFER_THE when the ledger
// matched the concrete FullLedgerStateV1 shape used by consensus.
//
// With Pack 22.x we extend the concrete VM to also handle:
//   - MINT_EU   → register a new EuCertificate in the EuRegistry.
//   - REDEEM_EU → mark an existing certificate as redeemed in the EuRegistry.
//
// Rules:
//   - If the ledger is a FullLedgerStateV1:
//       • TRANSFER_THE debits `from` and credits `to` on ledger.chain.accounts.
//       • MINT_EU registers a new EuCertificate bound to an existing vault.
//       • REDEEM_EU flips certificate status to REDEEMED in the EuRegistry.
//       • SPLIT_AWARD and INTERNAL_REWARD remain no-ops for now.
//   - For non-FullLedgerStateV1 ledgers, we keep the previous behavior:
//       • validate txType and return the ledger unchanged.
// ---------------------------------------------------------------------------

import type { TheTx, TxMintEU, TxRedeemEU } from "./tx-types";
import type { FullLedgerStateV1 } from "../ledger-state";
import { creditAccount, debitAccount } from "../../ledger/state";
import {
  registerEuCertificate,
  markEuRedeemed
} from "../../ledger/eu";
import type {
  EuCertificate,
  EuCertificateId
} from "../../ledger/eu";
import type { Address, Amount } from "../../types/primitives";

// ---------------------------------------------------------------------------
// Runtime type guard for FullLedgerStateV1
// ---------------------------------------------------------------------------

function isFullLedgerStateV1(value: unknown): value is FullLedgerStateV1 {
  if (!value || typeof value !== "object") return false;

  const candidate = value as FullLedgerStateV1;
  const { chain, eu } = candidate as any;

  if (!chain || typeof chain !== "object") return false;
  if (!(chain.accounts instanceof Map)) return false;
  if (!(chain.vaults instanceof Map)) return false;

  if (!eu || typeof eu !== "object") return false;
  if (!(eu.byId instanceof Map)) return false;
  if (!(eu.byOwner instanceof Map)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Internal helper: concrete VM for FullLedgerStateV1
// ---------------------------------------------------------------------------

function applyBlockTxFullLedger(
  ledger: FullLedgerStateV1,
  tx: TheTx
): FullLedgerStateV1 {
  switch (tx.txType) {
    case "TRANSFER_THE": {
      const { from, to, amountTHE } = tx;

      if (amountTHE <= 0n) {
        throw new Error("TRANSFER_THE: amountTHE must be positive");
      }

      // Mutate the underlying chain accounts in-place.
      debitAccount(ledger.chain, from, amountTHE);
      creditAccount(ledger.chain, to, amountTHE);
      return ledger;
    }

    case "MINT_EU": {
      const {
        owner,
        euCertificateId,
        backingVaultId,
        activatedByInstitutionId,
        physicalBearer,
        oracleValueEUAtIssuance,
        chainHashProof
      } = tx as TxMintEU;

      const cert: EuCertificate = {
        id: euCertificateId,
        owner,
        activatedByInstitutionId,
        physicalBearer,
        issuedAtHeight: ledger.chain.height,
        chainHashProof,
        oracleValueEUAtIssuance,
        backingVaultId,
        status: "ACTIVE"
      };

      registerEuCertificate(ledger.chain, ledger.eu, cert);
      return ledger;
    }

    case "REDEEM_EU": {
      const { euCertificateId } = tx as TxRedeemEU;
      const id: EuCertificateId = euCertificateId;

      markEuRedeemed(ledger.eu, id);
      return ledger;
    }

    case "SPLIT_AWARD":
    case "INTERNAL_REWARD":
      // Future packs will wire these, but for now they are explicit no-ops
      // on the concrete ledger type.
      return ledger;

    default: {
      throw new Error(
        `applyBlockTxFullLedger: unsupported txType ${(tx as any).txType}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Apply a single tx to the given ledger, returning the next ledger snapshot.
 *
 * NOTE:
 *   - `LState` is kept generic so that different sims / environments can
 *     plug in their own concrete ledger representation.
 *   - If the ledger is a FullLedgerStateV1 we route through the concrete VM
 *     above; otherwise we behave as a structural no-op (Pack 15.2 behavior).
 */
export function applyBlockTx<LState>(prevLedger: LState, tx: TheTx): LState {
  if (isFullLedgerStateV1(prevLedger)) {
    const next = applyBlockTxFullLedger(prevLedger, tx);
    return next as unknown as LState;
  }

  // Fallback behavior for non-FullLedgerStateV1 ledgers: keep Pack 15.2
  // semantics (validate txType, return ledger unchanged).
  switch (tx.txType) {
    case "TRANSFER_THE":
    case "MINT_EU":
    case "REDEEM_EU":
    case "SPLIT_AWARD":
    case "INTERNAL_REWARD":
      return prevLedger;

    default: {
      throw new Error(
        `applyBlockTx: unsupported txType ${(tx as any).txType}`
      );
    }
  }
}
