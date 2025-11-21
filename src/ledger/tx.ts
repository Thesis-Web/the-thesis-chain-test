// src/ledger/tx.ts
// ---------------------------------------------------------------------------
// Transaction types (v1)
//  - Payment is currently defined in block.ts
//  - This module defines vault-related txs
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";

// Create a new vault owned by `owner`.
export interface VaultCreateTx {
  readonly txType: "VAULT_CREATE";
  readonly vaultId: string;
  readonly owner: Address;
}

// Deposit THE into an existing vault.
export interface VaultDepositTx {
  readonly txType: "VAULT_DEPOSIT";
  readonly vaultId: string;
  readonly amount: Amount;
}

// Withdraw THE from an existing vault.
export interface VaultWithdrawTx {
  readonly txType: "VAULT_WITHDRAW";
  readonly vaultId: string;
  readonly amount: Amount;
}

// Union of all vault txs (used in block.ts).
export type VaultTx = VaultCreateTx | VaultDepositTx | VaultWithdrawTx;
