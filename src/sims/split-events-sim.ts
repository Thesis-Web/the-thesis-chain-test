/**
 * Split events sim wired to EU oracle.
 *
 * This is a pure sim: we keep a local event log (height, factor,
 * cumulativeFactor, price, reason) driven by a simple split engine.
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

interface SplitEvent {
  readonly height: number;
  readonly factor: bigint;
  readonly cumulativeFactor: bigint;
  readonly euPerThePrice: number;
  readonly reason: string;
}

type SplitEventLog = SplitEvent[];

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

function appendSplitEvent(
  log: SplitEventLog,
  evt: SplitEvent,
  maxEvents: number = 64
): SplitEventLog {
  const withEvt = [...log, evt];
  if (withEvt.length <= maxEvents) return withEvt;
  return withEvt.slice(withEvt.length - maxEvents);
}

function cumulativeFactorAtHeight(
  log: SplitEventLog,
  height: number
): bigint {
  let cf = 1n;
  for (const evt of log) {
    if (evt.height <= height) {
      cf = evt.cumulativeFactor;
    } else {
      break;
    }
  }
  return cf;
}

function runSplitEventsSim(): void {
  console.log("=== SPLIT EVENTS SIM (EU oracle, Pack 27) ===");

  const maxHeight = 15_000;
  let engineState: SplitEngineState = INITIAL_SPLIT_STATE;
  let log: SplitEventLog = [];

  for (let h = 0; h <= maxHeight; h++) {
    const price = euPerThePriceAtHeight(h);
    const { next, decision } = stepSplitEngine(
      engineState,
      h,
      price,
      DEFAULT_SPLIT_POLICY
    );
    engineState = next;

    if (decision.shouldSplit && decision.factor != null) {
      const evt: SplitEvent = {
        height: h,
        factor: decision.factor,
        cumulativeFactor: engineState.cumulativeFactor,
        euPerThePrice: price,
        reason: decision.reason
      };
      log = appendSplitEvent(log, evt);
      console.log("\n--- SPLIT EVENT ---");
      console.log("  height:", h);
      console.log("  price EU/THE:", price.toFixed(4));
      console.log("  factor:", decision.factor.toString());
      console.log("  cumulativeFactor:", engineState.cumulativeFactor.toString());
      console.log("  reason:", decision.reason);
    }
  }

  console.log("\n=== SPLIT EVENTS LOG SUMMARY ===");
  console.log("Total split events:", log.length);
  for (const evt of log) {
    console.log(
      `  height=${evt.height} price EU/THE=${evt.euPerThePrice.toFixed(4)} ` +
        `factor=${evt.factor.toString()} cumFactor=${evt.cumulativeFactor.toString()} reason=${evt.reason}`
    );
  }

  const cf0 = cumulativeFactorAtHeight(log, 0);
  const cfMid = cumulativeFactorAtHeight(log, Math.floor(maxHeight / 2));
  const cfMax = cumulativeFactorAtHeight(log, maxHeight);

  console.log("\n=== CUMULATIVE FACTOR CHECKS ===");
  console.log("  at height 0      :", cf0.toString());
  console.log("  at height ~mid   :", cfMid.toString());
  console.log("  at height max    :", cfMax.toString());
  console.log("=== SPLIT EVENTS SIM COMPLETE ===");
}

if (require.main === module) {
  runSplitEventsSim();
}
