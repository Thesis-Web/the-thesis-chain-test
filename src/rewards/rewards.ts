// src/rewards/rewards.ts
// ---------------------------------------------------------------------------
// Block reward application: miner + node income pool (NIP).
// Uses emission model + epoch schedule from src/emissions/model.ts.
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";
import type { ChainState } from "../ledger/state";
import { creditAccount } from "../ledger/state";
import { computeBlockRewards } from "../emissions/model";

// Internal pseudo-address for the Node Income Pool (NIP).
// This is *not* a normal user wallet; BoT/Treasury will manage it.
export const NODE_POOL_ADDRESS: Address = "NIP_POOL";

export interface AppliedRewards {
  readonly minerReward: Amount;
  readonly nodeReward: Amount;
  readonly epochIndex: number;
}

// Apply rewards for a given block height.
//  • credits miner account
//  • credits node pool account
//  • returns the amounts applied (for sims / logging)
export function applyBlockReward(
  state: ChainState,
  miner: Address,
  height: number
): AppliedRewards {
  const { minerReward, nodeReward, epochIndex } = computeBlockRewards(height);

  if (minerReward > 0n) {
    creditAccount(state, miner, minerReward);
  }

  if (nodeReward > 0n) {
    creditAccount(state, NODE_POOL_ADDRESS, nodeReward);
  }

  return { minerReward, nodeReward, epochIndex };
}
