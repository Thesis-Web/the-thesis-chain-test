import type { Address, Amount, Hash, Height, UnixTimeSeconds } from "../types/primitives.js";

// ---------------------------------------------------------------------------
// BLOCK HEADER
// ---------------------------------------------------------------------------

export interface BlockHeader {
  readonly height: Height;
  readonly timestamp: UnixTimeSeconds;
  readonly prevHash: Hash;

  // Global state root commitment (conceptual; no trie yet)
  readonly stateRoot: Hash;

  // Merkle root of the block's ordered transactions (conceptual)
  readonly txRoot: Hash;

  // L1 miner address (recipient of block reward)
  readonly miner: Address;

  // VRF commitment for epoch lottery (PoFTL)
  readonly vrfCommit: Hash;
}

// ---------------------------------------------------------------------------
// TRANSACTION MODEL
// ---------------------------------------------------------------------------

// TX kinds come directly from Ledger spec:
// - TRANSFER         (040)
// - VAULT_OP         (065, 125)
// - BOT_OP           (075, 080, 200)
// - PARAM_UPDATE     (Appendix-B param registry)
// - ANCHOR_L2 / L3   (030 rollup integration)
export type TxKind =
  | "TRANSFER"
  | "VAULT_OP"
  | "BOT_OP"
  | "PARAM_UPDATE"
  | "ANCHOR_L2"
  | "ANCHOR_L3";

// Every TX shares this base structure.
export interface Transaction {
  readonly hash: Hash;

  readonly from: Address;
  readonly to: Address | null;    // Some TXs may not target an account

  readonly kind: TxKind;

  readonly amount: Amount;        // THE or EU depending on tx context

  readonly nonce: bigint;         // Monotonic per-address counter

  // Additional payload depending on TX kind
  readonly data?: unknown;
}

// ---------------------------------------------------------------------------
// BLOCK
// ---------------------------------------------------------------------------

export interface Block {
  readonly header: BlockHeader;
  readonly txs: readonly Transaction[];
}

// ---------------------------------------------------------------------------
// TRANSACTION INTERPRETER SKELETON
// ---------------------------------------------------------------------------

// These will be filled in one-by-one as we reach those modules.
// For now they do nothing except enforce type checking.

export interface TxResult {
  ok: boolean;
  error?: string;
}

export function executeTransfer(): TxResult {
  // TRANSFER logic: debit → credit
  // Implement after account model is fully locked.
  return { ok: true };
}

export function executeVaultOp(): TxResult {
  // VAULT_OP logic: EU cert, vault balance, split invariants
  return { ok: true };
}

export function executeBotOp(): TxResult {
  // Treasury operations, buybacks, NIP, EU redemptions
  return { ok: true };
}

export function executeParamUpdate(): TxResult {
  // Param registry modifications (Appendix-B)
  return { ok: true };
}

export function executeAnchor(): TxResult {
  // Rollup anchors for L2/L3
  return { ok: true };
}

// Central dispatcher — called from state.ts
export function dispatchTransaction(tx: Transaction): TxResult {
  switch (tx.kind) {
    case "TRANSFER":
      return executeTransfer();

    case "VAULT_OP":
      return executeVaultOp();

    case "BOT_OP":
      return executeBotOp();

    case "PARAM_UPDATE":
      return executeParamUpdate();

    case "ANCHOR_L2":
    case "ANCHOR_L3":
      return executeAnchor();
  }
}
