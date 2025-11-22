// src/sims/net-wire-sim.ts
import { LocalBus } from "../net/local-bus";
import type { NetMessage } from "../net/messages";
import { Block } from "../ledger/block";
import { mineBlock } from "../pow/mine";
import {
  encodeBlockToJsonWire,
  decodeBlockFromJsonWire
} from "../serialization/block-wire";
import { LedgerState, applyBlockToState } from "../ledger/state";

function makeFakeBlock(height: number, miner: string): Block {
  return {
    header: {
      height,
      prevHash: height === 1 ? null : `0xFAKE_HASH_${height - 1}`,
      timestamp: Date.now(),
      miner
    },
    txs: []
  };
}

class Peer {
  id: string;
  bus: LocalBus;
  state: LedgerState;

  // simple block store for this sim
  blocks: Map<number, Block> = new Map();

  constructor(id: string, bus: LocalBus) {
    this.id = id;
    this.bus = bus;
    this.state = { height: 0, lastBlockHash: null };

    bus.addPeer(this);
  }

  receive(msg: NetMessage) {
    switch (msg.type) {
      case "INV_BLOCK": {
        const { height } = msg;
        if (!this.blocks.has(height) && height === this.state.height + 1) {
          // Request the block
          this.bus.send({
            type: "GET_BLOCK",
            fromPeerId: this.id,
            toPeerId: msg.fromPeerId,
            height
          });
        }
        break;
      }

      case "GET_BLOCK": {
        const { height } = msg;
        const blk = this.blocks.get(height);
        if (blk) {
          const bytes = encodeBlockToJsonWire(blk);
          this.bus.send({
            type: "BLOCK",
            fromPeerId: this.id,
            toPeerId: msg.fromPeerId,
            height,
            blockBytes: bytes
          });
        }
        break;
      }

      case "BLOCK": {
        const blk = decodeBlockFromJsonWire(msg.blockBytes);
        // Apply block
        applyBlockToState(this.state, blk);
        this.blocks.set(blk.header.height, blk);
        break;
      }

      default:
        // ignore TX, CHAIN_TIP, etc in this sim
        break;
    }
  }

  mineAndBroadcast(): Block {
    const nextHeight = this.state.height + 1;
    const blk = makeFakeBlock(nextHeight, this.id);
    this.blocks.set(nextHeight, blk);
    applyBlockToState(this.state, blk);

    this.bus.broadcast({
      type: "INV_BLOCK",
      fromPeerId: this.id,
      height: nextHeight
    });

    return blk;
  }
}


// -----------------------------------------------------------------------------
// MAIN SIM
// -----------------------------------------------------------------------------

console.log(`\n=== P2P INVENTORY / REQUEST / BLOCK SYNC SIM ===\n`);

const bus = new LocalBus();
const N1 = new Peer("N1", bus);
const N2 = new Peer("N2", bus);
const N3 = new Peer("N3", bus);

// N1 mines 3 blocks and announces them
console.log(`>>> N1 mining + broadcasting...\n`);

for (let i = 0; i < 3; i++) {
  const blk = N1.mineAndBroadcast();
  console.log(
    `N1 mined block h=${blk.header.height} hash=${blk.header.prevHash ?? "GENESIS"}`
  );
}

// Show final peer states
console.log(`\n=== FINAL PEER STATES ===`);
for (const p of [N1, N2, N3]) {
  console.log(
    `Peer ${p.id}: height=${p.state.height}, lastHash=${p.state.lastBlockHash}`
  );
}

console.log(`\n=== P2P INVENTORY / REQUEST / BLOCK SYNC SIM COMPLETE ===\n`);
