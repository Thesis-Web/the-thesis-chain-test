// TARGET: chain src/consensus/tx/tx-types.ts
// src/consensus/tx/tx-types.ts
// ---------------------------------------------------------------------------
// Pack 15.2 — THE-specific transaction graph (typed, consensus-side)
// ---------------------------------------------------------------------------
//
// This module defines the minimal THE transaction set used by the consensus
// layer. At this stage, we are *not* committing to a full VM semantics yet;
// the goal is to:
//   - make txs structurally typed instead of `unknown`
//   - give apply-block-ledger a well-defined tx surface
//   - keep value-transfer / EU / split / reward operations explicit
//
// Actual ledger mutation rules can evolve in later packs without changing the
// wire-level tx shape defined here.
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../../types/primitives";
import type { VaultId } from "../../ledger/vault";
import type { EuCertificateId } from "../../ledger/eu";

// ---------------------------------------------------------------------------
// Core THE transaction types
// ---------------------------------------------------------------------------

/**
 * Simple THE transfer between two ledger accounts.
 */
export interface TxTransferTHE {
  readonly txType: "TRANSFER_THE";
  readonly from: Address;
  readonly to: Address;
  readonly amountTHE: Amount;
}

/**
 * Mint a new EU certificate backed by a specific vault.
 *
 * The actual vault funding / redemption semantics are enforced by higher-level
 * ledger rules; this tx only encodes the intent and identifiers.
 */
export interface TxMintEU {
  readonly txType: "MINT_EU";
  readonly owner: Address;
  readonly euId: EuCertificateId;
  readonly backingVaultId: VaultId;
}

/**
 * Redeem an existing EU certificate.
 */
export interface TxRedeemEU {
  readonly txType: "REDEEM_EU";
  readonly euId: EuCertificateId;
}

/**
 * Split award bookkeeping tx.
 *
 * This represents a deterministic upward split event being applied to balances.
 * In early packs this may be a no-op placeholder that is validated only.
 */
export interface TxAwardSplit {
  readonly txType: "SPLIT_AWARD";
  readonly factor: bigint;
}

/**
 * Internal reward crediting (e.g. miner / pool payouts) expressed explicitly
 * as a tx so that all balance movements are observable in the tx stream.
 */
export interface TxInternalReward {
  readonly txType: "INTERNAL_REWARD";
  readonly miner: Address;
  readonly amountTHE: Amount;
}

// ---------------------------------------------------------------------------
// Aggregate THE tx union
// ---------------------------------------------------------------------------

export type TheTx =
  | TxTransferTHE
  | TxMintEU
  | TxRedeemEU
  | TxAwardSplit
  | TxInternalReward;
