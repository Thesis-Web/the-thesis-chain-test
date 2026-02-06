/**
 * Split shadow-mode sim wired to EU oracle.
 *
 * We evaluate the split policy in "shadow" alongside a notional chain
 * to see when splits *would* happen, without mutating any real state.
 */

import { euPerThePriceAtHeight } from "./eu-oracle-sim";

interface SplitPolicy {
  readonly splitThresholdEuPerThe: number;
  readonly minBlocksBetweenSplits: number;
}

interface SplitEngineState {
  readonly lastSplitHeight: number;
  readonly cumulativeFactor: bigint;
}

interface SplitDecision {
  readonly shouldSplit: boolean;
  readonly factor: bigint | null;
  readonly reason: string;
}

const DEFAULT_SPLIT_POLICY: SplitPolicy = {
  splitThresholdEuPerThe: 3.0,
  minBlocksBetweenSplits: 1000
};

const INITIAL_SPLIT_STATE: SplitEngineState = {
  lastSplitHeight: -1,
  cumulativeFactor: 1n
};

function stepSplitEngine(
  prev: SplitEngineState,
  height: number,
  euPerThePrice: number,
  policy: SplitPolicy
): { next: SplitEngineState; decision: SplitDecision } {
  let shouldSplit = false;
  let factor: bigint | null = null;
  let reason = "below_threshold";

  const crossed = euPerThePrice >= policy.splitThresholdEuPerThe;
  const intervalOk =
    prev.lastSplitHeight < 0 ||
    height - prev.lastSplitHeight >= policy.minBlocksBetweenSplits;

  if (crossed) {
    if (intervalOk) {
      shouldSplit = true;
      factor = 2n;
      reason = "threshold_met";
    } else {
      reason = "min_interval_not_met";
    }
  }

  if (!shouldSplit) {
    return {
      next: prev,
      decision: { shouldSplit: false, factor: null, reason }
    };
  }

  const next: SplitEngineState = {
    lastSplitHeight: height,
    cumulativeFactor: prev.cumulativeFactor * (factor ?? 1n)
  };

  return {
    next,
    decision: { shouldSplit, factor, reason }
  };
}

function runSplitShadowSim(): void {
  console.log("=== SPLIT SHADOW MODE SIM (EU oracle, Pack 27) ===");

  const maxBlocks = 15_000;
  let shadowState: SplitEngineState = INITIAL_SPLIT_STATE;
  let totalSplits = 0;

  const sampleHeights = [0, 4_999, 6_443, 9_999, 14_999];

  for (let height = 0; height <= maxBlocks; height++) {
    const price = euPerThePriceAtHeight(height);
    const { next, decision } = stepSplitEngine(
      shadowState,
      height,
      price,
      DEFAULT_SPLIT_POLICY
    );
    shadowState = next;

    if (decision.shouldSplit && decision.factor != null) {
      totalSplits++;
      console.log("\n--- SHADOW SPLIT EVENT ---");
      console.log("  height:", height);
      console.log("  price EU/THE:", price.toFixed(4));
      console.log("  factor:", decision.factor.toString());
      console.log("  cumulativeFactor:", shadowState.cumulativeFactor.toString());
      console.log("  reason:", decision.reason);
    }

    if (sampleHeights.includes(height)) {
      console.log("\n--- HEIGHT SNAPSHOT ---");
      console.log("  height:", height);
      console.log("  price EU/THE:", price.toFixed(4));
      console.log(
        "  cumulativeFactor:",
        shadowState.cumulativeFactor.toString()
      );
    }
  }

  console.log("\n=== SPLIT SHADOW MODE SIM SUMMARY ===");
  console.log("Blocks simulated:", maxBlocks);
  console.log("Total split events (shadow):", totalSplits);
  console.log("=== SPLIT SHADOW MODE SIM COMPLETE ===");
}

if (require.main === module) {
  runSplitShadowSim();
}
