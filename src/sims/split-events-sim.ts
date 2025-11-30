// TARGET: chain src/sims/split-events-sim.ts
import { appendSplitEvent, cumulativeFactorAtHeight, SplitEvent } from "../consensus/split-events";
import { DEFAULT_SPLIT_POLICY, stepSplitEngine } from "../splits/split-orchestrator";

function syntheticEuPerThePrice(h: number): number {
  const t = h / 10000;
  return 1.0 + 2.2 * (1 - Math.exp(-3 * t));
}

export function runSplitEventsSim(maxHeight = 15000) {
  let log: readonly SplitEvent[] = [];

  const engine = {}; // placeholder orchestrator state

  for (let h = 0; h < maxHeight; h++) {
    const price = syntheticEuPerThePrice(h);
    const { decision } = stepSplitEngine(engine as any, {
      height: h,
      euPerThePrice: price,
      policy: DEFAULT_SPLIT_POLICY
    });
    if (decision.shouldSplit) {
      const evt: SplitEvent = {
        height: h,
        factor: BigInt(decision.factor),
        cumulativeFactor: BigInt(decision.cumulativeFactor),
        euPerThePrice: price,
        reason: decision.reason,
        timestampMs: Date.now()
      };
      log = appendSplitEvent(log, evt);
    }
  }

  console.log("=== SPLIT EVENTS SIM SUMMARY ===");
  console.log("Total split events:", log.length);
  for (const evt of log) {
    console.log(`  h=${evt.height} price=${evt.euPerThePrice.toFixed(4)} factor=${evt.factor} cum=${evt.cumulativeFactor} reason=${evt.reason}`);
  }
  console.log("cumulativeFactorAtHeight(0):", cumulativeFactorAtHeight(log, 0));
  console.log("cumulativeFactorAtHeight(max/2):", cumulativeFactorAtHeight(log, Math.floor(maxHeight/2)));
  console.log("cumulativeFactorAtHeight(max):", cumulativeFactorAtHeight(log, maxHeight));
}

if (require.main === module) runSplitEventsSim();
