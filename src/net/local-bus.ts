// src/net/local-bus.ts
// ---------------------------------------------------------------------------
// In-process "network bus" for sims
//   - Peers register a handler
//   - We can send unicast or broadcast NetMessage instances
//
// This mimics a very simple P2P network without sockets.
// ---------------------------------------------------------------------------

import type { NetMessage } from "./messages";

type NetMessageHandler = (msg: NetMessage) => void;

export class LocalBus {
  private readonly handlers = new Map<string, NetMessageHandler>();

  // Register or replace a peer's message handler
  registerPeer(peerId: string, handler: NetMessageHandler): void {
    this.handlers.set(peerId, handler);
  }

  // Unregister a peer (not used yet, but handy for later)
  unregisterPeer(peerId: string): void {
    this.handlers.delete(peerId);
  }

  // Low-level: send a fully-formed message object
  sendRaw(msg: NetMessage): void {
    const targetHandler = this.handlers.get(msg.fromPeerId);
    // NOTE: sendRaw assumes the handler will fan-out based on msg.type
    // In practice, we usually want send() or broadcast().
    if (!targetHandler) {
      return;
    }
    targetHandler(msg);
  }

  // Unicast: from → to, with fromPeerId injected.
  send(
    fromPeerId: string,
    toPeerId: string,
    msg: Omit<NetMessage, "fromPeerId">
  ): void {
    const handler = this.handlers.get(toPeerId);
    if (!handler) return;

    const fullMsg: NetMessage = {
      ...msg,
      fromPeerId,
    } as NetMessage;

    handler(fullMsg);
  }

  // Broadcast: fan-out to all peers except the sender.
  broadcast(
    fromPeerId: string,
    msg: Omit<NetMessage, "fromPeerId">
  ): void {
    const fullMsg: NetMessage = {
      ...msg,
      fromPeerId,
    } as NetMessage;

    for (const [peerId, handler] of this.handlers.entries()) {
      if (peerId === fromPeerId) continue;
      handler(fullMsg);
    }
  }
}
