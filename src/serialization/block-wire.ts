// src/serialization/block-wire.ts
// ---------------------------------------------------------------------------
// Wire serialization (v1) for THE blocks
// ---------------------------------------------------------------------------
//
// Goal:
//   - A stable, BigInt-safe wire format for Block / txs
//   - Non-invasive: does NOT affect consensus or hashing
//   - Works in Node over plain JSON UTF-8 bytes
//
// Strategy:
//   - Encode Block → JSON string with a BigInt-safe replacer
//   - Decode bytes → Block and normalize BigInt fields
//
// This is THE-specific, not vanilla Bitcoin, because it preserves
// our tx types (PAYMENT, VAULT_*) and THE Amount semantics.
// ---------------------------------------------------------------------------

import type { Block, AnyTx } from "../ledger/block";
import type { Amount } from "../types/primitives";

// ---------------------------------------------------------------------------
// Internal helpers: BigInt <-> string for JSON
// ---------------------------------------------------------------------------

// JSON.stringify replacer: BigInt -> decimal string
function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString(10);
  }
  return value;
}

// Normalize AnyTx after JSON.parse: re-hydrate Amount fields as BigInt.
function normalizeTxBigInts(tx: any): AnyTx {
  switch (tx.txType) {
    case "PAYMENT":
    case "VAULT_DEPOSIT":
    case "VAULT_WITHDRAW": {
      if (typeof tx.amount === "string") {
        tx.amount = BigInt(tx.amount) as Amount;
      }
      return tx as AnyTx;
    }

    case "VAULT_CREATE": {
      // No BigInt fields yet
      return tx as AnyTx;
    }

    default: {
      // If we ever add new tx types and forget to handle them,
      // this throws loudly instead of silently corrupting.
      throw new Error(`normalizeTxBigInts: unknown txType ${(tx as any).txType}`);
    }
  }
}

// Normalize an entire Block object produced by JSON.parse().
function normalizeBlock(raw: any): Block {
  if (!raw || typeof raw !== "object") {
    throw new Error("normalizeBlock: expected object");
  }

  if (!Array.isArray(raw.txs)) {
    throw new Error("normalizeBlock: expected txs array");
  }

  raw.txs = raw.txs.map((tx: any) => normalizeTxBigInts(tx));

  // height, timestamp are numbers in our in-memory model.
  if (typeof raw.header?.height === "string") {
    raw.header.height = parseInt(raw.header.height, 10);
  }
  if (typeof raw.header?.timestamp === "string") {
    raw.header.timestamp = parseInt(raw.header.timestamp, 10);
  }

  // prevHash may be null or string; JSON preserves null fine.
  // hash/bodyRoot are optional and may be undefined or string; leave as-is.

  return raw as Block;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encode a Block into a UTF-8 JSON byte array suitable for sending
 * over the wire or storing in logs.
 */
export function encodeBlockToJsonWire(block: Block): Uint8Array {
  // For forward-compat: we could choose to strip `header.hash` here
  // and make it purely derived, but for now we include full header+txs.
  const json = JSON.stringify(block, bigintReplacer);
  return Buffer.from(json, "utf8");
}

/**
 * Decode bytes previously produced by encodeBlockToJsonWire back into
 * a typed Block, re-hydrating BigInt Amount fields.
 */
export function decodeBlockFromJsonWire(bytes: Uint8Array): Block {
  const json = Buffer.from(bytes).toString("utf8");
  const raw = JSON.parse(json);
  return normalizeBlock(raw);
}
