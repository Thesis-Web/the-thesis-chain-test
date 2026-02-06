// src/sims/vault-vm-sim.ts
// ---------------------------------------------------------------------------
// VAULT VM SIM (Pack 23) — consensus-side VAULT_* txs
// ---------------------------------------------------------------------------
//
// Purpose:
//   - Exercise VAULT_CREATE / VAULT_DEPOSIT / VAULT_WITHDRAW through the
//     consensus tx dispatcher against a FullLedgerStateV1.
//   - Provide a simple regression harness for future vault / BoT changes.
//
// Scenario:
//   1. Start from an empty FullLedgerStateV1.
//   2. Apply VAULT_CREATE for a single vault owned by OWNER.
//   3. Apply two VAULT_DEPOSIT txs.
//   4. Apply a VAULT_WITHDRAW tx.
//   5. Print final vault state and basic invariants.
//
// NOTE:
//   - This sim intentionally does *not* wire account-level debits/credits for
//     deposits/withdrawals yet; that will be layered on in later packs.
// ---------------------------------------------------------------------------

import { makeEmptyFullLedgerStateV1 } from "../consensus/ledger-state";
import { applyBlockTx } from "../consensus/tx/tx-dispatcher";
import type {
  TxVaultCreate,
  TxVaultDeposit,
  TxVaultWithdraw
} from "../consensus/tx/tx-types";
import type { Address, Amount } from "../types/primitives";
import { getVault } from "../ledger/vault";

const OWNER: Address = "OWNER_VAULT_VM_SIM";
const VAULT_ID = "VAULT_VM_SIM";

const DEPOSIT_1: Amount = 100_000n;
const DEPOSIT_2: Amount = 50_000n;
const WITHDRAW_1: Amount = 80_000n;

export function main(): void {
  console.log("=== VAULT VM SIM (Pack 23) ===");

  // 1) Start from an empty FullLedgerStateV1.
  const ledger0 = makeEmptyFullLedgerStateV1();
  console.log("\n--- GENESIS LEDGER ---");
  console.log("vaults.size       :", ledger0.chain.vaults.size);

  // 2) Apply VAULT_CREATE.
  const createTx: TxVaultCreate = {
    txType: "VAULT_CREATE",
    vaultId: VAULT_ID,
    owner: OWNER
  };

  const ledger1 = applyBlockTx(ledger0, createTx);
  console.log("\n--- AFTER VAULT_CREATE ---");
  console.log("vaults.size       :", ledger1.chain.vaults.size);

  // 3) Apply two VAULT_DEPOSIT txs.
  const deposit1: TxVaultDeposit = {
    txType: "VAULT_DEPOSIT",
    vaultId: VAULT_ID,
    amountTHE: DEPOSIT_1
  };

  const deposit2: TxVaultDeposit = {
    txType: "VAULT_DEPOSIT",
    vaultId: VAULT_ID,
    amountTHE: DEPOSIT_2
  };

  const ledger2 = applyBlockTx(ledger1, deposit1);
  const ledger3 = applyBlockTx(ledger2, deposit2);

  // 4) Apply a VAULT_WITHDRAW tx.
  const withdraw1: TxVaultWithdraw = {
    txType: "VAULT_WITHDRAW",
    vaultId: VAULT_ID,
    amountTHE: WITHDRAW_1
  };

  const ledger4 = applyBlockTx(ledger3, withdraw1);

  // 5) Inspect final vault state via ledger.vaults.
  console.log("\n--- FINAL VAULT STATE ---");
  const finalVault = getVault(ledger4.chain.vaults, VAULT_ID);
  console.log("vault.id          :", finalVault.id);
  console.log("vault.owner       :", finalVault.owner);
  console.log("vault.balanceTHE  :", finalVault.balanceTHE);

  const expectedBalance = DEPOSIT_1 + DEPOSIT_2 - WITHDRAW_1;
  console.log("expected balance  :", expectedBalance);

  if (finalVault.balanceTHE !== expectedBalance) {
    throw new Error("VAULT VM SIM: invariant failed (balance mismatch)");
  }

  console.log("\n=== VAULT VM SIM COMPLETE ===");
}

if (require.main === module) {
  main();
}
