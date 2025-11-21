// src/sims/pow-sim.ts
// ---------------------------------------------------------------------------
// POW SIM
// ---------------------------------------------------------------------------
//
// This sim:
//   - Creates a standalone PoW state
//   - Mines a short sequence of "headers" (no ledger/state attached)
//   - Prints nonce, partial hash, and attempts per block
//
// We keep it decoupled from ledger/block.ts so that we don't disturb the
// existing sims. Later, we will wire this PoW engine into real blocks.
// ---------------------------------------------------------------------------

import type { Hash } from "../types/primitives";
import {
  DEFAULT_POW_PARAMS,
  createInitialPowState,
  mineHeader,
  makeHarder,
  makeEasier
} from "../pow/pow";

console.log("=== POW SIM ===\n");

const params = DEFAULT_POW_PARAMS;
const powState = createInitialPowState(params);

let height = 0;
let lastHash: Hash | null = null;

// For demo, mine 8 blocks, and tweak difficulty mid-way to show the hooks.
const TOTAL_BLOCKS = 8;

for (let i = 1; i <= TOTAL_BLOCKS; i++) {
  height = i;
  const timestamp = Date.now();

  const headerData = `${height}|${lastHash ?? ""}|${timestamp}|MINER_DEMO`;

  console.log(`>>> MINE BLOCK ${height}`);
  console.log(`  target (bits approx): ${(256n - BigInt(powState.target.toString(2).length)).toString()} leading zeros`);

  const start = Date.now();
  const result = mineHeader(headerData, powState, params);
  const end = Date.now();

  console.log(
    `  nonce=${result.nonce.toString()} attempts=${result.attempts.toString()} time=${end - start}ms`
  );
  console.log(`  hash=${result.hash.slice(0, 16)}...\n`);

  lastHash = result.hash;

  // Demo difficulty adjustment:
  //   - After block 4, make it harder (smaller target).
  //   - After block 6, make it easier again.
  if (height === 4) {
    console.log("*** Making PoW harder (target / 4) ***\n");
    makeHarder(powState, 4n);
  } else if (height === 6) {
    console.log("*** Making PoW easier (target * 4) ***\n");
    makeEasier(powState, 4n);
  }
}

console.log("=== POW SIM COMPLETE ===");
