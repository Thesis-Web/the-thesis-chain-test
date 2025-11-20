// Canonical L1 chain parameters.
// Sourced primarily from docs/sections:
// - §020 Proof of Energy Fairness
// - §030 Ledger Architecture
// - §040 Mining & Rewards
// - §085 Split Engine
// - §101 Split Invariance Protocol
// - §200 Supply Governance & Burn Mechanics

// NOTE: All numeric "amount" values that represent THE are expressed as bigint,
// even if they start as integers, to avoid rounding issues later.

export interface ChainParams {
  readonly BLOCK_TIME_SECONDS: number;       // §030 — 4 min blocks
  readonly EPOCH_LENGTH_BLOCKS: number;      // 28 days @ 4 min → 10,080
  readonly GENESIS_HEIGHT: number;           // usually 0

  // Block sizing / safety rails (these are conservative defaults, tune later).
  readonly MAX_BLOCK_SIZE_BYTES: number;

  // Rewards (v1 dev-phase placeholders; values will be tuned from sims/specs).
  // Miner base reward per block (max) in THE.
  readonly MAX_MINER_REWARD_THE: bigint;

  // Miner share of that base reward, in basis points (1/10,000).
  // Current design: miners receive 100% of the base miner reward.
  readonly MINER_REWARD_BASIS_POINTS: number;  // 10_000 = 100%

  // Node Income Pool (NIP) per-block emission, in THE.
  // NOTE: From your latest clarification, node rewards are separate from
  // base miner emission; no 80/20 split inside the block.
  readonly NODE_REWARD_PER_BLOCK_THE: bigint;

  // Split engine config (hooks into §085 / §101).
  readonly SPLIT_UPWARD_FACTORS: readonly number[]; // e.g. [2, 3, 5]
}

// Initial v1 params. We'll keep this small and explicitly override via a
// future on-chain parameter registry module (tied to Appendix-B).
export const CHAIN_PARAMS: ChainParams = Object.freeze({
  BLOCK_TIME_SECONDS: 4 * 60,        // 4 minutes
  EPOCH_LENGTH_BLOCKS: 10_080,       // 28 days @ 4 min blocks
  GENESIS_HEIGHT: 0,

  MAX_BLOCK_SIZE_BYTES: 1_000_000,   // 1 MB placeholder, safe for sims

  // From REWARDS_EMISSIONS + your latest design notes:
  // Dev-phase max reward: up to 10 THE per block, clamped via EU oracle display.
  MAX_MINER_REWARD_THE: 10n,

  // Latest decision: miners receive the full base block reward;
  // nodes are paid from a separate pool (not a block split).
  MINER_REWARD_BASIS_POINTS: 10_000, // 100%

  // Start with 0 and later derive from NODE_TIERS & fee schedules.
  NODE_REWARD_PER_BLOCK_THE: 0n,

  // §085 Split Engine — allowed upward split factors (no reverse splits).
  SPLIT_UPWARD_FACTORS: Object.freeze([2, 3, 5])
});

