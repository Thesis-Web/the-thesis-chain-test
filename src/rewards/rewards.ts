import type { Address, Amount } from "../types/primitives.js";
import type { ChainState } from "../ledger/state.js";
import type { BlockHeader } from "../ledger/block.js";
import { CHAIN_PARAMS } from "../config/params.js";

// §040 — Mining & Rewards
// Miner gets 100% of the base miner reward.
// Node rewards are a separate emission (NIP), not a per-block split.

// Result of computing block rewards.
export interface BlockRewardResult {
  minerReward: Amount;
  nodeReward: Amount;   // goes to Node Income Pool (not an address)
}

// Compute rewards for a block header ONLY.
// The actual state mutation happens in applyBlock, not here.
export function computeBlockRewards(header: BlockHeader): BlockRewardResult {
  // Currently miner reward is fixed for all blocks (dev phase).
  const minerReward = CHAIN_PARAMS.MAX_MINER_REWARD_THE;

  // Node reward is a fixed per-block emission (dev phase).
  const nodeReward = CHAIN_PARAMS.NODE_REWARD_PER_BLOCK_THE;

  return {
    minerReward,
    nodeReward
  };
}

// Apply miner reward → credit THE directly to miner address.
export function applyMinerReward(state: ChainState, miner: Address, amount: Amount): void {
  const acct = state.accounts.get(miner);
  if (!acct) {
    state.accounts.set(miner, {
      address: miner,
      balanceTHE: amount
    });
    return;
  }

  acct.balanceTHE += amount;
}

// Node reward (NIP) handling is a treasury-level operation.
// For now we only return the amount. BoT module will consume it.
export function applyNodeReward(_state: ChainState, _amount: Amount): void {
  // Placeholder: NIP accumulation handled by BoT/Treasury module later.
}

