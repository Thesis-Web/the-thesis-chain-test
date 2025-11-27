// TARGET: chain src/sims/consensus-difficulty-sim.ts
// src/sims/consensus-difficulty-sim.ts
import { createDifficultyState, computeNextDifficulty } from "../consensus/difficulty-governor";

function runSim() {
  console.log("=== Chain-style Difficulty Sim (Pack 13.0) ===");

  const params = { targetSpacing: 240, maxAdjustUp: 4, maxAdjustDown: 4 };
  let state = createDifficultyState(1000000000000n);

  const blocks = [];
  let t = 1000;
  for (let h = 1; h <= 50; h++) {
    t += (h % 2 === 0 ? 200 : 300);
    blocks.push({ height: h, timestamp: t });

    if (blocks.length >= state.window) {
      const window = blocks.slice(-state.window);
      state = computeNextDifficulty(state, params, window);
      console.log("h", h, "target", state.target.toString());
    }
  }
}

runSim();
