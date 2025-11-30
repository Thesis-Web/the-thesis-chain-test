// TARGET: chain src/consensus/apply-block.ts
// Pack 42 — Full applyBlock pipeline (skeleton)

import { runTx } from "../vm/tx-vm";
import type { FullLedgerStateV1 } from "../fullstate/state";
import { cloneFullLedgerStateV1 } from "../fullstate/state";
import type { Block } from "./types";
import { computeLedgerDelta } from "../ledger/ledger-delta";
import { mergeVaultDeltas } from "../ledger/vault-delta";
import { mergeEuRegistryDeltas } from "../ledger/eu-registry-delta";
import { applyLedgerDelta } from "../ledger/ledger-delta";
import { applyVaultDelta } from "../ledger/vault-delta";
import { applyEuRegistryDelta } from "../ledger/eu-registry-delta";

export function applyBlock(
  prev: FullLedgerStateV1,
  block: Block
): FullLedgerStateV1 {

  const working = cloneFullLedgerStateV1(prev);

  const ledgerBefore = {
    accounts: new Map(working.chain.accounts),
    vaults: new Map(working.chain.vaults),
    euCerts: new Map(working.euRegistry.byId)
  };

  const vaultBefore = { vaults: new Map(working.chain.vaults) };
  const euBefore = { certs: new Map(working.euRegistry.byId) };

  for (const tx of block.txs) {
    runTx(working, tx);
  }

  const ledgerAfter = {
    accounts: new Map(working.chain.accounts),
    vaults: new Map(working.chain.vaults),
    euCerts: new Map(working.euRegistry.byId)
  };

  const vaultAfter = { vaults: new Map(working.chain.vaults) };
  const euAfter = { certs: new Map(working.euRegistry.byId) };

  const ledgerDelta = computeLedgerDelta(ledgerBefore, ledgerAfter);
  const vaultDelta = mergeVaultDeltas(vaultBefore, vaultAfter);
  const euDelta = mergeEuRegistryDeltas(euBefore, euAfter);

  applyLedgerDelta(working.chain, ledgerDelta);
  applyVaultDelta(working.chain.vaults, vaultDelta);
  applyEuRegistryDelta(working.euRegistry, euDelta);

  working.chain.height = block.height;
  working.chain.lastBlockHash = block.hash;

  return working;
}
