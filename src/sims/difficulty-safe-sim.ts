// src/sims/difficulty-safe-sim.ts
// ---------------------------------------------------------------------------
// Pack 45 — Difficulty Governor delta-safe sim
//
// This sim drives the DifficultyState across a small window of synthetic
// blocks with varying timestamps. It demonstrates:
//   • normal adjustments when block times are reasonable,
//   • safe_mode when timestamps are missing or adversarial,
//   • delta-style reporting for each step.
// ---------------------------------------------------------------------------

import type { Block } from "../consensus/types";
import {
  createInitialDifficultyState,
  stepDifficultyWithBlock,
  TARGET_BLOCK_TIME_SEC
} from "../consensus/difficulty-safe";

console.log("=== DIFFICULTY SAFE MODE SIM ===");

let diffState = createInitialDifficultyState();

// Synthetic chain of 6 blocks with different timing regimes.
// We start at t=0 for height=0 (implicit), then apply blocks.
const blocks: Block[] = [
  { height: 1, hash: "b1", parentHash: undefined, txs: [], timestampSec: 0 },
  { height: 2, hash: "b2", parentHash: "b1", txs: [], timestampSec: TARGET_BLOCK_TIME_SEC }, // on target
  { height: 3, hash: "b3", parentHash: "b2", txs: [], timestampSec: TARGET_BLOCK_TIME_SEC + 60 }, // slightly slow
  { height: 4, hash: "b4", parentHash: "b3", txs: [], timestampSec: TARGET_BLOCK_TIME_SEC + 90 }, // slower
  { height: 5, hash: "b5", parentHash: "b4", txs: [], timestampSec: TARGET_BLOCK_TIME_SEC - 60 }, // fast
  { height: 6, hash: "b6", parentHash: "b5", txs: [], timestampSec: TARGET_BLOCK_TIME_SEC * 20 } // adversarial / insane
];

let parent: Block | null = null;

for (const block of blocks) {
  const delta = stepDifficultyWithBlock(diffState, parent, block);

  console.log(`--- Block h=${block.height} hash=${block.hash} ---`);
  console.log(`  reason=${delta.reason}`);
  console.log(`  observed dt=${delta.observedBlockTimeSec}`);
  console.log(`  difficulty: ${delta.before.current} -> ${delta.after.current}`);

  diffState = delta.after;
  parent = block;
}

console.log("Final difficulty state:", diffState);
console.log("=== DIFFICULTY SAFE MODE SIM COMPLETE ===");
