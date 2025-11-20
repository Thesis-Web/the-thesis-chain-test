// Canonical L1 chain parameters.
//
// Sourced primarily from docs/sections:
// - §020 Proof of Energy Fairness
// - §030 Ledger Architecture
// - §040 Mining & Rewards
// - §085 Split Engine
// - §101 Split Invariance Protocol
// - §200 Supply Governance & Burn Mechanics
//
// NOTE:
// - All numeric "amount" values that represent THE are expressed as bigint.
// - Reward schedule values are DEV-PHASE defaults and will be tuned
//   against Appendix-B / sims. Structure is stable; numbers are not.

export interface RewardScheduleEntry {
  // Epoch index (0-based) from which this entry applies.
  // Example:
  //   { fromEpoch: 0,  minerRewardTHE: 10n, nodeRewardTHE: 0n }
  //   { fromEpoch: 10, minerRewardTHE: 8n,  nodeRewardTHE: 1n }
  // means:
  //   epochs 0–9  → 10 THE to miner, 0 THE to NIP
  //   epochs 10–19 → 8 THE to miner, 1 THE to NIP
  readonly fromEpoch: number;
  readonly minerRewardTHE: bigint;
  readonly nodeRewardTHE: bigint;
}

export interface ChainParams {
  readonly BLOCK_TIME_SECONDS: number;       // §030 — 4 min blocks
  readonly EPOCH_LENGTH_BLOCKS: number;      // 28 days @ 4 min → 10,080
  readonly GENESIS_HEIGHT: number;           // usually 0

  // Block sizing / safety rails (conservative defaults; tune later).
  readonly MAX_BLOCK_SIZE_BYTES: number;

  // Legacy/simple reward caps (still used as safety rails).
  readonly MAX_MINER_REWARD_THE: bigint;
  readonly MINER_REWARD_BASIS_POINTS: number;  // 10_000 = 100%
  readonly NODE_REWARD_PER_BLOCK_THE: bigint;  // legacy flat emission (fallback)

  // Epoch-based reward schedule.
  readonly REWARD_SCHEDULE: readonly RewardScheduleEntry[];

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

  // Safety caps / legacy fields.
  MAX_MINER_REWARD_THE: 10n,
  MINER_REWARD_BASIS_POINTS: 10_000, // miners get 100% of miner reward
  NODE_REWARD_PER_BLOCK_THE: 0n,     // legacy flat emission (unused once schedule is live)

  // DEV-PHASE REWARD SCHEDULE (example shape):
  //
  // Epochs are 0-based:
  //   epoch 0   → blocks 1..10,080
  //   epoch 1   → blocks 10,081..20,160
  //
  // Numbers here are *not final economics*; they are a stable shape we can
  // later tune to exact values once sims + Appendix-B are fully wired.
  REWARD_SCHEDULE: Object.freeze<RewardScheduleEntry[]>([
    // Bootstrapping phase — higher miner reward, no NIP yet.
    { fromEpoch: 0,  minerRewardTHE: 10n, nodeRewardTHE: 0n },

    // Early growth — small NIP trickle begins.
    { fromEpoch: 10, minerRewardTHE: 8n,  nodeRewardTHE: 1n },

    // Maturing — miner reward tapers, NIP grows.
    { fromEpoch: 20, minerRewardTHE: 6n,  nodeRewardTHE: 2n },

    // Long tail — sustainable equilibrium placeholder.
    { fromEpoch: 40, minerRewardTHE: 4n,  nodeRewardTHE: 3n }
  ]),

  // §085 Split Engine — allowed upward split factors (no reverse splits).
  SPLIT_UPWARD_FACTORS: Object.freeze([2, 3, 5])
});
