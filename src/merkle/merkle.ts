// src/merkle/merkle.ts
// ---------------------------------------------------------------------------
// THE-style Merkle engine (N-ary, deterministic ordering)
// ---------------------------------------------------------------------------
//
// Goals:
//   - Work with arbitrary leaf strings (e.g. canonical tx encodings)
//   - N-ary tree (fanout configurable; default 4 for THE-style batching)
//   - Deterministic: same leaves ⇒ same root on every node
//
// This module is deliberately generic: it does NOT know about tx types.
// Ledger code is responsible for:
//   - turning AnyTx into a canonical string
//   - choosing the fanout (we default to 4 for THE)
//
// Receipts / proofs:
//   - For now we only expose root computation.
//   - A proof builder/ verifier can be layered on later using
//     the same hashLeaf / hashInternal helpers.
// ---------------------------------------------------------------------------

import * as crypto from "crypto";
import type { Hash } from "../types/primitives";

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Interpret hex as unsigned BigInt — kept here for future difficulty / proofs.
export function hexToBigInt(hex: string): bigint {
  return BigInt("0x" + hex);
}

// Hash a leaf value (already canonicalized string).
export function hashLeaf(data: string): Hash {
  const hex = sha256Hex("L|" + data); // prefix L| so leaves can't collide with internal nodes
  return ("0x" + hex) as Hash;
}

// Hash an internal node from its child hashes.
export function hashInternal(children: Hash[]): Hash {
  if (children.length === 0) {
    throw new Error("hashInternal: empty children");
  }
  const joined = children.join("|");
  const hex = sha256Hex("I|" + joined); // prefix I| for clarity
  return ("0x" + hex) as Hash;
}

// ---------------------------------------------------------------------------
// Merkle root (N-ary, THE-style default fanout = 4)
// ---------------------------------------------------------------------------
//
// buildMerkleRootFromStrings:
//   - Takes an array of canonical leaf strings
//   - Hashes each to a leaf
//   - Folds upward in groups of `fanout`
//   - Pads the last group implicitly by just taking whatever remains
//
// NOTE: If leaves.length === 0, we return null rather than inventing a dummy root.
//       Callers can decide how to treat an "empty body".
// ---------------------------------------------------------------------------

export function buildMerkleRootFromStrings(
  leaves: string[],
  fanout: number = 4
): Hash | null {
  if (leaves.length === 0) {
    return null;
  }
  if (fanout < 2) {
    throw new Error("buildMerkleRootFromStrings: fanout must be >= 2");
  }

  // First level: hash each leaf independently.
  let level: Hash[] = leaves.map((leaf) => hashLeaf(leaf));

  // Fold upward until a single root remains.
  while (level.length > 1) {
    const next: Hash[] = [];

    for (let i = 0; i < level.length; i += fanout) {
      const chunk = level.slice(i, i + fanout);
      const parent = hashInternal(chunk);
      next.push(parent);
    }

    level = next;
  }

  return level[0]!;
}
