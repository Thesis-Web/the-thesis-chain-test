import type { Address, Amount } from "../types/primitives.js";

// Vaults are the chain-side representation of "vault boxes" that back EU
// certificates, wTHE-backing escrow, or other protocol-controlled balances.
// This file only defines the core shape; §§096 / 096a / 101 mechanics and
// vault-type-specific behavior will be layered on top.

export type VaultId = string;

export type VaultKind =
  | "GENERIC"       // simple escrow, used by early sims / generic ops
  | "EU_CERT"       // backing a physical/digital EU Certificate
  | "WTHE_BACKING"; // backing wrapped THE on the fast rail

// Minimal state for a single vault. We keep this intentionally small and
// conservative so we don't over-specify before wiring the full spec.
export interface VaultState {
  readonly id: VaultId;
  readonly owner: Address;

  // High-level classification of the vault; controls split behavior etc.
  kind: VaultKind;

  // Balance of THE in base units (pre-display). This is the stuff that must
  // obey all split invariants and 1:1 redemption rules.
  balanceTHE: Amount;

  // Chain height metadata (for audits & explorers).
  readonly createdAtHeight: number;
  updatedAtHeight: number;
}

// Convenience alias for collections of vaults.
export type VaultMap = Map<VaultId, VaultState>;
