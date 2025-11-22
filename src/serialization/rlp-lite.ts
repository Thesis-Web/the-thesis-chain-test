// src/serialization/rlp-lite.ts
// ---------------------------------------------------------------------------
// Minimal RLP-like encoder for THE
// ---------------------------------------------------------------------------
//
// We only need a tiny subset for now:
//   - encodeString(string)
//   - encodeBigInt(bigint)
//   - encodeNumber(number)
//   - encodeList(Buffer[])
//
// This is deterministic and stable, but not trying to be 100% Ethereum RLP.
// It’s "RLP-flavored" length-prefixed encoding:
//
//   SCALAR (bytes):
//     if len == 1 and byte < 0x80:   [byte]
//     if len <= 55:                  [0x80 + len] + bytes
//     else:                          [0xb7 + lenLen] + lenBytes + bytes
//
//   LIST (of already-encoded items):
//     let payload = concat(items)
//     if len(payload) <= 55:         [0xc0 + len] + payload
//     else:                          [0xf7 + lenLen] + lenBytes + payload
//
// This is good enough for:
//   - Tx leaves in the Merkle tree
//   - Future header/body encodings
// ---------------------------------------------------------------------------

function toBuffer(input: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

// Encode a scalar byte sequence with RLP-like rules.
function encodeScalarBytes(bytes: Buffer): Buffer {
  const len = bytes.length;

  if (len === 1 && bytes[0] < 0x80) {
    // Single byte, < 0x80 → itself.
    return bytes;
  }

  if (len <= 55) {
    const prefix = Buffer.from([0x80 + len]);
    return Buffer.concat([prefix, bytes]);
  }

  // Long scalar
  const lenBuf = encodeLength(len);
  const prefix = Buffer.from([0xb7 + lenBuf.length]);
  return Buffer.concat([prefix, lenBuf, bytes]);
}

// Encode length as big-endian bytes (no leading zeros).
function encodeLength(len: number): Buffer {
  if (len === 0) {
    return Buffer.from([0]);
  }

  const parts: number[] = [];
  let n = len >>> 0;
  while (n > 0) {
    parts.push(n & 0xff);
    n >>>= 8;
  }
  parts.reverse();
  return Buffer.from(parts);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function encodeBytes(input: Uint8Array | Buffer): Buffer {
  return encodeScalarBytes(toBuffer(input));
}

export function encodeString(input: string): Buffer {
  const bytes = Buffer.from(input, "utf8");
  return encodeScalarBytes(bytes);
}

export function encodeBigInt(value: bigint): Buffer {
  if (value === 0n) {
    // RLP-style zero → empty string scalar
    return encodeScalarBytes(Buffer.from([]));
  }

  const parts: number[] = [];
  let n = value < 0n ? -value : value; // we don’t expect negatives, but be safe

  while (n > 0n) {
    parts.push(Number(n & 0xffn));
    n >>= 8n;
  }
  parts.reverse();
  return encodeScalarBytes(Buffer.from(parts));
}

export function encodeNumber(value: number): Buffer {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`encodeNumber: expected non-negative safe integer, got ${value}`);
  }
  return encodeBigInt(BigInt(value));
}

export function encodeList(items: Buffer[]): Buffer {
  const payload = Buffer.concat(items);
  const len = payload.length;

  if (len <= 55) {
    const prefix = Buffer.from([0xc0 + len]);
    return Buffer.concat([prefix, payload]);
  }

  const lenBuf = encodeLength(len);
  const prefix = Buffer.from([0xf7 + lenBuf.length]);
  return Buffer.concat([prefix, lenBuf, payload]);
}
