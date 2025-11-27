// TARGET: chain src/sims/dev-split-sim.ts
// src/sims/dev-split-sim.ts
// ---------------------------------------------------------------------------
// DEV SPLIT SIM (v0)
// ---------------------------------------------------------------------------
// This simulation is intentionally narrow:
//
//   • We stay entirely inside the dev phase.
//   • We model block rewards in "THE units" and how they behave across splits.
//   • We use the split-policy surface + split-orchestrator to decide when a
//     split would occur, based on a synthetic rising THE/EU price path.
//   • We keep track of:
//       - cumulative split factor
//       - reward units per block
//       - "normalized value" per block = rewardUnits / cumulativeFactor
//
// The goal is to demonstrate the key invariant visually:
//   • Reward UNITS may jump (e.g. from 10 → 20 → 40 THE),
//   • But normalized VALUE per block can remain stable if policy is calibrated.
// ---------------------------------------------------------------------------

import { DEV_PHASE_BLOCKS } from "../emissions/model";
import { EMISSION_PARAMS_V1 } from "../params/registry";
import {
  initSplitEngineState,
  stepSplitEngine,
  type SplitEngineState
} from "../splits/split-orchestrator";

interface DevSplitSnapshot {
  height: number;
  thePerEuPrice: number;
  cumulativeFactor: bigint;
  rewardUnits: bigint;
  normalizedRewardValue: number;
  didSplit: boolean;
  splitReason: string | null;
}

function syntheticDevPricePath(height: number): number {
  // Very simple synthetic price model for now:
  //   • Starts near THE/EU = 1.0
  //   • Ramps up linearly over the dev phase toward ~20.0
  //
  // This ensures we will eventually cross the 2x, 3x, 5x thresholds from
  // DEFAULT_SPLIT_POLICY in split-policy.ts.
  const devBlocks = DEV_PHASE_BLOCKS > 0 ? DEV_PHASE_BLOCKS : 1;
  const t = Math.min(1, Math.max(0, height / devBlocks));
  return 1.0 + t * 19.0; // 1.0 → 20.0 over dev phase
}

function runDevSplitSim(maxBlocks: number = 10_000): void {
  console.log("=== DEV SPLIT SIM (UNITS VS VALUE, v0) ===");
  console.log("Max blocks to simulate:", maxBlocks);
  console.log("Dev-phase blocks (from model):", DEV_PHASE_BLOCKS);

  // Base dev-phase max block reward from registry (e.g. 10 THE).
  const baseBlockRewardTHE = EMISSION_PARAMS_V1.devPhase.maxBlockRewardTHE;

  let engineState: SplitEngineState = initSplitEngineState();
  const snapshots: DevSplitSnapshot[] = [];

  const limit = Math.min(maxBlocks, DEV_PHASE_BLOCKS > 0 ? DEV_PHASE_BLOCKS : maxBlocks);

  for (let height = 0; height < limit; height++) {
    const price = syntheticDevPricePath(height);

    const { state: nextState, decision } = stepSplitEngine(engineState, {
      height,
      thePerEuPrice: price
    });

    const didSplit = decision.shouldSplit && decision.factor != null;

    // Reward UNITS scale with cumulative factor. This is the intuitive
    // "more atoms" picture after a split. Value is what you get when you
    // normalize by the cumulative factor.
    const rewardUnits = baseBlockRewardTHE * nextState.cumulativeFactor;
    const normalizedRewardValue = Number(rewardUnits) / Number(nextState.cumulativeFactor);

    const snap: DevSplitSnapshot = {
      height,
      thePerEuPrice: price,
      cumulativeFactor: nextState.cumulativeFactor,
      rewardUnits,
      normalizedRewardValue,
      didSplit,
      splitReason: didSplit ? decision.reason : null
    };

    snapshots.push(snap);
    engineState = nextState;

    if (
      height === 0 ||
      didSplit ||
      (height + 1) % 2_000 === 0 ||
      height === limit - 1
    ) {
      console.log("\n--- HEIGHT", height, "---");
      console.log("  THE/EU price:", price.toFixed(4));
      console.log("  cumulativeFactor:", nextState.cumulativeFactor.toString());
      console.log("  rewardUnits THE:", rewardUnits.toString());
      console.log("  normalizedRewardValue (THE):", normalizedRewardValue.toFixed(4));
      console.log("  didSplit:", didSplit);
      console.log("  splitReason:", decision.reason);
    }
  }

  // Summarize final state + total splits.
  const splitEvents = snapshots.filter(s => s.didSplit);
  console.log("\n=== DEV SPLIT SIM SUMMARY ===");
  console.log("Blocks simulated:", snapshots.length);
  console.log("Total split events:", splitEvents.length);
  if (splitEvents.length > 0) {
    console.log("Split heights & cumulativeFactors:");
    for (const e of splitEvents) {
      console.log(
        "  height=" + e.height,
        "price=" + e.thePerEuPrice.toFixed(4),
        "cumFactor=" + e.cumulativeFactor.toString()
      );
    }
  } else {
    console.log("No splits triggered under synthetic price path.");
  }
  console.log("=== DEV SPLIT SIM COMPLETE ===");
}

runDevSplitSim();
