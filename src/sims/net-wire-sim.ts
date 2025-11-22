// src/sims/net-wire-sim.ts
// ---------------------------------------------------------------------------
// P2P + WIRE SIM for THE
//   - 3 peers: N1, N2, N3
//   - Shared genesis block
//   - N1 mines 3 blocks
//   - Blocks are propagated via:
//       • INV_BLOCK (inventory)
//       • GET_BLOCK (request)
//       • BLOCK (full block transfer, JSON-wire encoded)
//
// NOTE: This sim uses the structured INV/GET/BLOCK pipeline and does
// NOT rely on the legacy BLOCK_BROADCAST message.
// ---------------------------------------------------------------------------

import { LocalBus } from "../net/local-bus";
import type {
  NetMessage,
  InvBlockMessage,
  GetBlockMessage,
  BlockMessage,
} from "../net/messages";

import {
  createEmptyChainState,
  type ChainState,
} from "../ledger/state";

import {
  makeSimpleBlock,
  applyBlockValidated,
  type Block,
  type AnyTx,
} from "../ledger/block";

import {
  encodeBlockToJsonWire,
  decodeBlockFromJsonWire,
} from "../serialization/block-wire";

import type { Address, Hash } from "../types/primitives";

// ---------------------------------------------------------------------------
// Peer
// ---------------------------------------------------------------------------

class Peer {
  readonly id: string;
  private readonly bus: LocalBus;
  private readonly state: ChainState;
  private readonly blocks = new Map<Hash, Block>();

  constructor(id: string, bus: LocalBus, genesis: Block) {
    this.id = id;
    this.bus = bus;

    // Start from empty and apply the shared genesis block.
    this.state = createEmptyChainState();
    applyBlockValidated(this.state, genesis);

    const genesisHash = genesis.header.hash as Hash | undefined;
    if (!genesisHash) {
      throw new Error("Genesis block is missing hash");
    }
    this.blocks.set(genesisHash, genesis);

    // Register handler with the in-process bus.
    this.bus.registerPeer(this.id, (msg) => this.handle(msg));
  }

  // Mine a simple empty block on top of our current tip and announce it via
  // an inventory message (INV_BLOCK).
  mineAndAnnounce(): void {
    const block = this.mineNextBlock();
    const hash = block.header.hash as Hash | undefined;
    if (!hash) {
      throw new Error("mineAndAnnounce: block hash missing after apply");
    }

    console.log(
      `Peer ${this.id}: mined block h=${block.header.height}, hash=${hash}`,
    );

    // Explicitly type the INV_BLOCK message so TS knows exactly
    // which NetMessage variant we are constructing.
    const inv: Omit<InvBlockMessage, "fromPeerId"> = {
      type: "INV_BLOCK",
      height: block.header.height,
      hash,
    };

    this.bus.broadcast(this.id, inv);
  }

  // Mine a block (no txs for now — just rewards) and apply it locally.
  private mineNextBlock(): Block {
    const height = this.state.height + 1;
    const prevHash = this.state.lastBlockHash;
    const miner = this.id as Address;

    const txs: AnyTx[] = []; // could inject real txs later

    const block = makeSimpleBlock(height, prevHash, miner, txs);

    // Validates header (height/prevHash) and applies txs + rewards.
    applyBlockValidated(this.state, block);

    const hash = block.header.hash as Hash | undefined;
    if (!hash) {
      throw new Error("mineNextBlock: block hash missing after apply");
    }
    this.blocks.set(hash, block);

    return block;
  }

  // Core message handler for this peer.
  private handle(msg: Readonly<NetMessage>): void {
    switch (msg.type) {
      case "INV_BLOCK": {
        const inv = msg as InvBlockMessage;
        const { hash, height, fromPeerId } = inv;

        // Already have it? Ignore.
        if (this.blocks.has(hash)) {
          return;
        }

        // If it's not ahead of us, ignore (simple heuristic).
        if (height <= this.state.height) {
          return;
        }

        console.log(
          `Peer ${this.id}: received INV_BLOCK h=${height}, hash=${hash} from ${fromPeerId}`,
        );

        // Ask the announcing peer for the full block.
        const getReq: Omit<GetBlockMessage, "fromPeerId"> = {
          type: "GET_BLOCK",
          hash,
        };
        this.bus.send(this.id, fromPeerId, getReq);

        return;
      }

      case "GET_BLOCK": {
        const get = msg as GetBlockMessage;
        const { hash, fromPeerId } = get;

        const block = this.blocks.get(hash);
        if (!block) {
          console.log(
            `Peer ${this.id}: ignoring GET_BLOCK for unknown hash=${hash}`,
          );
          return;
        }

        const bytes = encodeBlockToJsonWire(block);

        console.log(
          `Peer ${this.id}: sending BLOCK h=${block.header.height} to ${fromPeerId}`,
        );

        const blk: Omit<BlockMessage, "fromPeerId"> = {
          type: "BLOCK",
          blockBytes: bytes,
        };
        this.bus.send(this.id, fromPeerId, blk);

        return;
      }

      case "BLOCK": {
        const blkMsg = msg as BlockMessage;
        const { blockBytes, fromPeerId } = blkMsg;

        const block = decodeBlockFromJsonWire(blockBytes);

        // applyBlockValidated will recompute hash
        try {
          applyBlockValidated(this.state, block);
        } catch (e) {
          console.log(
            `Peer ${this.id}: rejected BLOCK from ${fromPeerId}: ${
              (e as Error).message
            }`,
          );
          return;
        }

        const hash = block.header.hash as Hash | undefined;
        if (!hash) {
          console.log(
            `Peer ${this.id}: decoded block from ${fromPeerId} but hash missing`,
          );
          return;
        }

        if (!this.blocks.has(hash)) {
          this.blocks.set(hash, block);
        }

        console.log(
          `Peer ${this.id}: applied BLOCK h=${block.header.height}, hash=${hash} from ${fromPeerId}`,
        );

        return;
      }

      default:
        // Ignore other message types (BLOCK_BROADCAST, TX, etc.) in this sim.
        return;
    }
  }

  // Debug print of this peer's final chain tip.
  printTip(): void {
    console.log(
      `Peer ${this.id} FINAL: height=${this.state.height}, hash=${this.state.lastBlockHash}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main sim
// ---------------------------------------------------------------------------

function main(): void {
  console.log("=== P2P + WIRE NET SIM (INV/GET/BLOCK) ===");

  const bus = new LocalBus();

  // Shared genesis block (height=1, prevHash=null, no txs).
  const genesis = makeSimpleBlock(1, null, "MINER_GENESIS" as Address, []);

  // 3 peers bootstrapped from the same genesis.
  const p1 = new Peer("N1", bus, genesis);
  const p2 = new Peer("N2", bus, genesis);
  const p3 = new Peer("N3", bus, genesis);

  const peers = [p1, p2, p3];

  console.log("\n>>> N1 mines and announces 3 blocks...\n");
  for (let i = 0; i < 3; i++) {
    p1.mineAndAnnounce();
  }

  console.log("\n=== FINAL PEER TIPS ===");
  for (const p of peers) {
    p.printTip();
  }

  console.log("=== P2P + WIRE NET SIM COMPLETE ===");
}

main();
