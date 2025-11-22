// src/ledger/block.ts
// ---------------------------------------------------------------------------
// Block types + application (THE v1 scaffold + Consensus v0)
// ---------------------------------------------------------------------------
//
// Responsibilities:
//   - Define PaymentTx + AnyTx
//   - Define BlockHeader / Block types
//   - Compute a deterministic SHA-256 block hash over the header
//   - Compute a Merkle bodyRoot over serialized txs
//   - Apply a block to ChainState (txs + rewards + metadata)
//   - Consensus v0 helpers:
//       * validateBlockHeader(state, block)
//       * applyBlockValidated(state, block)
// ---------------------------------------------------------------------------

import type { Address, Hash, Amount } from "../types/primitives";
import type { ChainState } from "./state";
import { creditAccount, debitAccount } from "./state";
import { applyBlockReward } from "../rewards/rewards";
import type {
  VaultCreateTx,
  VaultDepositTx,
  VaultWithdrawTx,
} from "./tx";
import { computeMerkleRoot } from "../merkle/merkle";
import { encodeString, encodeBigInt, encodeList } from "../serialization/rlp-lite";
import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// Transaction types (v1)
// ---------------------------------------------------------------------------

// Simple payment tx for the v1 sim.
export interface PaymentTx {
  readonly txType: "PAYMENT";
  readonly from: Address;
  readonly to: Address;
  readonly amount: Amount;
}

// Union of all tx types we currently support on L1.
export type AnyTx =
  | PaymentTx
  | VaultCreateTx
  | VaultDepositTx
  | VaultWithdrawTx;

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------

// Minimal block header.
export interface BlockHeader {
  height: number;
  prevHash: Hash | null;
  timestamp: number;
  miner: Address;

  // Merkle root of txs (RLP-lite leaves, SHA-256 tree).
  bodyRoot?: Hash;

  // NOTE: hash is derived, not part of the signed header yet.
  hash?: Hash;
}

// Block = header + tx list.
export interface Block {
  header: BlockHeader;
  txs: AnyTx[];
}

// ---------------------------------------------------------------------------
// Header hashing (canonical SHA-256 over serialized header)
// ---------------------------------------------------------------------------
//
// For now we serialize the header as a simple RLP-like list:
//
//   [ "HEADER",
//     height,
//     prevHash || "",
//     timestamp,
//     miner,
//     bodyRoot || ""
//   ]
//
// This is stable and compatible with future extensions.
// ---------------------------------------------------------------------------

function encodeHeaderForHash(header: BlockHeader): Buffer {
  const parts = [
    encodeString("HEADER"),
    encodeBigInt(BigInt(header.height)),
    encodeString(header.prevHash ?? ""),
    encodeBigInt(BigInt(header.timestamp)),
    encodeString(header.miner),
    encodeString(header.bodyRoot ?? ""),
  ];
  return encodeList(parts);
}

export function computeBlockHash(header: BlockHeader): Hash {
  const bytes = encodeHeaderForHash(header);
  const hashBuf = crypto.createHash("sha256").update(bytes).digest("hex");
  return (`0x${hashBuf}`) as Hash;
}

// ---------------------------------------------------------------------------
// Internal helpers for vault ops
// ---------------------------------------------------------------------------

function applyVaultCreate(state: ChainState, tx: VaultCreateTx): void {
  if (state.vaults.has(tx.vaultId)) {
    throw new Error(`Vault already exists: ${tx.vaultId}`);
  }
  state.vaults.set(tx.vaultId, {
    id: tx.vaultId,
    owner: tx.owner,
    balanceTHE: 0n,
  });
}

function applyVaultDeposit(state: ChainState, tx: VaultDepositTx): void {
  const vault = state.vaults.get(tx.vaultId);
  if (!vault) {
    throw new Error(`Vault not found for deposit: ${tx.vaultId}`);
  }
  if (tx.amount <= 0n) {
    throw new Error("VaultDepositTx.amount must be positive");
  }
  vault.balanceTHE += tx.amount;
}

function applyVaultWithdraw(state: ChainState, tx: VaultWithdrawTx): void {
  const vault = state.vaults.get(tx.vaultId);
  if (!vault) {
    throw new Error(`Vault not found for withdraw: ${tx.vaultId}`);
  }
  if (tx.amount <= 0n) {
    throw new Error("VaultWithdrawTx.amount must be positive");
  }
  if (vault.balanceTHE < tx.amount) {
    throw new Error(
      `VaultWithdrawTx: insufficient balance in vault ${tx.vaultId}`,
    );
  }
  vault.balanceTHE -= tx.amount;
}

// ---------------------------------------------------------------------------
// Tx → Merkle-leaf serialization (RLP-lite)
// ---------------------------------------------------------------------------
//
// Each tx type is encoded as a small list:
//
//   PAYMENT:
//     ["PAYMENT", from, to, amount]
//
//   VAULT_CREATE:
//     ["VAULT_CREATE", vaultId, owner]
//
//   VAULT_DEPOSIT:
//     ["VAULT_DEPOSIT", vaultId, amount]
//
//   VAULT_WITHDRAW:
//     ["VAULT_WITHDRAW", vaultId, amount]
// ---------------------------------------------------------------------------

function encodeTxForMerkle(tx: AnyTx): Buffer {
  switch (tx.txType) {
    case "PAYMENT":
      return encodeList([
        encodeString("PAYMENT"),
        encodeString(tx.from),
        encodeString(tx.to),
        encodeBigInt(tx.amount),
      ]);

    case "VAULT_CREATE":
      return encodeList([
        encodeString("VAULT_CREATE"),
        encodeString(tx.vaultId),
        encodeString(tx.owner),
      ]);

    case "VAULT_DEPOSIT":
      return encodeList([
        encodeString("VAULT_DEPOSIT"),
        encodeString(tx.vaultId),
        encodeBigInt(tx.amount),
      ]);

    case "VAULT_WITHDRAW":
      return encodeList([
        encodeString("VAULT_WITHDRAW"),
        encodeString(tx.vaultId),
        encodeBigInt(tx.amount),
      ]);

    default: {
      const _exhaustive: never = tx;
      throw new Error(`encodeTxForMerkle: unknown txType ${(tx as any).txType}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Tx application (v1)
// ---------------------------------------------------------------------------
//
// ALL ledger transactions must flow through here.
// Right now:
//   • PAYMENT
//   • VAULT_CREATE / VAULT_DEPOSIT / VAULT_WITHDRAW
// ---------------------------------------------------------------------------

function applyTx(state: ChainState, tx: AnyTx): void {
  switch (tx.txType) {
    case "PAYMENT": {
      // Simple account → account transfer
      debitAccount(state, tx.from, tx.amount);
      creditAccount(state, tx.to, tx.amount);
      return;
    }

    case "VAULT_CREATE": {
      applyVaultCreate(state, tx);
      return;
    }

    case "VAULT_DEPOSIT": {
      applyVaultDeposit(state, tx);
      return;
    }

    case "VAULT_WITHDRAW": {
      applyVaultWithdraw(state, tx);
      return;
    }

    default: {
      const _exhaustive: never = tx;
      throw new Error(`Unknown txType in applyTx: ${(tx as any).txType}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Block application (no validation)
// ---------------------------------------------------------------------------
//
// applyBlock assumes the block header is valid relative to the current
// ChainState. Consensus v0 wrappers are responsible for calling validation
// first.
// ---------------------------------------------------------------------------

export function applyBlock(state: ChainState, block: Block): void {
  // Apply txs
  for (const tx of block.txs) {
    applyTx(state, tx);
  }

  // Miner + node rewards
  applyBlockReward(state, block.header.miner, block.header.height);

  // Compute bodyRoot from txs (can be empty list).
  const leafBuffers = block.txs.map(encodeTxForMerkle);
  block.header.bodyRoot = computeMerkleRoot(leafBuffers);

  // Update header hash + chain metadata
  const hash = computeBlockHash(block.header);
  block.header.hash = hash;

  state.height = block.header.height;
  state.lastBlockHash = hash;
}

// ---------------------------------------------------------------------------
// Consensus v0 — header validation + safe apply
// ---------------------------------------------------------------------------
//
// This is an "honest single-node" consensus layer:
//   - strictly sequential heights
//   - prevHash must match lastBlockHash
//   - special rule for the first block
//
// No PoW, no signatures, no fork-choice yet.
// ---------------------------------------------------------------------------

export function validateBlockHeader(state: ChainState, block: Block): void {
  const { height, prevHash } = block.header;

  // First block after empty state.
  if (state.height === 0) {
    if (height !== 1) {
      throw new Error(`Invalid height for first block: got ${height}, expected 1`);
    }
    if (prevHash !== null) {
      throw new Error(`First block must have prevHash = null, got ${prevHash}`);
    }
    return;
  }

  // Subsequent blocks must be strictly sequential.
  const expectedHeight = state.height + 1;
  if (height !== expectedHeight) {
    throw new Error(`Invalid height: got ${height}, expected ${expectedHeight}`);
  }

  // And chain-linked by prevHash.
  if (prevHash !== state.lastBlockHash) {
    throw new Error(
      `Invalid prevHash: got ${prevHash}, expected ${state.lastBlockHash}`,
    );
  }
}

// Convenience wrapper that validates before applying.
export function applyBlockValidated(state: ChainState, block: Block): void {
  validateBlockHeader(state, block);
  applyBlock(state, block);
}

// ---------------------------------------------------------------------------
// Helper for sims: build a simple block.
// ---------------------------------------------------------------------------

export function makeSimpleBlock(
  height: number,
  prevHash: Hash | null,
  miner: Address,
  txs: AnyTx[],
): Block {
  const header: BlockHeader = {
    height,
    prevHash,
    timestamp: Date.now(),
    miner,
  };
  return { header, txs };
}
