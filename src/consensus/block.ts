// TARGET: chain src/consensus/block.ts
// src/consensus/block.ts
// ---------------------------------------------------------------------------
// Block header + body definitions for the L1 chain (v0 consensus skeleton).
//
// This module is intentionally minimal and self-contained. It does not depend
// on any ledger- or VM-specific types so that we can evolve those layers
// independently. Hashing is provided via Node's crypto for dev / sim usage.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";

export type Hash = string;

export interface BlockHeader {
  readonly height: number;
  readonly parentHash: Hash | null;
  readonly timestampSec: number;
  readonly nonce: bigint; // PoW nonce (v0)
}

export interface BlockBody {
  // In v0 we keep this as an opaque list of tx-like payloads. The *shape* of
  // these payloads belongs to the ledger / VM layer, not consensus itself.
  readonly txs: readonly unknown[];
}

export interface Block {
  readonly header: BlockHeader;
  readonly body: BlockBody;
  readonly hash: Hash;
}

/**
 * Compute a simple SHA-256 hash of the header as the block hash.
 *
 * This is suitable for dev / sim networks. If we need a more structured
 * hashing scheme later (e.g., domain-separated hashing or Merkle roots), we
 * will introduce it here without changing the external Block shape.
 */
export function computeBlockHash(header: BlockHeader): Hash {
  const payload = JSON.stringify({
    height: header.height,
    parentHash: header.parentHash,
    timestampSec: header.timestampSec,
    nonce: header.nonce.toString()
  });
  const h = createHash("sha256").update(payload).digest("hex");
  return h;
}
