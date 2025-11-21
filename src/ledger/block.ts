import type { Address, Hash } from "../types/primitives";
import type { ChainState } from "./state";
import { applyMinerReward, applyNodeReward, computeBlockRewards } from "../rewards/rewards";

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------

export interface BlockHeader {
  height: number;
  prevHash: Hash | null;
  timestamp: number;
  miner: Address;
}

export interface Block {
  header: BlockHeader;
  // For now, we only model miner rewards; txs come next.
  txs: any[];
}

// ---------------------------------------------------------------------------
// Non-crypto hash placeholder (deterministic for sims)
// ---------------------------------------------------------------------------

export function computeBlockHash(header: BlockHeader): Hash {
  const data = JSON.stringify(header);
  // Tiny, deterministic hash-ish thing (NOT for production)
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (h * 31 + data.charCodeAt(i)) >>> 0;
  }
  return `HASH_${h.toString(16).padStart(8, "0")}`;
}

// ---------------------------------------------------------------------------
// Apply a block to ChainState
// ---------------------------------------------------------------------------

export function applyBlock(state: ChainState, block: Block): void {
  const { header } = block;

  if (header.height !== state.height + 1) {
    throw new Error(
      `applyBlock: expected height ${state.height + 1}, got ${header.height}`
    );
  }

  if (header.prevHash !== state.lastBlockHash) {
    throw new Error(
      `applyBlock: prevHash mismatch (expected ${state.lastBlockHash}, got ${header.prevHash})`
    );
  }

  // 1) Apply rewards
  const rewards = computeBlockRewards(header.height);
  applyMinerReward(state, header.miner, rewards.minerReward);
  applyNodeReward(state, rewards.nodeReward);

  // 2) (Future) apply txs here

  // 3) Update height + lastBlockHash
  state.height = header.height;
  state.lastBlockHash = computeBlockHash(header);
}
