// src/sims/consensus-diff-integration-sim.ts
// ---------------------------------------------------------------------------
// Pack 13.1 — Difficulty governor "chain-style" integration sim
// ---------------------------------------------------------------------------
// This sim does NOT touch real ChainState yet. Instead, it drives the
// DifficultyState using BlockMeta windows in a way that mirrors how consensus
// will feed (height, timestamp) into the governor.
// ---------------------------------------------------------------------------

import {
  createDifficultyState,
  computeNextDifficulty,
  type DifficultyState,
  type BlockMeta,
  type GovParams
} from "../consensus/difficulty-governor";

function runSim(): void {
  console.log("=== Consensus-style Difficulty Integration Sim (Pack 13.1) ===");

  const params: GovParams = {
    targetSpacing: 240,   // 4 minutes
    maxAdjustUp: 4,       // 4x harder max in one step
    maxAdjustDown: 4      // 4x easier max in one step
  };

  let state: DifficultyState = createDifficultyState(1000000000000n, 20);

  const blocks: BlockMeta[] = [];
  let t = 1_000;

  for (let h = 1; h <= 60; h++) {
    // Alternate a bit around target spacing to exercise both up/down paths.
    const jitter = h % 2 === 0 ? 200 : 300; // 200s / 300s around 240s target.
    t += jitter;

    const meta: BlockMeta = { height: h, timestamp: t };
    blocks.push(meta);

    if (blocks.length >= state.window) {
      const window = blocks.slice(-state.window);
      state = computeNextDifficulty(state, params, window);
      console.log("h", h, "avgWindowSize", window.length, "target", state.target.toString());
    }
  }

  console.log("=== Consensus-style Difficulty Integration Sim COMPLETE ===");
}

runSim();
