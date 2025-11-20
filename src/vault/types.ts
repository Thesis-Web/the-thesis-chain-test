import type { Address, Amount } from "../types/primitives.js";

// Vaults are the chain-side representation of "vault boxes" that back EU
// certificates and similar instruments. This file only defines the core
// shape; §096 / §096a / §101 mechanics will be layered on top.

export type VaultId = string;

// Minimal state for a single vault. We keep this intentionally small and
// conservative so we don't over-specify before wiring the full spec.
export interface VaultState {
  readonly id: VaultId;
  readonly owner: Address;

  // Balance of THE in base units (pre-display). This is the stuff that must
  // obey all split invariants and 1:1 redemption rules with EU certificates.
  balanceTHE: Amount;

  // Chain height metadata (for audits & explorers).
  readonly createdAtHeight: number;
  updatedAtHeight: number;
}

// Convenience alias for collections of vaults.
export type VaultMap = Map<VaultId, VaultState>;
