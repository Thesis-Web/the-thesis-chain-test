// TARGET: chain src/sims/split-events-sim.ts
//
// Pack26-FIX4: split events sim decoupled from split-orchestrator
// - No dependency on DEFAULT_SPLIT_POLICY
// - Maintains its own simple split engine state with cumulativeFactor
// - Uses SplitEvent helpers from ../consensus/split-events
//
// This sim is intentionally self-contained so it can evolve independently
// from the consensus split engine while still exercising SplitEventLog.

import { SplitEvent, SplitEventLog, appendSplitEvent, cumulativeFactorAtHeight } from "../consensus/split-events";

// --- Local split engine model (sim-only) ------------------------------------

type SplitFactor = bigint;

interface LocalSplitPolicy {
  thresholdEuPerThe: number;
  minBlocksBetweenSplits: number;
  factorPerSplit: SplitFactor;
}

const LOCAL_SPLIT_POLICY: LocalSplitPolicy = {
  // Trigger around EU/THE ~= 3.0 in the synthetic path
  thresholdEuPerThe: 3.0,
  // Require some distance between splits so they can't spam
  minBlocksBetweenSplits: 1_000,
  // v0: always a 2x upward split
  factorPerSplit: 2n,
};

interface LocalSplitEngineState {
  readonly policy: LocalSplitPolicy;
  readonly lastSplitHeight: number | null;
  readonly cumulativeFactor: SplitFactor;
}

interface LocalSplitDecision {
  readonly shouldSplit: boolean;
  readonly reason: string;
  readonly factor: SplitFactor | null;
  readonly cumulativeFactor: SplitFactor;
}

function initLocalSplitEngine(policy: LocalSplitPolicy = LOCAL_SPLIT_POLICY): LocalSplitEngineState {
  return {
    policy,
    lastSplitHeight: null,
    cumulativeFactor: 1n,
  };
}

interface StepInput {
  height: number;
  euPerThePrice: number;
}

/**
 * Very small local split engine:
 * - If price below threshold → no split.
 * - If not enough blocks since last split → no split.
 * - Otherwise → split with factorPerSplit and update cumulativeFactor.
 */
function stepLocalSplitEngine(
  prev: LocalSplitEngineState,
  input: StepInput
): { state: LocalSplitEngineState; decision: LocalSplitDecision } {
  const { policy } = prev;
  const { height, euPerThePrice } = input;

  let shouldSplit = false;
  let reason = "below_threshold";
  let factor: SplitFactor | null = null;
  let cumulativeFactor = prev.cumulativeFactor;

  if (euPerThePrice < policy.thresholdEuPerThe) {
    shouldSplit = false;
    reason = "below_threshold";
  } else if (prev.lastSplitHeight !== null &&
             height - prev.lastSplitHeight < policy.minBlocksBetweenSplits) {
    shouldSplit = false;
    reason = "min_interval_not_met";
  } else {
    shouldSplit = true;
    reason = "threshold_met";
    factor = policy.factorPerSplit;
    cumulativeFactor = prev.cumulativeFactor * factor;
  }

  const nextState: LocalSplitEngineState = {
    policy: prev.policy,
    lastSplitHeight: shouldSplit ? height : prev.lastSplitHeight,
    cumulativeFactor,
  };

  const decision: LocalSplitDecision = {
    shouldSplit,
    reason,
    factor,
    cumulativeFactor,
  };

  return { state: nextState, decision };
}

// --- Synthetic EU/THE price path --------------------------------------------

function syntheticEuPerThePrice(height: number): number {
  // Same general shape as dev-split-sim: rising curve that asymptotes upward.
  const t = height / 10_000;
  return 1.0 + 2.2 * (1 - Math.exp(-3 * t));
}

// --- Simulation --------------------------------------------------------------

export function runSplitEventsSim(): void {
  const maxHeight = 15_000;

  let engine = initLocalSplitEngine();
  let log: SplitEventLog = [];

  console.log("=== SPLIT EVENTS SIM (Pack26-FIX4) ===");
  console.log("maxHeight:", maxHeight);

  for (let h = 0; h <= maxHeight; h++) {
    const price = syntheticEuPerThePrice(h);
    const { state, decision } = stepLocalSplitEngine(engine, {
      height: h,
      euPerThePrice: price,
    });
    engine = state;

    if (decision.shouldSplit) {
      const evt: SplitEvent = {
        height: h,
        factor: decision.factor ?? 1n,
        cumulativeFactor: decision.cumulativeFactor,
        euPerThePrice: price,
        reason: decision.reason,
        timestampMs: 0,
      };
      log = appendSplitEvent(log, evt);

      console.log("--- SPLIT EVENT ---");
      console.log("  height:", evt.height);
      console.log("  price EU/THE:", evt.euPerThePrice.toFixed(4));
      console.log("  factor:", evt.factor.toString());
      console.log("  cumulativeFactor:", evt.cumulativeFactor.toString());
      console.log("  reason:", evt.reason);
    }
  }

  console.log("=== SPLIT EVENTS LOG SUMMARY ===");
  console.log("Total split events:", log.length);
  for (const evt of log) {
    console.log(
      "  height=%d price EU/THE=%s factor=%s cumFactor=%s reason=%s",
      evt.height,
      evt.euPerThePrice.toFixed(4),
      evt.factor.toString(),
      evt.cumulativeFactor.toString(),
      evt.reason
    );
  }

  const cf0 = cumulativeFactorAtHeight(log, 0);
  const cfMid = cumulativeFactorAtHeight(log, Math.floor(maxHeight / 2));
  const cfEnd = cumulativeFactorAtHeight(log, maxHeight);

  console.log("=== CUMULATIVE FACTOR CHECKS ===");
  console.log("  at height 0      :", cf0.toString());
  console.log("  at height ~mid   :", cfMid.toString());
  console.log("  at height max    :", cfEnd.toString());
  console.log("=== SPLIT EVENTS SIM COMPLETE ===");
}

// If executed directly via ts-node, run the sim.
if (require.main === module) {
  runSplitEventsSim();
}
