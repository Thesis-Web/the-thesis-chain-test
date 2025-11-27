// TARGET: chain src/sims/eu-ledger-sim-2.ts
// src/sims/eu-ledger-sim-2.ts
// ---------------------------------------------------------------------------
// EU Ledger Sim 2 (Pack 12.2) — multi-owner, multi-vault scenario
// ---------------------------------------------------------------------------
//
// This sim exercises a richer EU + vault topology:
//
//   • Two owners, two vaults.
//   • Each owner gets an EU bound to their vault.
//   • We check invariants, redeem one EU, and re-check.
//   • We also query owner views and helper predicates.
//
// This stays completely outside consensus and block processing. It is a
// pure ledger+registry sanity check.
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
  getEuCertificate,
  isEuActive,
  isEuRedeemed,
  assertEuInvariants,
  type EuCertificate
} from "../ledger/eu";
import type { ChainState } from "../ledger/state";
import type { Address, Amount } from "../types/primitives";

function runSim(): void {
  console.log("=== EU LEDGER SIM 2 (Pack 12.2) ===");

  const ownerA: Address = "eu-owner-A";
  const ownerB: Address = "eu-owner-B";

  const vaultAId: VaultId = "EU_VAULT_A";
  const vaultBId: VaultId = "EU_VAULT_B";

  const issueHeightA = 200;
  const issueHeightB = 210;

  // 1) Start from empty ChainState.
  const chain: ChainState = createEmptyChainState();

  // Give both owners some THE in their accounts for context.
  const initialCreditA: Amount = 2_000n;
  const initialCreditB: Amount = 3_000n;
  creditAccount(chain, ownerA, initialCreditA);
  creditAccount(chain, ownerB, initialCreditB);

  // 2) Create two vaults and deposit THE into them.
  const vaultA = createVault(chain.vaults, vaultAId, ownerA);
  const vaultB = createVault(chain.vaults, vaultBId, ownerB);

  const depositA: Amount = 750n;
  const depositB: Amount = 1_250n;

  depositToVault(chain.vaults, vaultAId, depositA);
  depositToVault(chain.vaults, vaultBId, depositB);

  // 3) Create an EU registry and register one certificate per vault.
  const registry = createEmptyEuRegistry();

  const certA: EuCertificate = {
    id: "EU_CERT_A_001",
    owner: ownerA,
    backingVaultId: vaultA.id,
    issuedAtHeight: issueHeightA,
    status: "ACTIVE"
  };

  const certB: EuCertificate = {
    id: "EU_CERT_B_001",
    owner: ownerB,
    backingVaultId: vaultB.id,
    issuedAtHeight: issueHeightB,
    status: "ACTIVE"
  };

  registerEuCertificate(chain, registry, certA);
  registerEuCertificate(chain, registry, certB);

  // 4) Check invariants on the combined (chain, registry) state.
  assertEuInvariants(chain, registry);

  console.log("--- Initial snapshot ---");
  console.log("height:", chain.height);
  console.log("accounts.size:", chain.accounts.size);
  console.log("vaults.size:", chain.vaults.size);

  console.log("--- Vault A ---");
  console.log("vaultId:", vaultA.id);
  console.log("vaultOwner:", vaultA.owner);
  console.log("vaultBalanceTHE:", vaultA.balanceTHE.toString());

  console.log("--- Vault B ---");
  console.log("vaultId:", vaultB.id);
  console.log("vaultOwner:", vaultB.owner);
  console.log("vaultBalanceTHE:", vaultB.balanceTHE.toString());

  console.log("--- Certs by owner ---");
  const ownerACerts = getEuCertificatesForOwner(registry, ownerA);
  const ownerBCerts = getEuCertificatesForOwner(registry, ownerB);
  console.log("Owner A certs:", ownerACerts.map(c => c.id));
  console.log("Owner B certs:", ownerBCerts.map(c => c.id));

  // Show helper predicates.
  console.log("--- Helper predicates before redemption ---");
  console.log("isEuActive(A):", isEuActive(registry, certA.id));
  console.log("isEuRedeemed(A):", isEuRedeemed(registry, certA.id));
  console.log("isEuActive(B):", isEuActive(registry, certB.id));
  console.log("isEuRedeemed(B):", isEuRedeemed(registry, certB.id));

  // 5) Redeem one certificate and re-check invariants.
  console.log("--- Redeeming cert A ---");
  markEuRedeemed(registry, certA.id);
  assertEuInvariants(chain, registry);

  console.log("--- After redemption of A ---");
  const certAAfter = getEuCertificate(registry, certA.id);
  const certBAfter = getEuCertificate(registry, certB.id);
  console.log("cert A status:", certAAfter?.status);
  console.log("cert B status:", certBAfter?.status);

  console.log("--- Helper predicates after redemption ---");
  console.log("isEuActive(A):", isEuActive(registry, certA.id));
  console.log("isEuRedeemed(A):", isEuRedeemed(registry, certA.id));
  console.log("isEuActive(B):", isEuActive(registry, certB.id));
  console.log("isEuRedeemed(B):", isEuRedeemed(registry, certB.id));

  console.log("=== EU LEDGER SIM 2 COMPLETE ===");
}

runSim();
