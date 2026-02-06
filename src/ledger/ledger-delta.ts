// Pack 34/35 – Full LedgerDelta Engine

import type { ChainState } from "./state";
import type { Address } from "../types/primitives";
import type { VaultId, Vault } from "./vault";
import type { EuCertificateId, EuCertificate } from "./eu";

export interface AccountDelta {
  before: { balanceTHE: bigint; balanceEU?: bigint; nonce?: number; } | null;
  after: { balanceTHE: bigint; balanceEU?: bigint; nonce?: number; } | null;
}

export interface VaultDelta { before: Vault | null; after: Vault | null; }
export interface EuCertDelta { before: EuCertificate | null; after: EuCertificate | null; }

export interface LedgerDelta {
  accounts: Map<Address, AccountDelta>;
  vaults: Map<VaultId, VaultDelta>;
  euCerts: Map<EuCertificateId, EuCertDelta>;
}

export function createEmptyLedgerDelta(): LedgerDelta {
  return { accounts: new Map(), vaults: new Map(), euCerts: new Map() };
}

export function recordAccountChange(delta: LedgerDelta, addr: Address,
  before: AccountDelta["before"], after: AccountDelta["after"]): void {
  delta.accounts.set(addr, { before, after });
}

export function recordVaultChange(delta: LedgerDelta, vaultId: VaultId,
  before: VaultDelta["before"], after: VaultDelta["after"]): void {
  delta.vaults.set(vaultId, { before, after });
}

export function recordEuCertChange(delta: LedgerDelta, certId: EuCertificateId,
  before: EuCertDelta["before"], after: EuCertDelta["after"]): void {
  delta.euCerts.set(certId, { before, after });
}

export function applyLedgerDelta(state: ChainState, delta: LedgerDelta): ChainState {
  const next: ChainState = {
    height: state.height,
    lastBlockHash: state.lastBlockHash,
    accounts: new Map(state.accounts),
    vaults: new Map(state.vaults)
  };

  for (const [addr, ch] of delta.accounts) {
    if (ch.after === null) next.accounts.delete(addr);
    else next.accounts.set(addr, { balanceTHE: ch.after.balanceTHE });
  }

  for (const [vid, ch] of delta.vaults) {
    if (ch.after === null) next.vaults.delete(vid);
    else next.vaults.set(vid, ch.after);
  }

  return next;
}

export function printLedgerDelta(delta: LedgerDelta): void {
  console.log("Accounts delta:");
  for (const [addr, ch] of delta.accounts.entries()) {
    console.log(`  addr=${addr} before=${JSON.stringify(ch.before)} after=${JSON.stringify(ch.after)}`);
  }
  console.log("Vaults delta:");
  for (const [vid, ch] of delta.vaults.entries()) {
    console.log(`  vault=${vid} before=${JSON.stringify(ch.before)} after=${JSON.stringify(ch.after)}`);
  }
  console.log("EU certificates delta:");
  for (const [cid, ch] of delta.euCerts.entries()) {
    console.log(`  cert=${cid} before=${JSON.stringify(ch.before)} after=${JSON.stringify(ch.after)}`);
  }
}
