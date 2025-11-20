import type { Address, Amount, Hash, Height, UnixTimeSeconds } from "../types/primitives.js";

// L1 block header — energy & emissions ledger.
// §030 — Ledger Architecture, §040 — Mining & Rewards.
export interface BlockHeader {
  readonly height: Height;
  readonly timestamp: UnixTimeSeconds;
  readonly prevHash: Hash;

  readonly stateRoot: Hash;       // global state commitment (accounts, vaults, etc.)
  readonly txRoot: Hash;          // Merkle root of txs in this block

  readonly miner: Address;        // coinbase recipient (L1 energy miner)
  readonly vrfCommit: Hash;       // VRF commit for epoch lottery (PoFTL)
}

// Very simple transaction model for v1 implementation.
// We'll extend this with more specific "kinds" as we wire §040/§065/§075/§080.
export type TxKind =
  | "TRANSFER"        // basic value transfer
  | "VAULT_OP"        // EU certificate / vault operations
  | "BOT_OP"          // BoT treasury / bank operations
  | "PARAM_UPDATE"    // governance / param registry updates
  | "ANCHOR_L2"       // rollup / anchor from L2
  | "ANCHOR_L3";      // rollup / anchor from L3

export interface Transaction {
  readonly hash: Hash;
  readonly from: Address;
  readonly to: Address | null;      // some ops (e.g., PARAM_UPDATE) may not have a direct 'to'
  readonly kind: TxKind;
  readonly amount: Amount;          // THE or EU, depending on kind + sub-type
  readonly nonce: bigint;           // per-address monotonic counter
  readonly data?: unknown;          // opaque payload; interpreted by VM / execution layer
}

// Fully-formed block, including header and ordered transactions.
export interface Block {
  readonly header: BlockHeader;
  readonly txs: readonly Transaction[];
}

