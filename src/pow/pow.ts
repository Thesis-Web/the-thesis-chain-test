// src/pow/pow.ts
// ---------------------------------------------------------------------------
// PoW Engine (v1 scaffold for THE)
// ---------------------------------------------------------------------------
//
// Goals:
//   - Real SHA-256 based proof-of-work
//   - Difficulty as a numeric "target" (BigInt)
//   - Stateless mining function usable by any node
//
// This module is intentionally standalone. It does **not** mutate ChainState;
// block.ts / node.ts / sims decide when and how to call it.
//

// Difficulty governor v0 wiring.
// This is kept optional and stateless: sims / node code decide when/how to
// call the governor to update PowState.target.
export { adjustDifficultyTarget, DEFAULT_DIFFICULTY_CONFIG } from "../emissions/difficulty-governor";


// THE-specific bits wired in here:
//   - Target block time is taken from emissions/params (4 minutes)
//   - Difficulty is expressed as a target in the 2^256 hash space
// ---------------------------------------------------------------------------

import * as crypto from "crypto";
import type { Hash } from "../types/primitives";
import { BLOCK_TIME_SECONDS } from "../emissions/params";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// PoW parameters — mostly here so we can evolve toward THE's final spec.
export interface PowParams {
  // Target time per block in seconds (THE uses ~4 minutes).
  readonly targetBlockTimeSec: number;

  // Max nonce attempts per mining call (to avoid infinite loops in sims).
  readonly maxNonce: bigint;

  // Initial target for hash-as-number. Smaller target = harder.
  readonly initialTarget: bigint;
}

// Simple state container for difficulty/target.
export interface PowState {
  target: bigint;
}

// ---------------------------------------------------------------------------
// Defaults tuned for sims (not mainnet)
// ---------------------------------------------------------------------------
//
// Hash space is 2^256. If we require ~11 leading zero bits on average,
// that corresponds to a target around 2^(256 - 11) = 2^245.
// This keeps sims fast while still clearly showing "harder/easier" moves.
// ---------------------------------------------------------------------------

export const DEFAULT_POW_PARAMS: PowParams = {
  targetBlockTimeSec: BLOCK_TIME_SECONDS, // THE canonical 4-minute target
  maxNonce: 1_000_000n,                   // cap for sims; tweak if needed
  initialTarget: 1n << 245n               // ≈ 11 leading zero bits on average
};

export function createInitialPowState(
  params: PowParams = DEFAULT_POW_PARAMS
): PowState {
  return {
    target: params.initialTarget
  };
}

// ---------------------------------------------------------------------------
// Helpers: SHA-256 → BigInt
// ---------------------------------------------------------------------------

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Interpret a hex string as an unsigned BigInt.
function hexToBigInt(hex: string): bigint {
  return BigInt("0x" + hex);
}

// Hash headerData + nonce → { hashHex, hashValue }
export function powHash(
  headerData: string,
  nonce: bigint
): { hashHex: string; hashValue: bigint } {
  const combined = `${headerData}|${nonce.toString()}`;
  const hashHex = sha256Hex(combined);
  const hashValue = hexToBigInt(hashHex);
  return { hashHex, hashValue };
}

// ---------------------------------------------------------------------------
// Approx difficulty → "leading zero bits" (for logging)
// ---------------------------------------------------------------------------

/**
 * Roughly estimate "how many leading zero bits" a target corresponds to.
 * This is purely for debug / logging, not for consensus-critical math.
 */
export function approxLeadingZeroBitsFromTarget(target: bigint): number {
  if (target <= 0n) return 0;

  // Convert to Number just for log2; magnitude is well below 2^1024.
  const tNum = Number(target);
  if (!Number.isFinite(tNum) || tNum <= 0) return 0;

  const bits = Math.log2(tNum);
  const leadingZeroBits = 256 - Math.round(bits);
  return leadingZeroBits < 0 ? 0 : leadingZeroBits;
}

// ---------------------------------------------------------------------------
// Mining
// ---------------------------------------------------------------------------
//
// Mine until we find a nonce such that hashValue <= target,
// or until we exhaust maxNonce.
// ---------------------------------------------------------------------------

export interface MineResult {
  nonce: bigint;
  hash: Hash;
  attempts: bigint;
}

export function mineHeader(
  headerData: string,
  state: PowState,
  params: PowParams = DEFAULT_POW_PARAMS
): MineResult {
  const { target } = state;
  const { maxNonce } = params;

  let nonce = 0n;
  let attempts = 0n;

  while (nonce <= maxNonce) {
    const { hashHex, hashValue } = powHash(headerData, nonce);
    attempts++;

    if (hashValue <= target) {
      // Found a valid PoW.
      return {
        nonce,
        hash: hashHex as Hash,
        attempts
      };
    }

    nonce++;
  }

  throw new Error(
    `PoW: failed to find a valid nonce within maxNonce=${maxNonce.toString()}`
  );
}

// ---------------------------------------------------------------------------
// Difficulty / target adjustment (scaffold)
// ---------------------------------------------------------------------------
//
// Later we will:
//   - Track average block time across an epoch
//   - Compare to targetBlockTimeSec
//   - Adjust `target` up/down (harder/easier)
//
// For now, we only expose simple "makeEasier/makeHarder" hooks so that
// sims can demonstrate target changes without touching core logic.
// ---------------------------------------------------------------------------

/**
 * Easier mining → bigger target.
 */
export function makeEasier(state: PowState, factor: bigint): void {
  if (factor <= 0n) return;
  state.target *= factor;
}

/**
 * Harder mining → smaller target.
 */
export function makeHarder(state: PowState, factor: bigint): void {
  if (factor <= 0n) return;
  state.target /= factor;
}
