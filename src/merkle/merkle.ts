// src/merkle/merkle.ts
// ---------------------------------------------------------------------------
// Merkle tree for THE (SHA-256 over RLP-lite leaves)
// ---------------------------------------------------------------------------
//
// API:
//   computeMerkleRoot(leaves: Buffer[]): Hash
//
// Notes:
//   - Leaves are pre-serialized (e.g., via RLP-lite).
//   - We hash leaves once to form the bottom level.
//   - On each level, we hash pairwise concatenated nodes,
//     duplicating the last if odd count.
//   - Empty tree gets a well-defined sentinel hash.
// ---------------------------------------------------------------------------

import * as crypto from "crypto";
import type { Hash } from "../types/primitives";

function sha256(buf: Buffer): Buffer {
  return crypto.createHash("sha256").update(buf).digest();
}

function bufferToHashHex(buf: Buffer): Hash {
  const hex = buf.toString("hex");
  return (`0x${hex}`) as Hash;
}

export function computeMerkleRoot(leaves: Buffer[]): Hash {
  if (leaves.length === 0) {
    // Sentinel for empty body / no txs.
    const empty = sha256(Buffer.from("THE::EMPTY_MERKLE", "utf8"));
    return bufferToHashHex(empty);
  }

  // First level: hash each leaf individually.
  let level = leaves.map((leaf) => sha256(leaf));

  // Climb until single root remains.
  while (level.length > 1) {
    const next: Buffer[] = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last if odd
      const combined = Buffer.concat([left, right]);
      next.push(sha256(combined));
    }

    level = next;
  }

  return bufferToHashHex(level[0]);
}
