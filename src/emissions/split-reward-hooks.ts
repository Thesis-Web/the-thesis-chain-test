// TARGET: chain src/emissions/split-reward-hooks.ts
//
// Emissions / reward scaling hooks for splits. This file defines a small,
// self-contained surface for reasoning about how per-block rewards scale when
// the supply is re-indexed by a split factor.
//
// Pack 25 keeps this logic in a separate module and in sims only; wiring it
// into the canonical emissions engine is a later, explicit pack.

import type { SplitFactor } from "../splits/split-policy";

export interface RewardBand {
  readonly heightFrom: number;
  readonly heightTo: number;
  readonly minerRewardThe: bigint;
  readonly nipRewardThe: bigint;
}

/**
 * Given a single reward band and a split factor, compute the new band in terms
 * of THE-units while preserving *value* when interpreted against EU. In v0 we
 * simply multiply units by the split factor; higher-level sims are responsible
 * for ensuring that the EU-indexed value remains stable.
 */
export function scaleRewardBandBySplit(
  band: RewardBand,
  factor: SplitFactor
): RewardBand {
  const f = factor;
  return {
    ...band,
    minerRewardThe: band.minerRewardThe * f,
    nipRewardThe: band.nipRewardThe * f
  };
}
