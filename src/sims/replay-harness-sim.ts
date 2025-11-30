// TARGET: chain src/sims/replay-harness-sim.ts
// src/sims/replay-harness-sim.ts
// ---------------------------------------------------------------------------
// Pack 46 — Full L1 Replay Harness (Genesis → N blocks)
//
// This sim drives the current L1 stack end-to-end across many synthetic
// blocks. It exercises:
//   • FullLedgerStateV1 (chain + EU registry aggregation),
//   • applyBlock (consensus-level block application),
//   • FullLedgerDeltaV1 (ledger + vault + EU + split summary),
//   • DifficultyGovernor (delta-safe scaffold),
//   • basic invariants across the entire run.
//
// Notes:
//   • Blocks are synthetic, with empty txs and deterministic hashes.
//   • Timestamps follow the target block time so difficulty behaves sanely.
//   • You can safely increase NUM_BLOCKS to 1000+ on a modern machine.
// ---------------------------------------------------------------------------

import {
  createEmptyFullLedgerStateV1,
  cloneFullLedgerStateV1
} from "../fullstate/state";
import type { FullLedgerStateV1 } from "../fullstate/state";

import type { FullLedgerDeltaV1 } from "../fullstate/delta";
import { printFullLedgerDeltaV1 } from "../fullstate/delta";

import type { Block } from "../consensus/types";
import { applyBlock } from "../consensus/apply-block";

import {
  createInitialDifficultyState,
  stepDifficultyWithBlock,
  TARGET_BLOCK_TIME_SEC
} from "../consensus/difficulty-safe";
import type { DifficultyState } from "../consensus/difficulty-safe";

console.log("=== FULL L1 REPLAY HARNESS (Pack 46) ===");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const NUM_BLOCKS = 200; // tweak as desired (e.g. 1000 for heavier runs)
const LOG_EVERY = 25;   // only log full deltas every N blocks to keep output sane

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

let full: FullLedgerStateV1 = createEmptyFullLedgerStateV1();
let difficulty: DifficultyState = createInitialDifficultyState();

let parentBlock: Block | null = null;
let baseTime = 0;

// Invariant tracking
let heightOk = true;
let hashOk = true;
let nonDecreasingDifficulty = true;
let lastDifficulty = difficulty.current;

let safeModeCount = 0;
let tooFastCount = 0;
let tooSlowCount = 0;
let onTargetCount = 0;

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let h = 1; h <= NUM_BLOCKS; h++) {
  const timestampSec = baseTime + h * TARGET_BLOCK_TIME_SEC;

  const block: Block = {
    height: h,
    hash: `block-${h}`,
    parentHash: h > 1 ? `block-${h - 1}` : undefined,
    txs: [],
    timestampSec
  };

  const before = cloneFullLedgerStateV1(full);
  const { next, delta } = applyBlock(full, block);

  // Difficulty step
  const diffDelta = stepDifficultyWithBlock(difficulty, parentBlock, block);
  difficulty = diffDelta.after;

  // Invariants
  if (next.chain.height !== h) {
    heightOk = false;
  }
  if (next.chain.lastBlockHash !== block.hash) {
    hashOk = false;
  }
  if (difficulty.current < lastDifficulty) {
    nonDecreasingDifficulty = false;
  }
  lastDifficulty = difficulty.current;

  switch (diffDelta.reason) {
    case "safe_mode":
      safeModeCount++;
      break;
    case "too_fast":
      tooFastCount++;
      break;
    case "too_slow":
      tooSlowCount++;
      break;
    case "on_target":
      onTargetCount++;
      break;
  }

  // Logging
  console.log(`--- Block h=${h} hash=${block.hash} ---`);
  console.log(`  prev.height=${before.chain.height} -> next.height=${next.chain.height}`);
  console.log(`  difficulty: ${diffDelta.before.current} -> ${diffDelta.after.current} (reason=${diffDelta.reason}, dt=${diffDelta.observedBlockTimeSec})`);

  if (h % LOG_EVERY === 0 || h === 1 || h === NUM_BLOCKS) {
    const fullDelta: FullLedgerDeltaV1 = delta;
    printFullLedgerDeltaV1(fullDelta);
  }

  full = next;
  parentBlock = block;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("=== REPLAY SUMMARY ===");
console.log(`Final height = ${full.chain.height}`);
console.log(`Final lastBlockHash = ${full.chain.lastBlockHash}`);
console.log(`Final difficulty = ${difficulty.current}`);
console.log(`Heights monotonic & aligned? ${heightOk}`);
console.log(`lastBlockHash aligned with block.hash? ${hashOk}`);
console.log(`Difficulty non-decreasing over run? ${nonDecreasingDifficulty}`);
console.log("--- Difficulty reason counts ---");
console.log(`  safe_mode  = ${safeModeCount}`);
console.log(`  too_fast   = ${tooFastCount}`);
console.log(`  too_slow   = ${tooSlowCount}`);
console.log(`  on_target  = ${onTargetCount}`);
console.log("=== FULL L1 REPLAY HARNESS COMPLETE ===");
