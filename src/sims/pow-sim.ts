// src/sims/pow-sim.ts
// ---------------------------------------------------------------------------
// POW / DIFFICULTY SIM (v0)
// ---------------------------------------------------------------------------
// This simulation exercises the difficulty governor v0 + PoW target model.
// It does NOT mine real blocks; it just:
//   • Evolves timestamps with jitter around BLOCK_TIME_SECONDS
//   • Feeds them into adjustDifficultyTarget
//   • Tracks how the target moves over time
// ---------------------------------------------------------------------------

import { BLOCK_TIME_SECONDS } from "../emissions/params";
import {
  adjustDifficultyTarget,
  DEFAULT_DIFFICULTY_CONFIG,
  type DifficultySample
} from "../emissions/difficulty-governor";
import {
  DEFAULT_POW_PARAMS,
  createInitialPowState,
  approxLeadingZeroBitsFromTarget,
  type PowState
} from "../pow/pow";

interface PowSimStats {
  minDeltaSec: number;
  maxDeltaSec: number;
  sumDeltaSec: number;
  blocks: number;
}

function runPowSim(numBlocks: number = 500): void {
  console.log("=== POW / DIFFICULTY SIM (v0) ===");
  console.log("Target block time (sec):", BLOCK_TIME_SECONDS);
  console.log("Blocks to simulate:", numBlocks);

  const powParams = DEFAULT_POW_PARAMS;
  const powState: PowState = createInitialPowState(powParams);

  let lastTimestampSec = 0;
  const stats: PowSimStats = {
    minDeltaSec: Number.POSITIVE_INFINITY,
    maxDeltaSec: 0,
    sumDeltaSec: 0,
    blocks: 0
  };

  for (let height = 0; height < numBlocks; height++) {
    // Jittered block time around BLOCK_TIME_SECONDS.
    // We keep it deterministic enough for eyeballing but interesting enough
    // to exercise the governor.
    const jitterFactor = 1 + (Math.random() * 2 - 1) * 0.5; // ±50%
    let deltaSec = Math.round(BLOCK_TIME_SECONDS * jitterFactor);
    if (deltaSec < 1) deltaSec = 1;

    const thisTimestampSec = lastTimestampSec + deltaSec;

    const sample: DifficultySample = {
      prevTarget: powState.target,
      prevTimestampSec: lastTimestampSec,
      thisTimestampSec
    };

    const newTarget = adjustDifficultyTarget(sample, DEFAULT_DIFFICULTY_CONFIG);
    powState.target = newTarget;

    // Stats
    stats.blocks += 1;
    stats.sumDeltaSec += deltaSec;
    if (deltaSec < stats.minDeltaSec) stats.minDeltaSec = deltaSec;
    if (deltaSec > stats.maxDeltaSec) stats.maxDeltaSec = deltaSec;

    if (height === 0 || (height + 1) % 50 === 0 || height === numBlocks - 1) {
      const approxZeroBits = approxLeadingZeroBitsFromTarget(powState.target);
      console.log("\n--- BLOCK", height, "---");
      console.log("  deltaSec:", deltaSec);
      console.log("  timestampSec:", thisTimestampSec);
      console.log("  target:", powState.target.toString());
      console.log("  approxLeadingZeroBits:", approxZeroBits);
    }

    lastTimestampSec = thisTimestampSec;
  }

  const avgDeltaSec =
    stats.blocks > 0 ? stats.sumDeltaSec / stats.blocks : 0;

  console.log("\n=== POW / DIFFICULTY SIM SUMMARY ===");
  console.log("Blocks simulated:", stats.blocks);
  console.log("Min delta (sec):", stats.minDeltaSec);
  console.log("Max delta (sec):", stats.maxDeltaSec);
  console.log("Avg delta (sec):", avgDeltaSec.toFixed(2));
  console.log("Target block time (sec):", BLOCK_TIME_SECONDS);
  console.log("=== POW / DIFFICULTY SIM COMPLETE ===");
}

runPowSim();
