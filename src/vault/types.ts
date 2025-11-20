import type { Address, Amount } from "../types/primitives.js";

// Vaults are the chain-side representation of "vault boxes" that back EU
// certificates, wTHE-backing escrow, or other protocol-controlled balances.
// §§096 / 096a / 101 will define the full behavior; here we just encode the
// minimal shape and key invariants.

export type VaultId = string;

export type VaultKind =
  | "GENERIC"       // simple escrow, used by early sims / generic ops
  | "EU_CERT"       // backing a physical/digital EU Certificate
  | "WTHE_BACKING"; // backing wrapped THE on the fast rail

// Minimal state for a single vault. We keep this intentionally small and
// conservative so we don't over-specify before wiring the full spec.
export interface VaultState {
  readonly id: VaultId;
  readonly owner: Address;   // typically BoT / bank / protocol actor

  // High-level classification of the vault; controls split behavior etc.
  kind: VaultKind;

  // Balance of THE in base units (pre-display). This is the stuff that must
  // obey all split invariants and 1:1 redemption rules.
  balanceTHE: Amount;

  // --- Kind-specific metadata (optional for now) ---

  // For EU_CERT vaults: face value in EU units (base EU, not THE).
  // The oracle / BoT module is responsible for translating EU → THE at
  // issuance time; the vault only stores the result.
  euFaceValueEU?: bigint;

  // For WTHE_BACKING vaults: total wTHE units this vault is backing 1:1.
  // The fast rail / wTHE module keeps this in sync with wrapped supply.
  wrappedSupplyTHE?: Amount;

  // Chain height metadata (for audits & explorers).
  readonly createdAtHeight: number;
  updatedAtHeight: number;
}

// Convenience alias for collections of vaults.
export type VaultMap = Map<VaultId, VaultState>;
