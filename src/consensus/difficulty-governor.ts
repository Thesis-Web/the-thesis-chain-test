// TARGET: chain src/consensus/difficulty-governor.ts
// src/consensus/difficulty-governor.ts
// Pack 13.0 — standalone difficulty governor

export interface DifficultyState {
  target: bigint;       // current target (higher = easier)
  window: number;       // how many blocks to average
}

export interface BlockMeta {
  height: number;
  timestamp: number;    // unix seconds
}

export interface GovParams {
  targetSpacing: number; // seconds per block
  maxAdjustUp: number;   // e.g. 4 (400%)
  maxAdjustDown: number; // e.g. 4 (400%)
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

  const times = [];
  for (let i = 1; i < recent.length; i++) {
    const dt = recent[i].timestamp - recent[i - 1].timestamp;
    if (dt > 0) times.push(dt);
  }
  if (!times.length) return state;

  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  const ratio = avg / params.targetSpacing;

  let newTarget = BigInt(state.target);

  if (ratio < 1) {
    const factor = Math.max(ratio, 1 / params.maxAdjustUp);
    newTarget = BigInt(Number(newTarget) * factor);
  } else {
    const factor = Math.min(ratio, params.maxAdjustDown);
    newTarget = BigInt(Number(newTarget) * factor);
  }
  return { ...state, target: newTarget };
}
