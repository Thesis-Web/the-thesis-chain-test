// src/consensus/header-hash.ts
// ---------------------------------------------------------------------------
// Pack 14.0 — Proto L1 block header + canonical hashing
// ---------------------------------------------------------------------------
// This module defines a minimal L1 header shape and a canonical hash function.
// It does NOT mutate existing Block types yet; instead, it provides helpers
// that consensus / sims can call to derive block.hash from a structured header.
//
// Later packs can refine the encoding scheme if the whitepaper specifies a
// different format, but this gives us a stable, deterministic hashing surface
// to build PoW and sims against.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";

/**
 * Proto L1 header shape for Thesis L1.
 *
 * Fields:
 *  - parentHash: hex string of the parent block hash (or all zeros at genesis)
 *  - height: L1 height (0-based or 1-based as per Block.header.height)
 *  - timestampSec: unix timestamp (seconds)
 *  - nonce: arbitrary bigint used for PoW search
 *  - extraData: optional small string for tags / notes / future extensions
 */
export interface L1Header {
  readonly parentHash: string;
  readonly height: number;
  readonly timestampSec: number;
  readonly nonce: bigint;
  readonly extraData?: string;
}

/**
 * Canonical header hashing function.
 *
 * Encoding is deliberately simple and explicit:
 *  sha256(
 *    parentHash + "|" +
 *    height      + "|" +
 *    timestamp   + "|" +
 *    nonce       + "|" +
 *    extraData
 *  )
 *
 * All fields are stringified in a fixed order to avoid ambiguity. This can be
 * upgraded later (e.g. to a binary layout) before mainnet without breaking
 * anything in this repo.
 */
export function hashHeaderToHex(header: L1Header): string {
  const h = createHash("sha256");
  h.update(header.parentHash, "utf8");
  h.update("|");
  h.update(String(header.height), "utf8");
  h.update("|");
  h.update(String(header.timestampSec), "utf8");
  h.update("|");
  h.update(header.nonce.toString(10), "utf8");
  h.update("|");
  h.update(header.extraData ?? "", "utf8");
  return h.digest("hex");
}
