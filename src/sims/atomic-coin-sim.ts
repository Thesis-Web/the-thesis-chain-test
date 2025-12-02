// TARGET: chain src/sims/atomic-coin-sim.ts
// src/sims/atomic-coin-sim.ts
// ---------------------------------------------------------------------------
// Pack 49 — Atomic-Coin Enforcement (Phase 1 Sim)
//
// A tiny harness that exercises the atomic coin policy math in isolation.
// This does *not* touch the live ledger yet; it is meant to:
//   • prove the helpers behave as expected,
//   • provide a stable reference for future integration packs,
//   • give us a quick regression check for atomic math.
// ---------------------------------------------------------------------------

import {
  DEFAULT_ATOMIC_COIN_POLICY,
  quantizeToAtomic,
  validateAtomicAmount,
  assertAtomicAmount,
} from "../ledger/atomic-coin";

function runAtomicCoinSim(): void {
  console.log("=== ATOMIC COIN SIM (Pack 49) ===");

  const policy = DEFAULT_ATOMIC_COIN_POLICY;

  const samples: bigint[] = [
    0n,
    1n,
    2n,
    10n,
    -1n,
  ];

  for (const raw of samples) {
    const { q, r } = quantizeToAtomic(policy, raw);
    const err = validateAtomicAmount(policy, raw);

    console.log("---");
    console.log(`raw=${raw}`);
    console.log(`  q=${q}, r=${r}`);
    console.log("  validateAtomicAmount:", err ?? "OK");

    try {
      assertAtomicAmount(policy, raw);
      console.log("  assertAtomicAmount: OK");
    } catch (e) {
      console.log("  assertAtomicAmount: ERROR ->", (e as Error).message);
    }
  }

  console.log("=== ATOMIC COIN SIM COMPLETE ===");
}

runAtomicCoinSim();
