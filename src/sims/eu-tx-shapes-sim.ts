// TARGET: chain src/sims/eu-tx-shapes-sim.ts
// src/sims/eu-tx-shapes-sim.ts
// ---------------------------------------------------------------------------
// EU TX SHAPES SIM (Pack 22.1) — block-style EU flow
// ---------------------------------------------------------------------------
//
// Purpose:
//   - Exercise a small block-style sequence of EU-related txs using the
//     consensus VM dispatcher, without rewards or mining.
//   - Provide a simple "does it run" harness that can be wired into CI.
//
// This sim:
//   1. Creates an empty FullLedgerStateV1.
//   2. Sets up two vaults for two owners and funds them.
//   3. Applies two MINT_EU txs (one per vault).
//   4. Applies a REDEEM_EU for one of them.
//   5. Prints a summary of the resulting EuRegistry.
// ---------------------------------------------------------------------------

import { makeEmptyFullLedgerStateV1 } from "../consensus/ledger-state";
import { applyBlockTx } from "../consensus/tx/tx-dispatcher";
import type { TxMintEU, TxRedeemEU } from "../consensus/tx/tx-types";
import { createVault, depositToVault } from "../ledger/vault";
import {
  getEuCertificate,
  isEuActive,
  isEuRedeemed,
  assertEuInvariants
} from "../ledger/eu";
import type { Address, Amount, Hash } from "../types/primitives";

const OWNER_A: Address = "OWNER_EU_SHAPES_A";
const OWNER_B: Address = "OWNER_EU_SHAPES_B";
const VAULT_A_ID = "VAULT_EU_SHAPES_A";
const VAULT_B_ID = "VAULT_EU_SHAPES_B";
const DEPOSIT_A: Amount = 500_000n;
const DEPOSIT_B: Amount = 750_000n;

const DUMMY_INSTITUTION_ID_A = "SIM_TEST_BANK_A";
const DUMMY_INSTITUTION_ID_B = "SIM_TEST_BANK_B";
const DUMMY_CHAIN_HASH_A: Hash = "SIM_CHAIN_HASH_A" as Hash;
const DUMMY_CHAIN_HASH_B: Hash = "SIM_CHAIN_HASH_B" as Hash;
const DUMMY_ORACLE_VALUE_A: bigint = 1_000n;
const DUMMY_ORACLE_VALUE_B: bigint = 2_000n;

export function main(): void {
  console.log("=== EU TX SHAPES SIM (Pack 22.1) ===");

  // 1) Start from an empty FullLedgerStateV1.
  const ledger0 = makeEmptyFullLedgerStateV1();

  // 2) Create and fund two vaults.
  createVault(ledger0.chain.vaults, VAULT_A_ID, OWNER_A);
  createVault(ledger0.chain.vaults, VAULT_B_ID, OWNER_B);
  depositToVault(ledger0.chain.vaults, VAULT_A_ID, DEPOSIT_A);
  depositToVault(ledger0.chain.vaults, VAULT_B_ID, DEPOSIT_B);

  // 3) Apply two MINT_EU txs.
  const mintTxA: TxMintEU = {
    txType: "MINT_EU",
    owner: OWNER_A,
    euCertificateId: "EU_CERT_SHAPES_A_001",
    backingVaultId: VAULT_A_ID,
    activatedByInstitutionId: DUMMY_INSTITUTION_ID_A,
    physicalBearer: true,
    oracleValueEUAtIssuance: DUMMY_ORACLE_VALUE_A,
    chainHashProof: DUMMY_CHAIN_HASH_A
  };

  const mintTxB: TxMintEU = {
    txType: "MINT_EU",
    owner: OWNER_B,
    euCertificateId: "EU_CERT_SHAPES_B_001",
    backingVaultId: VAULT_B_ID,
    activatedByInstitutionId: DUMMY_INSTITUTION_ID_B,
    physicalBearer: true,
    oracleValueEUAtIssuance: DUMMY_ORACLE_VALUE_B,
    chainHashProof: DUMMY_CHAIN_HASH_B
  };

  const ledger1 = applyBlockTx(ledger0, mintTxA);
  const ledger2 = applyBlockTx(ledger1, mintTxB);

  // 4) Apply a REDEEM_EU for cert A.
  const redeemTxA: TxRedeemEU = {
    txType: "REDEEM_EU",
    euCertificateId: mintTxA.euCertificateId
  };

  const ledger3 = applyBlockTx(ledger2, redeemTxA);

  // 5) Print summary of resulting EuRegistry.
  console.log("\n--- FINAL EU REGISTRY ---");
  const certA = getEuCertificate(ledger3.eu, mintTxA.euCertificateId);
  const certB = getEuCertificate(ledger3.eu, mintTxB.euCertificateId);

  console.log("certA:", certA);
  console.log("certB:", certB);

  console.log("\n--- Helper predicates ---");
  console.log("isEuActive(A):   ", isEuActive(ledger3.eu, mintTxA.euCertificateId));
  console.log("isEuRedeemed(A): ", isEuRedeemed(ledger3.eu, mintTxA.euCertificateId));
  console.log("isEuActive(B):   ", isEuActive(ledger3.eu, mintTxB.euCertificateId));
  console.log("isEuRedeemed(B): ", isEuRedeemed(ledger3.eu, mintTxB.euCertificateId));

  console.log("\n--- Asserting invariants ---");
  assertEuInvariants(ledger3.chain, ledger3.eu);

  console.log("\n=== EU TX SHAPES SIM COMPLETE ===");
}

if (require.main === module) {
  main();
}
