// TARGET: chain src/sims/tx-vm-bootstrap-sim.ts
// ---------------------------------------------------------------------------
// TX VM Bootstrap Sim (Enhanced Debug)
// ---------------------------------------------------------------------------

import { initFullLedgerState } from "../fullstate/state";
import { applyBlockTx } from "../consensus/tx/tx-dispatcher";
import { TheTx } from "../consensus/tx/tx-types";

const alice = "alice";
const bob = "bob";

// Initialize ledger
const ledger = initFullLedgerState();

// Seed Alice with 100 THE units
ledger.chain.accounts.set(alice, {
  balanceTHE: 1_0000_0000n,
});

function logState(label: string) {
  console.log(`\\n--- ${label} ---`);
  console.log("Accounts:");
  for (const [addr, acct] of ledger.chain.accounts.entries()) {
    console.log(`  ${addr}: balanceTHE=${acct.balanceTHE}`);
  }

  console.log("Vaults:");
  for (const [vaultId, v] of ledger.vault.vaults.entries()) {
    console.log(`  vaultId=${vaultId} owner=${v.owner} balanceTHE=${v.balanceTHE}`);
  }

  console.log("EU Registry:");
  for (const [euId, c] of ledger.eu.certificates.entries()) {
    console.log(`  EU=${euId} owner=${c.owner} backingVault=${c.backingVaultId}`);
  }
}

logState("initial state");

// Transactions reordered to match updated ledger rules
const txVaultCreate: TheTx = {
  txType: "VAULT_CREATE",
  owner: alice,
} as TheTx;

const txVaultDeposit: TheTx = {
  txType: "VAULT_DEPOSIT",
  vaultId: "vault-1",
  amountTHE: 10_0000_000n
} as TheTx;

const txTransfer: TheTx = {
  txType: "TRANSFER_THE",
  from: alice,
  to: bob,
  amountTHE: 25_0000_000n // 25 THE
} as TheTx;

const txMintEu: TheTx = {
  txType: "MINT_EU",
  owner: alice,
  euCertificateId: "eu-1",
  backingVaultId: "vault-1",
  activatedByInstitutionId: "inst-1",
  physicalBearer: false,
  oracleValueEUAtIssuance: 25.0,
  chainHashProof: "proof-mint"
} as TheTx;

const txRedeemEu: TheTx = {
  txType: "REDEEM_EU",
  euCertificateId: "eu-1",
  redeemVaultId: "vault-1"
} as TheTx;

const txs: TheTx[] = [
  txVaultCreate,
  txVaultDeposit,
  txTransfer,
  txMintEu,
  txRedeemEu
];

let height = 0;
for (const tx of txs) {
  console.log(`\\n>>> Applying txType=${tx.txType}`);
  applyBlockTx(ledger, tx, height);
  height++;
  logState(`after ${tx.txType}`);
}

console.log("\\n=== TX VM BOOTSTRAP SIM COMPLETE ===");

