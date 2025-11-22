// src/net/messages.ts
// ---------------------------------------------------------------------------
// P2P message types (v1) for THE
//   - We keep the original BLOCK_BROADCAST message used by net-wire-sim
//   - We add more explicit messages for real sync & tx gossip:
//       • INV_BLOCK / GET_BLOCK / BLOCK
//       • GET_CHAIN_TIP / CHAIN_TIP
//       • TX (transaction gossip)
// ---------------------------------------------------------------------------

import type { Hash } from "../types/primitives";
import type { AnyTx } from "../ledger/block";
// Base shape for all wire messages
export interface BaseNetMessage {
  readonly type: string;
  readonly fromPeerId: string;
}

// ---------------------------------------------------------------------------
// Legacy/simple broadcast (already used by net-wire-sim)
// ---------------------------------------------------------------------------

export interface BlockBroadcastMessage extends BaseNetMessage {
  readonly type: "BLOCK_BROADCAST";
  readonly blockBytes: Uint8Array; // JSON-wire encoded Block
}

// ---------------------------------------------------------------------------
// New: inventory / block-request / block transfer
// ---------------------------------------------------------------------------

// "I have this block at height H with hash X"
export interface InvBlockMessage extends BaseNetMessage {
  readonly type: "INV_BLOCK";
  readonly height: number;
  readonly hash: Hash;
}

// "Please send me block with hash X"
export interface GetBlockMessage extends BaseNetMessage {
  readonly type: "GET_BLOCK";
  readonly hash: Hash;
}

// "Here is the full encoded block"
export interface BlockMessage extends BaseNetMessage {
  readonly type: "BLOCK";
  readonly blockBytes: Uint8Array; // JSON-wire encoded Block
}

// ---------------------------------------------------------------------------
// New: chain-tip sync
// ---------------------------------------------------------------------------

// "What's your current tip?"
export interface GetChainTipMessage extends BaseNetMessage {
  readonly type: "GET_CHAIN_TIP";
}

// "My current tip is (height, hash)"
export interface ChainTipMessage extends BaseNetMessage {
  readonly type: "CHAIN_TIP";
  readonly height: number;
  readonly hash: Hash | null;
}

// ---------------------------------------------------------------------------
// New: transaction gossip
// ---------------------------------------------------------------------------

export interface TxMessage extends BaseNetMessage {
  readonly type: "TX";
  readonly tx: AnyTx;
}

// ---------------------------------------------------------------------------
// Union of all messages (used by bus + peers)
// ---------------------------------------------------------------------------

export type NetMessage =
  | BlockBroadcastMessage
  | InvBlockMessage
  | GetBlockMessage
  | BlockMessage
  | GetChainTipMessage
  | ChainTipMessage
  | TxMessage;
