// src/consensus/pow.ts
// ---------------------------------------------------------------------------
// Pack 13.3 — PoW helpers for Thesis L1
// ---------------------------------------------------------------------------
// This module provides small, deterministic helpers for working with PoW:
//
//   • hashHexToBigInt: parse a hex-encoded hash into a bigint.
//   • isHashBelowTarget: compare a hash value to a difficulty target.
//   • ensurePowMeetsTarget: throw if PoW is insufficient.
//   • makeSyntheticValidHash: Option A — generate a synthetic hash that is
//     guaranteed to be below a given target (for sims / tests).
//
// These helpers are designed so that existing sims which use non-hex hashes
// are NOT broken: if a hash is not plausibly hex, PoW checks are treated
// as no-ops, so legacy sims continue to function while new sims can opt-in
// to real PoW behaviour by using hex-encoded hashes.
// ---------------------------------------------------------------------------

/**
 * Quick heuristic: return true if the string looks like a hex-encoded value.
 */
export function isProbablyHex(hash: string): boolean {
  const s = hash.startsWith("0x") ? hash.slice(2) : hash;
  return s.length > 0 && /^[0-9a-fA-F]+$/.test(s);
}

/**
 * Parse a hex-encoded hash into a bigint.
 */
export function hashHexToBigInt(hash: string): bigint {
  const s = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (s.length === 0 || !/^[0-9a-fA-F]+$/.test(s)) {
    throw new Error(`pow: cannot parse non-hex hash: ${hash}`);
  }
  return BigInt("0x" + s);
}

/**
 * Return true if the given hex-encoded hash is <= the difficulty target.
 */
export function isHashBelowTarget(hash: string, target: bigint): boolean {
  const value = hashHexToBigInt(hash);
  return value <= target;
}

/**
 * Ensure a given hash meets the PoW target. If the hash does not look like
 * a hex value (legacy / proto sims), this is treated as a no-op.
 */
export function ensurePowMeetsTarget(hash: string, target: bigint): void {
  if (!isProbablyHex(hash)) {
    // Legacy/proto sims: skip enforcement for non-hex hashes.
    return;
  }
  if (!isHashBelowTarget(hash, target)) {
    throw new Error("pow: insufficient work for current difficulty target");
  }
}

/**
 * Option A — Deterministic synthetic hash generator for sims.
 *
 * For a given target T, returns a hex-encoded hash H such that:
 *   0 <= H < T
 *
 * This is useful for building test blocks whose PoW is trivially valid
 * without needing to run a real mining loop.
 */
export function makeSyntheticValidHash(target: bigint): string {
  const value = target > 0n ? target - 1n : 0n;
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }
  return hex;
}
