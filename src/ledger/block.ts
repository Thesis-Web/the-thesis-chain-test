// src/ledger/block.ts
// ---------------------------------------------------------------------------
// Block types + application (v1 scaffold + Consensus v0)
// ---------------------------------------------------------------------------
//
// Responsibilities:
//   - Define PaymentTx + AnyTx (including vault txs)
//   - Define BlockHeader / Block types
//   - Compute a deterministic (non-crypto) block hash
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
  VaultTx,
} from "./tx";

// ---------------------------------------------------------------------------
// Transaction types (v1)
// ---------------------------------------------------------------------------

// Simple payment tx for the v1 sims.
export interface PaymentTx {
  readonly txType: "PAYMENT";
  readonly from: Address;
  readonly to: Address;
  readonly amount: Amount;
}

// Unified transaction union for the ledger.
// As we add more tx families (splits, governance, EU certs, etc.)
// they should be added to this union.
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

  // NOTE: hash is derived, not part of the signed header yet.
  hash?: Hash;
}

// Block = header + tx list.
export interface Block {
  header: BlockHeader;
  txs: AnyTx[];
}

// ---------------------------------------------------------------------------
// Hash helper (non-crypto, deterministic for sims)
// ---------------------------------------------------------------------------

export function computeBlockHash(header: BlockHeader): Hash {
  const data = `${header.height}|${header.prevHash ?? ""}|${header.timestamp}|${header.miner}`;
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (h * 31 + data.charCodeAt(i)) >>> 0;
  }
  return `HASH_${h.toString(16).padStart(8, "0")}`;
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
      // Exhaustiveness guard — if we add a new txType to AnyTx
      // and forget to handle it here, TS will flag this.
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
