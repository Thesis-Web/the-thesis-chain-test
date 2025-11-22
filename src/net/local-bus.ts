// src/net/local-bus.ts
// ---------------------------------------------------------------------------
// In-process P2P bus for THE
//  - Peers register a handler(NetMessage)
//  - send(from, to, msgWithoutFromPeerId)
//  - broadcast(from, msgWithoutFromPeerId)
// 
// Uses a generic M extends NetMessage so that when callers construct a
// literal with type: "INV_BLOCK" / "BLOCK" / "TX" / etc, TypeScript keeps
// the full shape (height/hash/blockBytes/tx/...) rather than collapsing
// to just { type: union }.
// ---------------------------------------------------------------------------

import type { NetMessage } from "./messages";

export type NetHandler = (msg: Readonly<NetMessage>) => void;

export class LocalBus {
  private readonly peers = new Map<string, NetHandler>();

  registerPeer(id: string, handler: NetHandler): void {
    this.peers.set(id, handler);
  }

  unregisterPeer(id: string): void {
    this.peers.delete(id);
  }

  private deliver(to: string, msg: NetMessage): void {
    const handler = this.peers.get(to);
    if (handler) {
      // Freeze so handlers cannot mutate shared messages in-process.
      handler(Object.freeze({ ...msg }));
    }
  }

  /**
   * Send a single message from → to.
   *
   * Callers provide a message without fromPeerId. We use a generic M
   * so that the specific variant (INV_BLOCK / GET_BLOCK / BLOCK / TX / ...)
   * is preserved in the type system.
   */
  send<M extends NetMessage>(from: string, to: string, msg: Omit<M, "fromPeerId">): void {
    const full = { ...msg, fromPeerId: from } as M;
    this.deliver(to, full);
  }

  /**
   * Broadcast a message to all peers except the sender.
   */
  broadcast<M extends NetMessage>(from: string, msg: Omit<M, "fromPeerId">): void {
    for (const [id] of this.peers) {
      if (id === from) continue;
      const full = { ...msg, fromPeerId: from } as M;
      this.deliver(id, full);
    }
  }
}
