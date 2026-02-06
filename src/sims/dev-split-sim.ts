/**
 * Dev split sim wired to the EU oracle.
 *
 * Orientation: price is EU/THE (EU per 1 THE).
 * Splits keep *value* of rewards roughly constant while unit counts grow.
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

function runDevSplitSim(): void {
  console.log("=== DEV SPLIT SIM (EU oracle, Pack 27) ===");

  const maxHeight = 10_000;
  let engineState: SplitEngineState = INITIAL_SPLIT_STATE;

  const sampleHeights = [0, 1999, 3999, 5999, 6443, 7999, 9999];

  const baseRewardUnits = 10n;

  for (const h of sampleHeights) {
    const price = euPerThePriceAtHeight(h);
    const { next, decision } = stepSplitEngine(
      engineState,
      h,
      price,
      DEFAULT_SPLIT_POLICY
    );
    engineState = next;

    const rewardUnits = baseRewardUnits * engineState.cumulativeFactor;
    const normalizedValue =
      Number(rewardUnits) / Number(engineState.cumulativeFactor || 1n);

    console.log(`\n--- HEIGHT ${h} ---`);
    console.log(`  EU/THE price: ${price.toFixed(4)}`);
    console.log("  cumulativeFactor:", engineState.cumulativeFactor.toString());
    console.log("  rewardUnits THE:", rewardUnits.toString());
    console.log(
      "  normalizedRewardValue (THE):",
      normalizedValue.toFixed(4)
    );
    console.log("  didSplit:", decision.shouldSplit);
    console.log("  reason:", decision.reason);
  }

  console.log("\n=== DEV SPLIT SIM COMPLETE ===");
}

if (require.main === module) {
  runDevSplitSim();
}
