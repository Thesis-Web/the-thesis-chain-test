// src/emissions/params.ts
// ---------------------------------------------------------------------------
// Canonical chain-level emission + timing parameters for THE
// Mirrors docs/sections/090-miners-and-nodes.md & 090b-*.md
// ---------------------------------------------------------------------------

// Target block time for L1 (THE spec: ~4 minutes)
export const BLOCK_TIME_SECONDS = 4 * 60; // 240 seconds

// Epoch length: 28 days of 4-minute blocks
// 28 * 24 * 60 / 4 = 10,080 blocks
export const BLOCKS_PER_EPOCH = 10_080;

// Base miner block reward per epoch (in THE)
//
// Epoch 0: 10 THE
// Epoch 1: 20 THE
// Epoch 2+: 40 THE (cap; later epochs can be extended via DAO decisions)
export const BASE_MINER_REWARD_THE: readonly bigint[] = [
  10n,  // epoch 0
  20n,  // epoch 1
  40n   // epoch 2+
];

// Node Income Pool share in basis points (1/100 of a percent).
// 30% of block reward to NIP, 70% directly to the winning miner.
// Node Income Pool share in basis points (1/100 of a percent).
// NOTE (v0): Per specs/REWARDS_EMISSIONS.md & specs/NODE_TIERS.md, steady-state node
// rewards are funded from fees/treasury, not from the Mining Escrow base.
// During this L1 dev phase, we set the emission-funded NIP share to 0.
// A future fee-funded Node Income Pool will be wired separately.
export const NIP_SHARE_BASIS_POINTS = 0; // 0% from emission; NIP is fee-funded in later phases

// Helper to clamp an epoch index into the defined schedule range.
export function clampEpochIndex(epochIndex: number): number {
  if (epochIndex < 0) return 0;
  const last = BASE_MINER_REWARD_THE.length - 1;
  return epochIndex > last ? last : epochIndex;
}
