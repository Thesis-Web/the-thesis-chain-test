// src/rewards/rewards
// ---------------------------------------------------------------------------
// Simple block rewards (v1 scaffold)
// ---------------------------------------------------------------------------
//
// For now:
//   - fixed 10 THE per block to miner
//   - no node pool / NIP yet
// ---------------------------------------------------------------------------

import type { Amount, Address } from "../types/primitives";
import type { ChainState } from "../ledger/state";
import { creditAccount } from "../ledger/state";

// Fixed block reward in base THE units.
export function computeBlockReward(height: number): Amount {
  // Later: make this epoch-aware per Appendix-B / §040.
  return 10n;
}

// Apply reward to miner.
export function applyBlockReward(
  state: ChainState,
  miner: Address,
  height: number
): void {
  const reward = computeBlockReward(height);
  if (reward <= 0n) return;
  creditAccount(state, miner, reward);
}
