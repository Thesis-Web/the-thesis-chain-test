// src/sims/emissions-sim.ts
// ---------------------------------------------------------------------------
// EMISSIONS SIM (dev-phase + steady-state)
// ---------------------------------------------------------------------------
// This simulation exercises the emission model across:
//   • The 170-day dev phase (height 0..DEV_PHASE_BLOCKS-1)
//   • Several epochs of the steady-state 10 → 20 → 40 THE schedule
// It prints aggregate miner/NIP rewards so we can sanity-check totals against
// specs/REWARDS_EMISSIONS.md and 090-miners-and-nodes.md.
// ---------------------------------------------------------------------------

import { computeEmissionForHeight, DEV_PHASE_BLOCKS } from "../emissions/model";

function formatBig(n: bigint): string {
  return n.toString();
}

function runEmissionsSim(): void {
  console.log("=== EMISSIONS SIM (DEV + STEADY STATE) ===");
  console.log(`Dev phase blocks (computed): ${DEV_PHASE_BLOCKS}`);

  // Sim range: dev-phase + 3 steady-state epochs worth of blocks.
  const BLOCKS_PER_EPOCH = 10_080; // Keep in sync with params.ts (28 days)
  const steadyEpochs = 3;
  const totalBlocks = DEV_PHASE_BLOCKS + steadyEpochs * BLOCKS_PER_EPOCH;

  let totalMiner = 0n;
  let totalNip = 0n;

  let devMiner = 0n;
  let devNip = 0n;

  let steadyMiner = 0n;
  let steadyNip = 0n;

  for (let height = 0; height < totalBlocks; height++) {
    const breakdown = computeEmissionForHeight(height);
    totalMiner += breakdown.minerRewardTHE;
    totalNip += breakdown.nipRewardTHE;

    if (breakdown.isDevPhase) {
      devMiner += breakdown.minerRewardTHE;
      devNip += breakdown.nipRewardTHE;
    } else {
      steadyMiner += breakdown.minerRewardTHE;
      steadyNip += breakdown.nipRewardTHE;
    }

    // Log a few key boundaries for eyeballing.
    if (
      height === 0 ||
      height === DEV_PHASE_BLOCKS - 1 ||
      height === DEV_PHASE_BLOCKS ||
      height === totalBlocks - 1
    ) {
      console.log("\n--- HEIGHT", height, "---");
      console.log("  isDevPhase:", breakdown.isDevPhase);
      console.log("  minerRewardTHE:", formatBig(breakdown.minerRewardTHE));
      console.log("  nipRewardTHE:", formatBig(breakdown.nipRewardTHE));
      console.log("  totalRewardTHE:", formatBig(breakdown.totalRewardTHE));
      console.log("  epochIndex:", breakdown.epochIndex);
    }
  }

  console.log("\n=== EMISSIONS SIM SUMMARY ===");
  console.log("Total blocks simulated:", totalBlocks);
  console.log("Dev-phase blocks:", DEV_PHASE_BLOCKS);
  console.log("Steady-state blocks:", totalBlocks - DEV_PHASE_BLOCKS);

  console.log("\nDev-phase totals:");
  console.log("  Miner reward THE:", formatBig(devMiner));
  console.log("  NIP reward THE:  ", formatBig(devNip));
  console.log("  Combined THE:    ", formatBig(devMiner + devNip));

  console.log("\nSteady-state totals (sim window):");
  console.log("  Miner reward THE:", formatBig(steadyMiner));
  console.log("  NIP reward THE:  ", formatBig(steadyNip));
  console.log("  Combined THE:    ", formatBig(steadyMiner + steadyNip));

  console.log("\nGlobal totals:");
  console.log("  Miner reward THE:", formatBig(totalMiner));
  console.log("  NIP reward THE:  ", formatBig(totalNip));
  console.log("  Combined THE:    ", formatBig(totalMiner + totalNip));

  console.log("\n=== EMISSIONS SIM COMPLETE ===");
}

runEmissionsSim();
