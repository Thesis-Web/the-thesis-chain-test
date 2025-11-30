// TARGET: chain src/sims/emissions-split-hook-sim.ts
import { RewardBand, scaleRewardBandBySplit, applyCumulativeSplitFactor } from "../emissions/split-reward-hooks";

export function runEmissionsSplitHookSim() {
  const base: RewardBand = {
    heightFrom: 0,
    heightTo: 61199,
    minerRewardThe: 9n,
    nipRewardThe: 1n
  };

  console.log("Base band:", base);

  for (const f of [2n, 3n, 5n]) {
    const scaled = scaleRewardBandBySplit(base, f);
    console.log(`After split factor ${f}:`, scaled);
  }

  const cf = 2n;
  const cScaled = applyCumulativeSplitFactor(base, cf);
  console.log(`After cumulative factor ${cf}:`, cScaled);
}

if (require.main === module) runEmissionsSplitHookSim();
