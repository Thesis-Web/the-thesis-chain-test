// TARGET: chain src/sims/split-shadow-sim.ts
// src/sims/split-shadow-sim.ts
// ---------------------------------------------------------------------------
// SPLIT SHADOW MODE SIM (v0)
// ---------------------------------------------------------------------------
// This simulation demonstrates how consensus code could use the split shadow
// helper to observe split decisions over time without mutating balances or
// affecting supply. It uses a synthetic price path similar to dev-split-sim,
// but routes through evaluateSplitInShadow.
// ---------------------------------------------------------------------------

import { DEV_PHASE_BLOCKS } from "../emissions/model";
import { DEFAULT_FEATURE_FLAGS } from "../params/feature-flags";
import {
  evaluateSplitInShadow,
  type SplitShadowConfig,
  type SplitShadowResult
} from "../consensus/split-shadow";

function syntheticPrice(height: number): number {
  const devBlocks = DEV_PHASE_BLOCKS > 0 ? DEV_PHASE_BLOCKS : 1;
  const t = Math.min(1, Math.max(0, height / devBlocks));
  return 1.0 + t * 19.0; // 1.0 → 20.0 across dev phase
}

function runSplitShadowSim(maxBlocks: number = 15000): void {
  console.log("=== SPLIT SHADOW MODE SIM (v0) ===");
  console.log("Max blocks:", maxBlocks);
  console.log("Dev-phase blocks (from model):", DEV_PHASE_BLOCKS);

  const cfg: SplitShadowConfig = {
    flags: DEFAULT_FEATURE_FLAGS
  };

  let shadowStateResult: SplitShadowResult | null = null;

  let totalSplits = 0;

  for (let height = 0; height < maxBlocks; height++) {
    const price = syntheticPrice(height);

    const result = evaluateSplitInShadow(cfg, {
      height,
      euPerThePrice: price,
      prevEngineState: shadowStateResult?.nextEngineState
    });

    if (result.decision.shouldSplit && result.decision.factor != null) {
      totalSplits++;
      console.log("\n--- SHADOW SPLIT EVENT ---");
      console.log("  height:", height);
      console.log("  price EU/THE:", price.toFixed(4));
      console.log("  factor:", result.decision.factor.toString());
      console.log("  cumulativeFactor:", result.nextEngineState.cumulativeFactor.toString());
      console.log("  reason:", result.decision.reason);
    }

    shadowStateResult = result;

    if (height === 0 || (height + 1) % 5000 === 0 || height === maxBlocks - 1) {
      console.log("\n--- HEIGHT", height, "---");
      console.log("  price EU/THE:", price.toFixed(4));
      console.log("  shouldSplit:", result.decision.shouldSplit);
      console.log("  reason:", result.decision.reason);
      console.log(
        "  cumulativeFactor:",
        result.nextEngineState.cumulativeFactor.toString()
      );
    }
  }

  console.log("\n=== SPLIT SHADOW MODE SIM SUMMARY ===");
  console.log("Blocks simulated:", maxBlocks);
  console.log("Total split events (shadow):", totalSplits);
  console.log("=== SPLIT SHADOW MODE SIM COMPLETE ===");
}

runSplitShadowSim();
