// TARGET: chain src/sims/header-hash-sim.ts
// src/sims/header-hash-sim.ts
// ---------------------------------------------------------------------------
// Pack 14.0 — Header hashing + PoW interplay sim
// ---------------------------------------------------------------------------
//
// This sim demonstrates how:
//   • L1Header is constructed,
//   • hashHeaderToHex() derives a canonical block hash,
//   • that hash can be fed into the existing PoW helpers.
//
// It does not modify the real Block type yet; it is a clean, isolated
// demonstration of the header + hash pipeline.
// ---------------------------------------------------------------------------

import { hashHeaderToHex, type L1Header } from "../consensus/header-hash";
import {
  isHashBelowTarget,
  ensurePowMeetsTarget,
  makeSyntheticValidHash
} from "../consensus/pow";

function runSim(): void {
  console.log("=== Header Hash Sim (Pack 14.0) ===");

  const target = 1000000000000n;

  const header: L1Header = {
    parentHash: "0".repeat(64),
    height: 1,
    timestampSec: 1_700_000_000,
    nonce: 42n,
    extraData: "genesis-test"
  };

  const hash = hashHeaderToHex(header);
  console.log("header hash =", hash);

  // For this proto sim, we don't try to make this real hash satisfy the target.
  // Instead, we demonstrate PoW helpers with a synthetic valid hash and show
  // how a real header hash could be checked in the future.
  const syntheticValid = makeSyntheticValidHash(target);
  console.log("syntheticValid =", syntheticValid);
  console.log("isHashBelowTarget(syntheticValid) =", isHashBelowTarget(syntheticValid, target));
  ensurePowMeetsTarget(syntheticValid, target);
  console.log("syntheticValid passed ensurePowMeetsTarget");

  console.log("=== Header Hash Sim COMPLETE ===");
}

runSim();
