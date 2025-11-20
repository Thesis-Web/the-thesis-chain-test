import type { ChainState } from "../state.js";
import type { VaultOpTx } from "./types.js";

import {
  createVault,
  depositToVault,
  withdrawFromVault
} from "../../vault/vault.js";

/**
 * Apply a VAULT_OP transaction to chain state.
 * This is pure and deterministic.
 */
export function handleVaultOp(state: ChainState, tx: VaultOpTx): void {
  const height = state.height;

  switch (tx.op) {
    case "CREATE_VAULT":
      createVault(
        state.vaults,
        tx.vaultId,
        tx.actor,
        height,
        tx.kind,
        tx.euFaceValueEU,
        tx.wrappedSupplyTHE
      );
      return;

    case "DEPOSIT_VAULT":
      depositToVault(
        state.vaults,
        tx.vaultId,
        tx.amountTHE,
        height
      );
      return;

    case "WITHDRAW_VAULT":
      withdrawFromVault(
        state.vaults,
        tx.vaultId,
        tx.amountTHE,
        height
      );
      return;

    default:
      throw new Error(`Unknown VAULT_OP op: ${(tx as any).op}`);
  }
}
