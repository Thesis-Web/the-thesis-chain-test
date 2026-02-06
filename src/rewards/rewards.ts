// src/rewards/rewards.ts
// ---------------------------------------------------------------------------
// Rewards facade — wires emission math into ChainState accounts.
// ---------------------------------------------------------------------------

import type { Address } from "../types/primitives";
import type { ChainState } from "../ledger/state";
import { getOrCreateAccount } from "../ledger/state";
import { computeEmissionForHeight } from "../emissions/model";

// Fixed account ID for the Node Income Pool on L1.
const NIP_ACCOUNT: Address = "NIP_POOL";

export { computeEmissionForHeight } from "../emissions/model";

/**
 * Apply miner + Node Income Pool rewards for a given block height.
 */
export function applyBlockReward(
  state: ChainState,
  miner: Address,
  height: number
): void {
  const { minerRewardTHE, nipRewardTHE } = computeEmissionForHeight(height);

  // Credit miner
  const minerAcct = getOrCreateAccount(state, miner);
  minerAcct.balanceTHE += minerRewardTHE;

  // Credit Node Income Pool
  const nipAcct = getOrCreateAccount(state, NIP_ACCOUNT);
  nipAcct.balanceTHE += nipRewardTHE;
}
