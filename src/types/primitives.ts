// Low-level primitives used across the chain implementation.
// These are intentionally minimal; higher-level invariants live in dedicated modules.

export type Hash = string;       // e.g. hex-encoded 32-byte hash
export type Address = string;    // e.g. Thesis address / pubkey hash
export type Amount = bigint;     // THE, EU, or sub-units, depending on context

export type Height = number;     // block height (0-based)
export type UnixTimeSeconds = number;

// Helper to ensure we never accidentally pass a JS number where bigint is required.
export function toAmount(n: number | string | bigint): Amount {
  if (typeof n === "bigint") return n;
  if (typeof n === "number") return BigInt(Math.trunc(n));
  return BigInt(n);
}

