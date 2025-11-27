// TARGET: chain src/sims/pow-consensus-sim.ts
// src/sims/pow-consensus-sim.ts
// ---------------------------------------------------------------------------
// Pack 13.3 — PoW helper sanity sim (Option A)
// ---------------------------------------------------------------------------
//
// This sim does *not* use full ChainState. Instead, it demonstrates how to:
//   • generate a synthetic valid hash for a given difficulty target, and
//   • enforce PoW using ensurePowMeetsTarget.
//
// This keeps things decoupled from header layout while still proving that the
// PoW helpers behave as intended.
// ---------------------------------------------------------------------------

import {
  makeSyntheticValidHash,
  ensurePowMeetsTarget,
  isHashBelowTarget
} from "../consensus/pow";

function runSim(): void {
  console.log("=== PoW Helper Sim (Pack 13.3, Option A) ===");

  const target = 1000000000000n;

  const goodHash = makeSyntheticValidHash(target);
  console.log("goodHash =", goodHash);

  // This should be below the target and pass enforcement.
  console.log("isHashBelowTarget(goodHash) =", isHashBelowTarget(goodHash, target));
  ensurePowMeetsTarget(goodHash, target);
  console.log("goodHash passed ensurePowMeetsTarget");

  // Construct a "bad" hash by bumping the value above target.
  const badValue = target + 1n;
  const badHash = badValue.toString(16);
  console.log("badHash =", badHash);

  console.log("isHashBelowTarget(badHash) =", isHashBelowTarget(badHash, target));
  try {
    ensurePowMeetsTarget(badHash, target);
    console.log("UNEXPECTED: badHash passed ensurePowMeetsTarget");
  } catch (e) {
    console.log("Expected failure for badHash:", e instanceof Error ? e.message : String(e));
  }

  // Non-hex hashes should be treated as legacy/proto and ignored.
  const legacyHash = "block-123";
  console.log("legacyHash =", legacyHash);
  ensurePowMeetsTarget(legacyHash, target);
  console.log("legacyHash treated as no-op (legacy/proto mode)");

  console.log("=== PoW Helper Sim COMPLETE ===");
}

runSim();
