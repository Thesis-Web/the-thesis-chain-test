// TARGET: chain src/sims/difficulty-governor-sim.ts
// src/sims/difficulty-governor-sim.ts
import { createDifficultyState, computeNextDifficulty } from "../consensus/difficulty-governor";

function runSim() {
  console.log("=== Difficulty Governor Sim (Pack 13.0) ===");

  const params = { targetSpacing: 240, maxAdjustUp: 4, maxAdjustDown: 4 };
  let state = createDifficultyState(1000000000000n);

  const blocks = [
    { height: 1, timestamp: 1000 },
    { height: 2, timestamp: 1240 },
    { height: 3, timestamp: 1480 },
    { height: 4, timestamp: 1600 },
    { height: 5, timestamp: 1800 },
    { height: 6, timestamp: 2100 },
  ];

  state = computeNextDifficulty(state, params, blocks);
  console.log("new target =", state.target.toString());
}

runSim();
