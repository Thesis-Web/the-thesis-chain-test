// src/ledger/block.ts
// ---------------------------------------------------------------------------
// Block types + application (v1 + vault txs)
// ---------------------------------------------------------------------------

import type { Address, Hash, Amount } from "../types/primitives";
import type { ChainState } from "./state";
import { creditAccount, debitAccount } from "./state";

import { applyBlockReward } from "../rewards/rewards";

import {
  createVault,
  depositToVault,
  withdrawFromVault
} from "./vault";

import type {
  VaultCreateTx,
  VaultDepositTx,
  VaultWithdrawTx,
  VaultTx
} from "./tx";

// ---------------------------------------------------------------------------
// TX TYPES
// ---------------------------------------------------------------------------

// Simple payment tx for the v1 sim.
export interface PaymentTx {
  readonly txType: "PAYMENT";
  readonly from: Address;
  readonly to: Address;
  readonly amount: Amount;
}

// Union of all txs currently supported by the ledger.
export type AnyTx = PaymentTx | VaultTx;

// ---------------------------------------------------------------------------
// Block header + block
// ---------------------------------------------------------------------------

export interface BlockHeader {
  height: number;
  prevHash: Hash | null;
  timestamp: number;
  miner: Address;
  hash?: Hash;
}

export interface Block {
  header: BlockHeader;
  txs: AnyTx[];
}

// ---------------------------------------------------------------------------
// Deterministic, non-crypto hash for sims
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
// TX application
// ---------------------------------------------------------------------------

function applyTx(state: ChainState, tx: AnyTx): void {
  switch (tx.txType) {
    case "PAYMENT": {
      debitAccount(state, tx.from, tx.amount);
      creditAccount(state, tx.to, tx.amount);
      return;
    }

    case "VAULT_CREATE": {
      createVault(state.vaults, tx.vaultId, tx.owner);
      return;
    }

    case "VAULT_DEPOSIT": {
      depositToVault(state.vaults, tx.vaultId, tx.amount);
      return;
    }

    case "VAULT_WITHDRAW": {
      withdrawFromVault(state.vaults, tx.vaultId, tx.amount);
      return;
    }

    default: {
      const _exhaustive: never = tx as never;
      throw new Error(`Unknown txType in applyTx: ${(tx as any).txType}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Block application
// ---------------------------------------------------------------------------

export function applyBlock(state: ChainState, block: Block): void {
  // Apply txs
  for (const tx of block.txs) {
    applyTx(state, tx);
  }

  // Miner reward (epoch logic lives in rewards.ts)
  applyBlockReward(state, block.header.miner, block.header.height);

  // Update hash + chain metadata
  const hash = computeBlockHash(block.header);
  block.header.hash = hash;

  state.height = block.header.height;
  state.lastBlockHash = hash;
}

// ---------------------------------------------------------------------------
// Helper for sims: build a simple block
// ---------------------------------------------------------------------------

export function makeSimpleBlock(
  height: number,
  prevHash: Hash | null,
  miner: Address,
  txs: AnyTx[]
): Block {
  const header: BlockHeader = {
    height,
    prevHash,
    timestamp: Date.now(),
    miner
  };
  return { header, txs };
}
