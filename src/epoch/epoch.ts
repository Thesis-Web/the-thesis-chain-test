// src/epoch/epoch.ts
// ---------------------------------------------------------------------------
// Epoch indexing helpers for THE chain.
// ---------------------------------------------------------------------------

// 4-minute blocks
export const BLOCK_TIME_SECONDS = 4 * 60;

// Thesis epoch = 28 days
export const EPOCH_LENGTH_DAYS = 28;

// Blocks per day at 4-minute block time:
// 24 * 60 * 60 / 240 = 360
export const BLOCKS_PER_DAY = (24 * 60 * 60) / BLOCK_TIME_SECONDS;

// Blocks per epoch = 360 * 28 = 10080
export const EPOCH_LENGTH_BLOCKS = BLOCKS_PER_DAY * EPOCH_LENGTH_DAYS;

// Return 0-based epoch index for a given height.
// Height <= 0 is treated as "pre-genesis" epoch 0.
export function getEpochIndex(height: number): number {
  if (height <= 0) return 0;
  const len = EPOCH_LENGTH_BLOCKS || 1;
  return Math.floor((height - 1) / len);
}

export interface EpochMeta {
  readonly index: number;
  readonly startHeight: number;
  readonly endHeight: number;
}

// Derive start/end heights for a given epoch index.
export function getEpochMeta(index: number): EpochMeta {
  const len = EPOCH_LENGTH_BLOCKS || 1;
  const startHeight = index * len + 1;
  const endHeight = (index + 1) * len;
  return { index, startHeight, endHeight };
}
