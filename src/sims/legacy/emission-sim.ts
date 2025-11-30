// src/sims/emission-sim.ts
// ---------------------------------------------------------------------------
// Emission / Epoch simulation for THE
// ---------------------------------------------------------------------------

import { createEmptyChainState } from "../ledger/state";
import { applyBlock } from "../ledger/block";
import type { Address } from "../types/primitives";

const MINER: Address = "MINER_X";

function logCheckpoint(
  height: number,
  epoch: number,
  minerBal: bigint,
  nipBal: bigint
) {
  console.log(`[checkpoint @ ${height}] height=${height} epoch=${epoch}`);
  console.log(`  MINER: { balanceTHE: ${minerBal}n }`);
  console.log(`  NIP  : { balanceTHE: ${nipBal}n }`);
  console.log();
}

(function run() {
  console.log("=== EMISSION / EPOCH SIM ===\n");

  const state = createEmptyChainState();

  // epoch index: height 1–10080 → epoch 0, etc.
  const getEpoch = (h: number) => Math.floor((h - 1) / 10_080);

  const checkpoints = [1, 10, 10_080, 10_081, 20_160, 20_161, 20_170];

  for (const h of checkpoints) {
    while (state.height < h) {
      const next = state.height + 1;

      applyBlock(state, {
        header: {
          height: next,
          prevHash: state.lastBlockHash,
          timestamp: Date.now(),
          miner: MINER
        },
        txs: []
      });
    }

    const epoch = getEpoch(h);

    const minerBal = state.accounts.get(MINER)?.balanceTHE ?? 0n;
    const nipBal = state.accounts.get("NIP_POOL")?.balanceTHE ?? 0n;

    logCheckpoint(h, epoch, minerBal, nipBal);
  }

  console.log("=== EMISSION / EPOCH SIM COMPLETE ===");
})();
