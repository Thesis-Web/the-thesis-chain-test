// TARGET: chain src/sims/multiblock-sim.ts
// src/sims/multiblock-sim.ts
// ---------------------------------------------------------------------------
// Pack 43 + 44 — Multi-block ChainSim (delta-aware + SplitEngine hook surface)
//
// This sim runs a tiny in-memory chain using the current minimal applyBlock
// wiring. It focuses on sequencing blocks and demonstrating how
// FullLedgerDeltaV1 (including the SplitEngine summary) fits into the loop.
//
// For now, the deltas are still empty and splitEvent is null; later packs will
// thread real VM / ledger / vault / EU / split transitions through here.
// ---------------------------------------------------------------------------

import { createEmptyFullLedgerStateV1 } from "../fullstate/state";
import { applyBlock } from "../consensus/apply-block";
import type { Block } from "../consensus/types";

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";

import type { FullLedgerDeltaV1 } from "../fullstate/delta";
import { printFullLedgerDeltaV1 } from "../fullstate/delta";

console.log("=== MULTIBLOCK SIM (Pack 43/44) ===");

const initial = createEmptyFullLedgerStateV1();
let state = initial;

const numBlocks = 5;

for (let h = 1; h <= numBlocks; h++) {
  const block: Block = {
    height: h,
    hash: `block-${h}`,
    parentHash: h === 1 ? undefined : `block-${h - 1}`,
    txs: []
  };

  const prev = state;
  const next = applyBlock(prev, block);

  // For now we construct empty deltas just to validate the composed
  // FullLedgerDeltaV1 type + logging surface. Later packs will populate
  // these from real VM / ledger / vault / EU / split transitions.
  const emptyLedgerDelta: LedgerDelta = {
    accounts: new Map(),
    vaults: new Map(),
    euCerts: new Map()
  };

  const emptyVaultDelta: VaultDelta = {
    vaults: new Map()
  };

  const emptyEuDelta: EuRegistryDelta = {
    certs: new Map()
  };

  const fullDelta: FullLedgerDeltaV1 = {
    ledger: emptyLedgerDelta,
    vaults: emptyVaultDelta,
    eu: emptyEuDelta,
    splitEvent: null
  };

  console.log(`--- Block h=${h} hash=${block.hash} ---`);
  console.log(`  prev.height=${prev.chain.height} -> next.height=${next.chain.height}`);
  printFullLedgerDeltaV1(fullDelta);

  state = next;
}

console.log("Final height =", state.chain.height);
console.log("=== MULTIBLOCK SIM COMPLETE ===");
