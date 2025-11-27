// TARGET: chain src/sims/difficulty-governor-sim.ts
// Pack 9 — Difficulty governor sanity-check sim.
//
// This is a standalone sim; it does NOT depend on consensus/chain.ts.
// It just walks forward in time with pseudo-random deltas and prints
// the difficulty target evolution.

import {
  INITIAL_DIFFICULTY_STATE,
  computeNextDifficulty,
  type DifficultyState
} from "../consensus/difficulty-governor";

let state: DifficultyState = INITIAL_DIFFICULTY_STATE;

console.log("=== DIFFICULTY GOVERNOR SIM (v0) ===");
console.log("Initial target:", state.target.toString());

for (let i = 1; i <= 20; i++) {
  // Fake block spacing: around 240 sec ± 60 sec
  const jitter = Math.floor(Math.random() * 120) - 60; // [-60, +59]
  const deltaSec = Math.max(60, 240 + jitter);         // clamp to >= 60

  const newTimestampSec = state.lastTimestampSec + deltaSec;
  const step = computeNextDifficulty(state, newTimestampSec);

  console.log(
    `STEP ${i.toString().padStart(2, "0")}`,
    "deltaSec=", step.deltaSec,
    "ratio≈", step.adjustmentRatio.toFixed(3),
    "target=", step.next.target.toString()
  );

  state = step.next;
}

console.log("=== DIFFICULTY GOVERNOR SIM COMPLETE ===");
