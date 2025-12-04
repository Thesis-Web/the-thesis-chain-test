// TARGET: chain src/consensus/tx/tx-dispatcher.ts
// src/consensus/tx/tx-dispatcher.ts
// ---------------------------------------------------------------------------
// Pack 22.x — THE/EU VM wiring (consensus-side)
// ---------------------------------------------------------------------------
//
// Single entry point:
//
//   applyBlockTx(prevLedger, tx) => nextLedger
//
// Behaviour:
//
//   • If `prevLedger` is a FullLedgerStateV1 (consensus canonical shape):
//       - TRANSFER_THE  → debit/credit accounts on ledger.chain.accounts
//       - VAULT_CREATE  → create an empty vault in ledger.chain.vaults
//       - VAULT_DEPOSIT → increase vault.balanceTHE
//       - VAULT_WITHDRAW→ decrease vault.balanceTHE
//       - MINT_EU       → register EuCertificate in ledger.euCertRegistry
//       - REDEEM_EU     → mark EuCertificate as REDEEMED
//       - SPLIT_AWARD / INTERNAL_REWARD → explicit no-ops for now
//
//   • For non-FullLedgerStateV1 ledgers (generic sims / legacy callers):
//       - Validate txType is known and return the ledger unchanged.
//
// All mutations are **in-place** on the supplied FullLedgerStateV1. This is
// intentional for sims and consensus: the ledger object flows through the
// chain and evolves, rather than allocating a fresh object each time.
// ---------------------------------------------------------------------------

import type {
  TheTx,
  TxMintEU,
  TxRedeemEU,
  TxVaultCreate,
  TxVaultDeposit,
  TxVaultWithdraw
} from "./tx-types";
import type { FullLedgerStateV1 } from "../ledger-state";
import { creditAccount, debitAccount } from "../../ledger/state";
import {
  createVault,
  depositToVault,
  withdrawFromVault
} from "../../ledger/vault";
import {
  registerEuCertificate,
  markEuRedeemed,
  type EuCertificate,
  type EuCertificateId
} from "../../ledger/eu";

// ---------------------------------------------------------------------------
// Runtime type guard for FullLedgerStateV1
// ---------------------------------------------------------------------------

function isFullLedgerStateV1(value: unknown): value is FullLedgerStateV1 {
  if (!value || typeof value !== "object") return false;

  const candidate = value as any;
  const { chain, euCertRegistry } = candidate;

  // Basic chain shape checks.
  if (!chain || typeof chain !== "object") return false;
  if (!(chain.accounts instanceof Map)) return false;
  if (!(chain.vaults instanceof Map)) return false;

  // EU certificate registry shape checks.
  if (!euCertRegistry || typeof euCertRegistry !== "object") return false;
  if (!(euCertRegistry.byId instanceof Map)) return false;
  if (!(euCertRegistry.byOwner instanceof Map)) return false;

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

      // Mutate underlying chain accounts in-place.
      debitAccount(ledger.chain, from, amountTHE);
      creditAccount(ledger.chain, to, amountTHE);
      return ledger;
    }

    case "VAULT_CREATE": {
      const { vaultId, owner } = tx as TxVaultCreate;
      createVault(ledger.chain.vaults, vaultId, owner);
      return ledger;
    }

    case "VAULT_DEPOSIT": {
      const { vaultId, amountTHE } = tx as TxVaultDeposit;
      if (amountTHE <= 0n) {
        throw new Error("VAULT_DEPOSIT: amountTHE must be positive");
      }
      depositToVault(ledger.chain.vaults, vaultId, amountTHE);
      return ledger;
    }

    case "VAULT_WITHDRAW": {
      const { vaultId, amountTHE } = tx as TxVaultWithdraw;
      if (amountTHE <= 0n) {
        throw new Error("VAULT_WITHDRAW: amountTHE must be positive");
      }
      withdrawFromVault(ledger.chain.vaults, vaultId, amountTHE);
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

      registerEuCertificate(ledger.chain, ledger.euCertRegistry, cert);
      return ledger;
    }

    case "REDEEM_EU": {
      const { euCertificateId } = tx as TxRedeemEU;
      const id: EuCertificateId = euCertificateId;

      markEuRedeemed(ledger.euCertRegistry, id);
      return ledger;
    }

    case "SPLIT_AWARD":
    case "INTERNAL_REWARD":
      // Future packs will wire these; for now they are explicit no-ops on the
      // concrete ledger type.
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
 *   - `LState` is kept generic so different sims / environments can plug in
 *     their own concrete ledger representations.
 *   - If the ledger is a FullLedgerStateV1 we route through the concrete VM
 *     above; otherwise we behave as a structural no-op (Pack 15.2 behaviour).
 */
export function applyBlockTx<LState>(prevLedger: LState, tx: TheTx): LState {
  if (isFullLedgerStateV1(prevLedger)) {
    const next = applyBlockTxFullLedger(prevLedger, tx);
    return next as unknown as LState;
  }

  // Fallback behaviour for non-FullLedgerStateV1 ledgers:
  // keep Pack 15.2 semantics (validate txType, return ledger unchanged).
  switch (tx.txType) {
    case "TRANSFER_THE":
    case "MINT_EU":
    case "REDEEM_EU":
    case "VAULT_CREATE":
    case "VAULT_DEPOSIT":
    case "VAULT_WITHDRAW":
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
