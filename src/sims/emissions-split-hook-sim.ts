// TARGET: chain src/sims/emissions-split-hook-sim.ts
//
// Tiny sim for the split reward hooks. It shows how a simple reward schedule
// (e.g. dev phase 10 THE + 1 THE) would be re-indexed by a split factor while
// keeping "value" stable in EU terms (conceptual; EU/THE comes from oracles).

import { scaleRewardBandBySplit, RewardBand } from "../emissions/split-reward-hooks";
import type { SplitFactor } from "../splits/split-policy";

function printBand(label: string, band: RewardBand): void {
  console.log(label, {
    heightFrom: band.heightFrom,
    heightTo: band.heightTo,
    minerRewardThe: band.minerRewardThe.toString(),
    nipRewardThe: band.nipRewardThe.toString()
  });
}

export function runEmissionsSplitHookSim(): void {
  console.log("=== EMISSIONS SPLIT HOOK SIM (Pack 25) ===");

  const baseBand: RewardBand = {
    heightFrom: 0,
    heightTo: 61_199, // dev-phase placeholder, matching mega-sim docs
    minerRewardThe: 9n,
    nipRewardThe: 1n
  };

  const factors: SplitFactor[] = [2n, 3n, 5n];

  printBand("Base band:", baseBand);

  for (const factor of factors) {
    const scaled = scaleRewardBandBySplit(baseBand, factor);
    printBand("After split factor " + factor.toString() + ":", scaled);
  }

  console.log("=== EMISSIONS SPLIT HOOK SIM COMPLETE ===");
}

if (require.main === module) {
  runEmissionsSplitHookSim();
}
