// src/node/node.ts
// ---------------------------------------------------------------------------
// Node + BlockBuilder (v1)
// ---------------------------------------------------------------------------
//
// Each Node has:
//   - its own ChainState
//   - its own Mempool
//   - a miner address (used in block headers)
//
// This does NOT do networking itself. The network simulator
// orchestrates who gossips what to whom.
// ---------------------------------------------------------------------------

import type { Address, Hash } from "../types/primitives";
import type { ChainState } from "../ledger/state";
import { createEmptyChainState } from "../ledger/state";

import type { AnyTx, Block } from "../ledger/block";
import { makeSimpleBlock, applyBlockValidated } from "../ledger/block";

import { Mempool } from "./mempool";

export class Node {
  readonly id: string;
  readonly minerAddress: Address;

  readonly state: ChainState;
  readonly mempool: Mempool;

  constructor(id: string, minerAddress: Address) {
    this.id = id;
    this.minerAddress = minerAddress;

    this.state = createEmptyChainState();
    this.mempool = new Mempool();
  }

  // -------------------------------------------------------------------------
  // Mempool interaction
  // -------------------------------------------------------------------------

  // Receive a tx from the "network".
  receiveTxFromPeer(tx: AnyTx): void {
    this.mempool.addTx(tx);
  }

  // -------------------------------------------------------------------------
  // Block production (local mining)
  // -------------------------------------------------------------------------
  //
  // mineNextBlock:
  //   - builds a block using current height / prevHash
  //   - includes up to `maxTxs` from the mempool
  //   - validates & applies locally
  //   - removes included txs from this node's mempool
  //   - returns the produced block for gossip
  // -------------------------------------------------------------------------

  mineNextBlock(maxTxs: number = 100): Block {
    const allPending = this.mempool.getAll();
    const txs = allPending.slice(0, maxTxs);

    const height = this.state.height === 0 ? 1 : this.state.height + 1;
    const prevHash: Hash | null =
      this.state.height === 0 ? null : this.state.lastBlockHash;

    const block = makeSimpleBlock(height, prevHash, this.minerAddress, txs);

    // Apply locally (will throw if header invalid).
    applyBlockValidated(this.state, block);

    // Remove included txs from local mempool.
    this.mempool.removeTxs(block.txs);

    return block;
  }

  // -------------------------------------------------------------------------
  // Block reception (from peers)
  // -------------------------------------------------------------------------

  receiveBlockFromPeer(block: Block): void {
    // Validate header + apply. If invalid, let the caller catch the error.
    applyBlockValidated(this.state, block);

    // Drop any txs we had that are now confirmed in this block.
    this.mempool.removeTxs(block.txs);
  }
}
