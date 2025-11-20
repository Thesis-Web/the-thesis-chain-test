import type { Amount } from "../../types/primitives.js";
import type { Address } from "../../types/primitives.js";
import type { VaultKind } from "../../vault/types.js";

// -----------------------------------------------------------
// VAULT_OP transaction family
// -----------------------------------------------------------

export type VaultOpKind =
  | "CREATE_VAULT"
  | "DEPOSIT_VAULT"
  | "WITHDRAW_VAULT";

// Base shape all VAULT_OPs share
export interface BaseVaultOp {
  readonly txType: "VAULT_OP";
  readonly op: VaultOpKind;
  readonly vaultId: string;
  readonly actor: Address;     // Who initiated the op (BoT, system, user)
}

// CREATE_VAULT
export interface CreateVaultOp extends BaseVaultOp {
  readonly op: "CREATE_VAULT";
  readonly kind: VaultKind;          // EU_CERT | WTHE_BACKING | GENERIC
  readonly euFaceValueEU?: Amount;   // Required only for EU_CERT
  readonly wrappedSupplyTHE?: Amount; // Required only for WTHE_BACKING
}

// DEPOSIT_VAULT
export interface DepositVaultOp extends BaseVaultOp {
  readonly op: "DEPOSIT_VAULT";
  readonly amountTHE: Amount;
}

// WITHDRAW_VAULT
export interface WithdrawVaultOp extends BaseVaultOp {
  readonly op: "WITHDRAW_VAULT";
  readonly amountTHE: Amount;
}

// Union of all
export type VaultOpTx =
  | CreateVaultOp
  | DepositVaultOp
  | WithdrawVaultOp;

// Export in higher-level ledger union
export type AnyLedgerTx =
  | VaultOpTx;
