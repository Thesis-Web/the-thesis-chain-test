// TARGET: chain src/sims/tx-vm-bootstrap-sim.ts
// src/sims/tx-vm-bootstrap-sim.ts
// ---------------------------------------------------------------------------
// Pack 57 — TX VM Bootstrap Smoke Test
// ---------------------------------------------------------------------------
//
// This sim is a small, concrete smoke test for the consensus TX VM
// (applyBlockTx). It intentionally:
//   • avoids any dependency on the internal FullLedgerStateV1 TypeScript type
//     by treating the ledger as `any`, while still constructing a runtime
//     shape that passes isFullLedgerStateV1().
//   • runs a tiny scenario covering:
//       - TRANSFER_THE (accounts move),
//       - VAULT_CREATE / VAULT_DEPOSIT,
//       - MINT_EU (certificate registration),
//       - REDEEM_EU (status flip).
//
// The goal is **behavioral** confirmation that the VM wiring is alive, not
// economic realism. All addresses / IDs are toy strings, balances are tiny.
// ---------------------------------------------------------------------------

import { createEmptyChainState } from "../ledger/state";
import { createEmptyEuRegistry } from "../ledger/eu";

import type { TheTx, TxMintEU } from "../consensus/tx/tx-types";
import { applyBlockTx } from "../consensus/tx/tx-dispatcher";
import type { Address } from "../types/primitives";
import type { VaultId } from "../ledger/vault";
import type { EuCertificateId } from "../ledger/eu";

type AnyLedger = any;

function makeEmptyVmLedger(): AnyLedger {
  const chain = createEmptyChainState();
  const eu = createEmptyEuRegistry();
  return { chain, eu };
}

function logAccounts(label: string, ledger: AnyLedger): void {
  console.log(`--- ${label} (accounts) ---`);
  for (const [addr, acct] of ledger.chain.accounts.entries()) {
    console.log(
      `  addr=${addr} balanceTHE=${acct.balanceTHE.toString()}`
    );
  }
}

function logVaults(label: string, ledger: AnyLedger): void {
  console.log(`--- ${label} (vaults) ---`);
  for (const [id, vault] of ledger.chain.vaults.entries()) {
    console.log(
      `  vaultId=${id} owner=${vault.owner} balanceTHE=${vault.balanceTHE.toString()}`
    );
  }
}

function logEuRegistry(label: string, ledger: AnyLedger): void {
  console.log(`--- ${label} (EU registry) ---`);
  const byId = ledger.eu.byId as Map<EuCertificateId, any>;
  for (const [id, cert] of byId.entries()) {
    console.log(
      `  certId=${id} owner=${cert.owner} status=${cert.status} vault=${cert.backingVaultId} issuedAtHeight=${cert.issuedAtHeight}`
    );
  }
}

console.log("=== TX VM BOOTSTRAP SIM (Pack 57) ===");

// ---------------------------------------------------------------------------
// 1) Initial ledger
// ---------------------------------------------------------------------------

let ledger: AnyLedger = makeEmptyVmLedger();

const alice = "alice" as Address;
const bob = "bob" as Address;

// Seed Alice with some THE so we have something to move.
ledger.chain.accounts.set(alice, {
  balanceTHE: 1_0000_0000n, // 100 THE in 1e6-style units, if we ever add decimals
});

logAccounts("initial", ledger);
logVaults("initial", ledger);
logEuRegistry("initial", ledger);

// ---------------------------------------------------------------------------
// 2) TRANSFER_THE: Alice -> Bob
// ---------------------------------------------------------------------------

const txTransfer: TheTx = {
  txType: "TRANSFER_THE",
  from: alice,
  to: bob,
  amountTHE: 25_0000_0000n // move 25 THE
} as TheTx;

ledger = applyBlockTx(ledger, txTransfer);
logAccounts("after TRANSFER_THE", ledger);

// ---------------------------------------------------------------------------
// 3) VAULT_CREATE + VAULT_DEPOSIT
// ---------------------------------------------------------------------------

const vaultId = "vault-1" as VaultId;

const txVaultCreate: TheTx = {
  txType: "VAULT_CREATE",
  vaultId,
  owner: alice
} as TheTx;

const txVaultDeposit: TheTx = {
  txType: "VAULT_DEPOSIT",
  vaultId,
  amountTHE: 10_0000_0000n
} as TheTx;

ledger = applyBlockTx(ledger, txVaultCreate);
ledger = applyBlockTx(ledger, txVaultDeposit);

logVaults("after VAULT_CREATE + VAULT_DEPOSIT", ledger);

// ---------------------------------------------------------------------------
// 4) MINT_EU: register a certificate backed by vault-1
// ---------------------------------------------------------------------------

const certId = "cert-1" as EuCertificateId;

const mintTx: TxMintEU = {
  txType: "MINT_EU",
  owner: alice,
  euCertificateId: certId,
  backingVaultId: vaultId,
  activatedByInstitutionId: "inst-1",
  physicalBearer: true,
  oracleValueEUAtIssuance: 1000n,
  chainHashProof: "tx-vm-bootstrap-sim"
};

ledger = applyBlockTx(ledger, mintTx as unknown as TheTx);

logEuRegistry("after MINT_EU", ledger);

// ---------------------------------------------------------------------------
// 5) REDEEM_EU: mark the certificate as redeemed
// ---------------------------------------------------------------------------

const txRedeem: TheTx = {
  txType: "REDEEM_EU",
  euCertificateId: certId
} as TheTx;

ledger = applyBlockTx(ledger, txRedeem);

logEuRegistry("after REDEEM_EU", ledger);

console.log("=== TX VM BOOTSTRAP SIM COMPLETE ===");
