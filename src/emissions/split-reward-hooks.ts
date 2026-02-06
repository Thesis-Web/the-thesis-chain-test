export interface RewardBand {
  heightFrom: number;
  heightTo: number;
  minerRewardThe: bigint;
  nipRewardThe: bigint;
}

export type SplitFactor = bigint;

export function scaleRewardBandBySplit(
  band: RewardBand,
  factor: SplitFactor
): RewardBand {
  return {
    ...band,
    minerRewardThe: band.minerRewardThe * factor,
    nipRewardThe: band.nipRewardThe * factor
  };
}

export function applyCumulativeSplitFactor(
  band: RewardBand,
  cumulative: SplitFactor
): RewardBand {
  if (cumulative === 1n) return band;
  return scaleRewardBandBySplit(band, cumulative);
}
