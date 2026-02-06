// src/emissions/layer-timing.ts
// ---------------------------------------------------------------------------
// Layer timing + clock model (045, 042a).
//
// L1: 4-minute blocks
// L2: 4-minute blocks, 50% phase offset from L1
// L3: 1-minute blocks
//
// This file is a pure helper scaffold. Nothing here is consensus-critical yet;
// it is designed for sims and future difficulty-bridge work between L1/L2/L3.
// ---------------------------------------------------------------------------

export const L1_BLOCK_TIME_SECONDS = 4 * 60;
export const L2_BLOCK_TIME_SECONDS = 4 * 60;
export const L3_BLOCK_TIME_SECONDS = 60;

// L2 offset: how many seconds after an L1 block should an L2 block be "ideally"
// centered. The docs specify ~50% phase offset.
export const L2_PHASE_OFFSET_SECONDS = L1_BLOCK_TIME_SECONDS / 2;

// Given an L1 height and a genesis-aligned clock, compute the ideal timestamp
// for the *center* of the corresponding L1 block window.
export function idealL1BlockCenterTime(height: number): number {
  if (!Number.isFinite(height) || height < 0) return 0;
  return (height + 0.5) * L1_BLOCK_TIME_SECONDS;
}

// Given an L2 height, compute the ideal center time for that block such that
// L2 is phase-shifted by L2_PHASE_OFFSET_SECONDS relative to L1.
export function idealL2BlockCenterTime(height: number): number {
  if (!Number.isFinite(height) || height < 0) return L2_PHASE_OFFSET_SECONDS;
  return L2_PHASE_OFFSET_SECONDS + (height + 0.5) * L2_BLOCK_TIME_SECONDS;
}

// Simple helper for L3: 1-minute cadence, no offset in this model.
export function idealL3BlockCenterTime(height: number): number {
  if (!Number.isFinite(height) || height < 0) return 0;
  return (height + 0.5) * L3_BLOCK_TIME_SECONDS;
}
