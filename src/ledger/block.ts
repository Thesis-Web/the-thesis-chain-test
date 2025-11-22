// src/ledger/block.ts
// ---------------------------------------------------------------------------
// THE Ledger – Block model, Merkle integration, vault ops, tx apply,
// miner rewards, and consensus v0.
// ---------------------------------------------------------------------------

import type { Address, Hash, Amount } from "../types/primitives";
import type { ChainState } from "./state";
import {
  creditAccount,
  debitAccount,
} from "./state";

import {
  applyBlockReward,
} from "../rewards/rewards";

import type {
  VaultCreateTx,
  VaultDepositTx,
  VaultWithdrawTx,
} from "./tx";

import {
  buildMerkleRootFromStrings,
} from "../merkle/merkle";

// ---------------------------------------------------------------------------
// Tx union
// ---------------------------------------------------------------------------

export interface PaymentTx {
  readonly txType: "PAYMENT";
  readonly from: Address;
  readonly to: Address;
  readonly amount: Amount;
}

export type AnyTx =
  | PaymentTx
  | VaultCreateTx
  | VaultDepositTx
  | VaultWithdrawTx;

// ---------------------------------------------------------------------------
// Block + Header definitions
// ---------------------------------------------------------------------------

export interface BlockHeader {
  height: number;
  prevHash: Hash | null;
  timestamp: number;
  miner: Address;

  // THE Merkle root (N-ary)
  bodyRoot?: Hash;

  // Computed by computeBlockHash
  hash?: Hash;
}

export interface Block {
  header: BlockHeader;
  txs: AnyTx[];
}

// ---------------------------------------------------------------------------
// Hash helper (deterministic, not crypto – PoW uses real SHA256 in pow.ts)
// ---------------------------------------------------------------------------

export function computeBlockHash(header: BlockHeader): Hash {
  const data = [
    header.height.toString(),
    header.prevHash ?? "",
    header.timestamp.toString(),
    header.miner,
    header.bodyRoot ?? "",
  ].join("|");

  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (h * 31 + data.charCodeAt(i)) >>> 0;
  }
  return `HASH_${h.toString(16).padStart(8, "0")}`;
}

// ---------------------------------------------------------------------------
// Vault ops
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
  if (!vault) throw new Error(`Vault deposit: missing vault ${tx.vaultId}`);
  if (tx.amount <= 0n) throw new Error("VaultDeposit.amount must be positive");
  vault.balanceTHE += tx.amount;
}

function applyVaultWithdraw(state: ChainState, tx: VaultWithdrawTx): void {
  const vault = state.vaults.get(tx.vaultId);
  if (!vault) throw new Error(`Vault withdraw: missing vault ${tx.vaultId}`);
  if (tx.amount <= 0n) throw new Error("VaultWithdraw.amount must be positive");
  if (vault.balanceTHE < tx.amount) throw new Error("Vault underflow");
  vault.balanceTHE -= tx.amount;
}

// ---------------------------------------------------------------------------
// Tx application (single entry point)
// ---------------------------------------------------------------------------

function applyTx(state: ChainState, tx: AnyTx): void {
  switch (tx.txType) {
    case "PAYMENT": {
      debitAccount(state, tx.from, tx.amount);
      creditAccount(state, tx.to, tx.amount);
      return;
    }
    case "VAULT_CREATE": return applyVaultCreate(state, tx);
    case "VAULT_DEPOSIT": return applyVaultDeposit(state, tx);
    case "VAULT_WITHDRAW": return applyVaultWithdraw(state, tx);

    default:
      const _exhaustive: never = tx;
      throw new Error(`Unknown tx: ${(tx as any).txType}`);
  }
}


// ---------------------------------------------------------------------------
// Merkle leaf encoding for THE txs
// ---------------------------------------------------------------------------
//
// We cannot JSON.stringify BigInt, so we define a stable, human-readable,
// pipe-separated encoding. This is THE's canonical "tx leaf" form for
// Merkle roots in sims.
// ---------------------------------------------------------------------------

function txToMerkleLeaf(tx: AnyTx): string {
  switch (tx.txType) {
    case "PAYMENT":
      return [
        "PAYMENT",
        tx.from,
        tx.to,
        tx.amount.toString(), // bigint → decimal string
      ].join("|");

    case "VAULT_CREATE":
      return [
        "VAULT_CREATE",
        tx.vaultId,
        tx.owner,
      ].join("|");

    case "VAULT_DEPOSIT":
      return [
        "VAULT_DEPOSIT",
        tx.vaultId,
        tx.amount.toString(), // bigint → decimal string
      ].join("|");

    case "VAULT_WITHDRAW":
      return [
        "VAULT_WITHDRAW",
        tx.vaultId,
        tx.amount.toString(), // bigint → decimal string
      ].join("|");

    default: {
      const _exhaustive: never = tx;
      throw new Error(`Unknown txType in txToMerkleLeaf: ${(tx as any).txType}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Block apply (NO validation)
// ---------------------------------------------------------------------------
//
// Order matters:
//
//   1. Apply all txs
//   2. Compute Merkle root of body
//   3. Miner+Node rewards (THE)
//   4. Compute header.hash *after* bodyRoot exists
//   5. Update chain state height + lastBlockHash
//
// ---------------------------------------------------------------------------

export function applyBlock(state: ChainState, block: Block): void {
  // Apply txs
  for (const tx of block.txs) applyTx(state, tx);

  // Compute THE-style N-ary Merkle root
  const leafStrings = block.txs.map(txToMerkleLeaf);
  const bodyRoot = buildMerkleRootFromStrings(leafStrings, 4);
  block.header.bodyRoot = bodyRoot ?? undefined;

  // Miner + Node Income Pool reward
  applyBlockReward(state, block.header.miner, block.header.height);

  // Now compute hash (covers bodyRoot!)
  const hash = computeBlockHash(block.header);
  block.header.hash = hash;

  // Update chain meta
  state.height = block.header.height;
  state.lastBlockHash = hash;
}

// ---------------------------------------------------------------------------
// Consensus v0 — sequential chain with prevHash linking
// ---------------------------------------------------------------------------

export function validateBlockHeader(state: ChainState, block: Block): void {
  const { height, prevHash } = block.header;

  // Genesis rule
  if (state.height === 0) {
    if (height !== 1) throw new Error(`First block height must be 1`);
    if (prevHash !== null) throw new Error(`First block prevHash must be null`);
    return;
  }

  // Strict height increment
  const expectedHeight = state.height + 1;
  if (height !== expectedHeight) {
    throw new Error(`Invalid height: got ${height}, expected ${expectedHeight}`);
  }

  // prevHash must match
  if (prevHash !== state.lastBlockHash) {
    throw new Error(
      `Invalid prevHash: got ${prevHash}, expected ${state.lastBlockHash}`,
    );
  }
}

// Safe wrapper: validate then apply
export function applyBlockValidated(state: ChainState, block: Block): void {
  validateBlockHeader(state, block);
  applyBlock(state, block);
}

// ---------------------------------------------------------------------------
// Helper for sims
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
