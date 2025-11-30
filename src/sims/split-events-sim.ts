// TARGET: chain src/sims/split-events-sim.ts
//
// High-level sim that wires together:
//   • split-policy (thresholds, min-interval)
//   • split-orchestrator (engine state)
//   • split-events (log append)
//
// This does NOT touch consensus ChainState or the real ledger. It's a
// self-contained playground for verifying that our split policy, engine, and
// event log surfaces behave correctly under a synthetic EU/THE price path.

import { DEFAULT_SPLIT_POLICY, evaluateSplitDecision } from "../splits/split-policy";
import { initSplitEngineState, stepSplitEngine } from "../splits/split-orchestrator";
import type { SplitEngineState } from "../splits/split-orchestrator";
import { appendSplitEvent, SplitEvent, SplitEventLog } from "../consensus/split-events";

function syntheticEuPerThePrice(height: number): number {
  // Simple rising curve, similar to dev-split-sim: starts at 1.0 and
  // asymptotically grows past the first threshold (3.0) over time.
  const t = height / 10_000;
  return 1.0 + 2.2 * (1 - Math.exp(-3 * t));
}

export function runSplitEventsSim(maxHeight: number = 15_000): void {
  console.log("=== SPLIT EVENTS SIM (Pack 25 scaffolding) ===");
  console.log("maxHeight:", maxHeight);

  let engine: SplitEngineState = initSplitEngineState();
  let log: SplitEventLog = [];

  for (let h = 0; h <= maxHeight; h++) {
    const price = syntheticEuPerThePrice(h);

    const { state, decision } = stepSplitEngine(engine, {
      height: h,
      euPerThePrice: price,
      policy: DEFAULT_SPLIT_POLICY
    });

    engine = state;

    if (decision.shouldSplit && decision.factor != null) {
      const evt: SplitEvent = {
        height: h,
        factor: decision.factor,
        cumulativeFactor: state.cumulativeFactor,
        euPerThePrice: price,
        reason: decision.reason,
        timestampMs: Date.now()
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
      "  height=" + evt.height,
      "price EU/THE=" + evt.euPerThePrice.toFixed(4),
      "factor=" + evt.factor.toString(),
      "cumFactor=" + evt.cumulativeFactor.toString(),
      "reason=" + evt.reason
    );
  }

  console.log("=== SPLIT EVENTS SIM COMPLETE ===");
}

if (require.main === module) {
  runSplitEventsSim();
}
