// src/sims/eu-vm-sim.ts
// ---------------------------------------------------------------------------
// EU VM SIM (Pack 22.1) — consensus-side MINT_EU / REDEEM_EU
// ---------------------------------------------------------------------------
//
// Purpose:
//   - Prove that the consensus-side VM wiring for MINT_EU and REDEEM_EU
//     actually mutates the EuRegistry inside FullLedgerStateV1.
//   - Keep the sim small and explicit so it can be used as a regression
//     check whenever we touch EU tx semantics.
//
// This sim:
//   1. Creates an empty FullLedgerStateV1.
//   2. Creates and funds a vault for OWNER.
//   3. Applies a MINT_EU tx via applyBlockTx.
//   4. Applies a REDEEM_EU tx via applyBlockTx.
//   5. Prints EuRegistry shape before/after and runs basic invariants.
// ---------------------------------------------------------------------------

import { makeEmptyFullLedgerStateV1 } from "../consensus/ledger-state";
import { applyBlockTx } from "../consensus/tx/tx-dispatcher";
import type { TxMintEU, TxRedeemEU } from "../consensus/tx/tx-types";
import { createVault, depositToVault } from "../ledger/vault";
import { assertEuInvariants } from "../ledger/eu";
import type { Address, Amount, Hash } from "../types/primitives";

const OWNER: Address = "OWNER_EU_VM_SIM";
const VAULT_ID = "VAULT_EU_VM_SIM";
const INITIAL_VAULT_DEPOSIT: Amount = 1_000_000n;

// Dummy anchoring/hash values for the sim.
const DUMMY_CHAIN_HASH: Hash = "SIM_CHAIN_HASH" as Hash;
const DUMMY_INSTITUTION_ID = "SIM_TEST_BANK";
const DUMMY_ORACLE_VALUE_EU: bigint = 1_000n;

export function main(): void {
  console.log("=== EU VM SIM (Pack 22.1) ===");

  // 1) Start from an empty FullLedgerStateV1.
  const ledger0 = makeEmptyFullLedgerStateV1();

  console.log("\n--- GENESIS LEDGER ---");
  console.log("chain.height      :", ledger0.chain.height);
  console.log("vaults.size       :", ledger0.chain.vaults.size);
  console.log("eu.byId.size      :", ledger0.euCertRegistry.byId.size);
  console.log("eu.byOwner.size   :", ledger0.euCertRegistry.byOwner.size);

  // 2) Create and fund a vault for OWNER.
  createVault(ledger0.chain.vaults, VAULT_ID, OWNER);
  depositToVault(ledger0.chain.vaults, VAULT_ID, INITIAL_VAULT_DEPOSIT);

  console.log("\n--- AFTER VAULT SETUP ---");
  console.log("vaults.size       :", ledger0.chain.vaults.size);

  // 3) Apply a MINT_EU tx via the consensus VM.
  const mintTx: TxMintEU = {
    txType: "MINT_EU",
    owner: OWNER,
    euCertificateId: "EU_CERT_VM_001",
    backingVaultId: VAULT_ID,
    activatedByInstitutionId: DUMMY_INSTITUTION_ID,
    physicalBearer: true,
    oracleValueEUAtIssuance: DUMMY_ORACLE_VALUE_EU,
    chainHashProof: DUMMY_CHAIN_HASH
  };

  const ledger1 = applyBlockTx(ledger0, mintTx);

  console.log("\n--- AFTER MINT_EU ---");
  console.log("eu.byId.size      :", ledger1.euCertRegistry.byId.size);
  console.log("eu.byOwner.size   :", ledger1.euCertRegistry.byOwner.size);

  // 4) Apply a REDEEM_EU tx via the consensus VM.
  const redeemTx: TxRedeemEU = {
    txType: "REDEEM_EU",
    euCertificateId: mintTx.euCertificateId
  };

  const ledger2 = applyBlockTx(ledger1, redeemTx);

  console.log("\n--- AFTER REDEEM_EU ---");
  console.log("eu.byId.size      :", ledger2.euCertRegistry.byId.size);
  console.log("eu.byOwner.size   :", ledger2.euCertRegistry.byOwner.size);

  // 5) Run basic EU invariants for sanity.
  console.log("\n--- ASSERTING EU INVARIANTS ---");
  assertEuInvariants(ledger2.chain, ledger2.euCertRegistry);

  // --- PRINT EU STATUS DETAILS ---
console.log("\n--- EU STATUS DETAILS ---");

for (const [id, cert] of ledger2.euCertRegistry.byId.entries()) {
  console.log(`EU ${id}:`);
  console.log(`  owner: ${cert.owner}`);
  console.log(`  backingVaultId: ${cert.backingVaultId}`);
  console.log(`  status: ${cert.status}`);
  console.log(`  issuedAtHeight: ${cert.issuedAtHeight}`);
  console.log(`  oracleValueEUAtIssuance: ${cert.oracleValueEUAtIssuance}`);
  console.log(`  chainHashProof: ${cert.chainHashProof}`);
}


  console.log("\n=== EU VM SIM COMPLETE ===");
}

if (require.main === module) {
  main();
}
