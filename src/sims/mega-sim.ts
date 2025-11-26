// TARGET: chain src/sims/mega-sim.ts
// src/sims/mega-sim.ts
// ---------------------------------------------------------------------------
// MEGA SIM (v0)
// ---------------------------------------------------------------------------
// This simulation is a non-consensus tool that walks a long range of blocks
// and tracks, per height:
//   • Emission breakdown (miner + NIP)
//   • Difficulty target evolution
// It is intentionally split-agnostic for now; future versions can import the
// split engine and apply factor jumps when split-policy decides to trigger.
// ---------------------------------------------------------------------------

import { computeEmissionForHeight, DEV_PHASE_BLOCKS } from "../emissions/model";
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

interface MegaSimSnapshot {
  height: number;
  timestampSec: number;
  minerRewardTHE: bigint;
  nipRewardTHE: bigint;
  isDevPhase: boolean;
  approxLeadingZeroBits: number;
}

function runMegaSim(totalBlocks: number = 20_000): void {
  console.log("=== MEGA SIM (EMISSIONS + DIFFICULTY, v0) ===");
  console.log("Total blocks:", totalBlocks);
  console.log("Dev-phase blocks (from model):", DEV_PHASE_BLOCKS);

  const powParams = DEFAULT_POW_PARAMS;
  const powState: PowState = createInitialPowState(powParams);

  let lastTimestampSec = 0;

  const snapshots: MegaSimSnapshot[] = [];

  for (let height = 0; height < totalBlocks; height++) {
    // Simple jittered timestamp model, same shape as pow-sim.ts.
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

    const emission = computeEmissionForHeight(height);
    const approxZeroBits = approxLeadingZeroBitsFromTarget(powState.target);

    const snap: MegaSimSnapshot = {
      height,
      timestampSec: thisTimestampSec,
      minerRewardTHE: emission.minerRewardTHE,
      nipRewardTHE: emission.nipRewardTHE,
      isDevPhase: emission.isDevPhase,
      approxLeadingZeroBits: approxZeroBits
    };

    snapshots.push(snap);

    if (
      height === 0 ||
      height === DEV_PHASE_BLOCKS - 1 ||
      height === DEV_PHASE_BLOCKS ||
      (height + 1) % 5_000 === 0 ||
      height === totalBlocks - 1
    ) {
      console.log("\n--- HEIGHT", height, "---");
      console.log("  timestampSec:", thisTimestampSec);
      console.log("  isDevPhase:", emission.isDevPhase);
      console.log("  minerRewardTHE:", emission.minerRewardTHE.toString());
      console.log("  nipRewardTHE:", emission.nipRewardTHE.toString());
      console.log("  approxLeadingZeroBits:", approxZeroBits);
    }

    lastTimestampSec = thisTimestampSec;
  }

  // Basic aggregate stats.
  let totalMiner = 0n;
  let totalNip = 0n;
  let devMiner = 0n;
  let devNip = 0n;
  let steadyMiner = 0n;
  let steadyNip = 0n;

  for (const s of snapshots) {
    totalMiner += s.minerRewardTHE;
    totalNip += s.nipRewardTHE;
    if (s.isDevPhase) {
      devMiner += s.minerRewardTHE;
      devNip += s.nipRewardTHE;
    } else {
      steadyMiner += s.minerRewardTHE;
      steadyNip += s.nipRewardTHE;
    }
  }

  console.log("\n=== MEGA SIM SUMMARY ===");
  console.log("Blocks:", snapshots.length);
  console.log("Dev-phase blocks (observed):", snapshots.filter(s => s.isDevPhase).length);
  console.log("Steady-state blocks (observed):", snapshots.filter(s => !s.isDevPhase).length);

  console.log("\nDev-phase totals:");
  console.log("  Miner THE:", devMiner.toString());
  console.log("  NIP THE:  ", devNip.toString());
  console.log("  Combined:", (devMiner + devNip).toString());

  console.log("\nSteady-state totals (window):");
  console.log("  Miner THE:", steadyMiner.toString());
  console.log("  NIP THE:  ", steadyNip.toString());
  console.log("  Combined:", (steadyMiner + steadyNip).toString());

  console.log("\nGlobal totals (window):");
  console.log("  Miner THE:", totalMiner.toString());
  console.log("  NIP THE:  ", totalNip.toString());
  console.log("  Combined:", (totalMiner + totalNip).toString());

  console.log("\n=== MEGA SIM COMPLETE ===");
}

runMegaSim();
