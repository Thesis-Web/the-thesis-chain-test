// src/sims/eu-ledger-sim.ts
// ---------------------------------------------------------------------------
// EU Ledger Sim (Pack 12) — sanity-check EU registry + vault integration
// ---------------------------------------------------------------------------
//
// This sim exercises the EU registry on top of the existing ChainState
// (accounts + vaults) without touching consensus or block processing.
//
// Steps:
//   • Create an empty ChainState.
//   • Create a vault for an address and fund it with THE.
//   • Register an EU certificate bound to that vault.
//   • Check invariants and print a small summary.
// ---------------------------------------------------------------------------

import { createEmptyChainState, creditAccount } from "../ledger/state";
import {
  createVault,
  depositToVault,
  type VaultId
} from "../ledger/vault";
import {
  createEmptyEuRegistry,
  registerEuCertificate,
  markEuRedeemed,
  getEuCertificatesForOwner,
  assertEuInvariants,
  type EuCertificate
} from "../ledger/eu";
import type { ChainState } from "../ledger/state";
import type { Address, Amount } from "../types/primitives";

function runSim(): void {
  console.log("=== EU LEDGER SIM (Pack 12) ===");

  const owner: Address = "eu-owner-addr-1";
  const vaultId: VaultId = "EU_VAULT_001";
  const issueHeight = 100;

  // 1) Start from empty ChainState.
  const chain: ChainState = createEmptyChainState();

  // Give the owner some THE in their account for context.
  const initialCredit: Amount = 1_000n;
  creditAccount(chain, owner, initialCredit);

  // 2) Create a vault and deposit THE into it.
  const vault = createVault(chain.vaults, vaultId, owner);
  const vaultDeposit: Amount = 500n;
  depositToVault(chain.vaults, vaultId, vaultDeposit);

  // 3) Create an EU registry and register one certificate bound to this vault.
  const registry = createEmptyEuRegistry();

  const cert: EuCertificate = {
    id: "EU_CERT_001",
    owner,
    activatedByInstitutionId: "SIM_LEDGER_BANK",
    physicalBearer: true,
    issuedAtHeight: issueHeight,
    chainHashProof: "SIM_LEDGER_HASH",
    oracleValueEUAtIssuance: 1_000n,
    backingVaultId: vaultId,
    status: "ACTIVE"
  };

  registerEuCertificate(chain, registry, cert);

  // 4) Check invariants.
  assertEuInvariants(chain, registry);

  // 5) Print a small summary.
  const ownerCerts = getEuCertificatesForOwner(registry, owner);

  console.log("--- Chain snapshot ---");
  console.log("height:", chain.height);
  console.log("lastBlockHash:", chain.lastBlockHash);
  console.log("accounts.size:", chain.accounts.size);
  console.log("vaults.size:", chain.vaults.size);

  console.log("--- Vault ---");
  console.log("vaultId:", vault.id);
  console.log("vaultOwner:", vault.owner);
  console.log("vaultBalanceTHE:", vault.balanceTHE.toString());

  console.log("--- EU Certificates for owner ---");
  for (const c of ownerCerts) {
    console.log(
      "EU id=", c.id,
      "status=", c.status,
      "backingVaultId=", c.backingVaultId,
      "issuedAtHeight=", c.issuedAtHeight
    );
  }

  // 6) Redeem the EU certificate and re-check invariants.
  markEuRedeemed(registry, cert.id);
  assertEuInvariants(chain, registry);

  console.log("--- After redemption ---");
  const after = getEuCertificatesForOwner(registry, owner);
  for (const c of after) {
    console.log(
      "EU id=", c.id,
      "status=", c.status,
      "backingVaultId=", c.backingVaultId
    );
  }

  console.log("=== EU LEDGER SIM COMPLETE ===");
}

runSim();
