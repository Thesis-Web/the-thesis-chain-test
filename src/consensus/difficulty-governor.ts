// TARGET: chain src/consensus/difficulty-governor.ts
// src/consensus/difficulty-governor.ts
// Pack 13.0.1 — integer math difficulty governor

export interface DifficultyState {
  target: bigint;
  window: number;
}

export interface BlockMeta {
  height: number;
  timestamp: number;
}

export interface GovParams {
  targetSpacing: number;
  maxAdjustUp: number;
  maxAdjustDown: number;
}

export function createDifficultyState(initialTarget: bigint, window=20): DifficultyState {
  return { target: initialTarget, window };
}

export function computeNextDifficulty(
  state: DifficultyState,
  params: GovParams,
  recent: BlockMeta[]
): DifficultyState {
  if (recent.length < 2) return state;

  // Compute integer average spacing
  let sum = 0;
  let count = 0;
  for (let i = 1; i < recent.length; i++) {
    const dt = recent[i].timestamp - recent[i - 1].timestamp;
    if (dt > 0) { sum += dt; count++; }
  }
  if (count === 0) return state;

  const avg = Math.floor(sum / count);

  const avgI = BigInt(avg);
  const targetSpacingI = BigInt(params.targetSpacing);

  let num = avgI;
  let den = targetSpacingI;

  // Clamp for too-fast blocks (harder)
  if (num < den) {
    const floor = den / BigInt(params.maxAdjustUp);
    if (num < floor) num = floor;
  } else {
    // too slow (easier)
    const ceil = den * BigInt(params.maxAdjustDown);
    if (num > ceil) num = ceil;
  }

  const newTarget = (state.target * num) / den;
  return { ...state, target: newTarget };
}
