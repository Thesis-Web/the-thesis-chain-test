// TARGET: chain src/consensus/apply-block.ts
// src/consensus/apply-block.ts
// ---------------------------------------------------------------------------
// Pack 42.1 — Full applyBlock pipeline (minimal, safe version)
//
// This version intentionally keeps applyBlock **pure and conservative**:
//   • It does NOT yet invoke the Tx VM.
//   • It does NOT yet compute or apply per-module deltas.
//   • It ONLY updates chain height + lastBlockHash in a new FullLedgerStateV1.
//
// The goal of Pack 42.1 is to make the wiring compile cleanly and give us a
// stable surface to extend in Packs 43–46 (multi-block sims, replay harness,
// difficulty + SplitEngine integration, full Tx VM hookup, etc.).
// ---------------------------------------------------------------------------

import type { FullLedgerStateV1 } from "../fullstate/state";
import type { Block } from "./types";

// ---------------------------------------------------------------------------
// applyBlock (pure, structural)
// ---------------------------------------------------------------------------
//
// For now, applyBlock simply:
//   • takes the previous FullLedgerStateV1,
//   • returns a new FullLedgerStateV1 with updated height + lastBlockHash,
//   • leaves all maps (accounts, vaults, EU registry) untouched.
//
// Later packs will:
//   • thread Tx execution through the VM,
//   • produce Ledger / Vault / EU deltas,
//   • apply those deltas to derive the next state,
//   • attach emissions, fees, and SplitEngine results.
// ---------------------------------------------------------------------------

export function applyBlock(
  prev: FullLedgerStateV1,
  block: Block
): FullLedgerStateV1 {
  const nextChain = {
    ...prev.chain,
    height: block.height,
    lastBlockHash: block.hash
  };

  return {
    chain: nextChain,
    euRegistry: prev.euRegistry
  };
}
