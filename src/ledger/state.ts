import type { Address, Amount, Hash, Height, UnixTimeSeconds } from "../types/primitives.js";
import type { Block, Transaction } from "./block.js";
import { computeBlockRewards, applyMinerReward, applyNodeReward } from "../rewards/rewards.js";
import { checkForSplit, applySplit } from "../splits/split-engine.js";

// Simple account model for L1 balances.
// §040 — Mining & Rewards, §065/§125 — Vaults, §075/§080 — BoT.
export interface AccountState {
  readonly address: Address;
  balanceTHE: Amount;
}

// Global chain state at a given height.
// This is what the header's stateRoot conceptually commits to.
export interface ChainState {
  readonly height: Height;
  readonly timestamp: UnixTimeSeconds;
  readonly lastBlockHash: Hash | null;

  // Simple in-memory key/value store for now.
  // Later this can be backed by a trie or DB.
  accounts: Map<Address, AccountState>;
}

// Create an empty genesis state.
// Later we will wire this to §095/§095B for actual genesis allocations.
export function createGenesisState(): ChainState {
  return {
    height: 0,
    timestamp: 0,
    lastBlockHash: null,
    accounts: new Map()
  };
}

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

// Get or create an account entry.
function getOrCreateAccount(state: ChainState, addr: Address): AccountState {
  let acct = state.accounts.get(addr);
  if (!acct) {
    acct = { address: addr, balanceTHE: 0n };
    state.accounts.set(addr, acct);
  }
  return acct;
}

// Basic header validation (dev-phase).
function validateHeader(state: ChainState, block: Block): void {
  // Height must be exactly +1
  if (block.header.height !== state.height + 1) {
    throw new Error(
      `Invalid block height: expected ${state.height + 1} got ${block.header.height}`
    );
  }

  // prevHash must match lastBlockHash (dev-phase; real block hash to come later)
  if (state.lastBlockHash !== null && block.header.prevHash !== state.lastBlockHash) {
    throw new Error(
      `Invalid prevHash: expected ${state.lastBlockHash} got ${block.header.prevHash}`
    );
  }

  // Timestamps must be non-decreasing
  if (block.header.timestamp < state.timestamp) {
    throw new Error(`Timestamp regression detected`);
  }
}

// Apply a single transaction.
// For now we ONLY implement basic TRANSFER semantics.
// Everything else is a no-op placeholder.
function applyTransaction(state: ChainState, tx: Transaction): void {
  switch (tx.kind) {
    case "TRANSFER": {
      if (!tx.to) {
        throw new Error("TRANSFER tx missing 'to' address");
      }
      if (tx.amount <= 0n) {
        throw new Error("TRANSFER tx must have positive amount");
      }

      const fromAcct = getOrCreateAccount(state, tx.from);
      if (fromAcct.balanceTHE < tx.amount) {
        throw new Error("Insufficient balance for TRANSFER");
      }

      const toAcct = getOrCreateAccount(state, tx.to);

      fromAcct.balanceTHE -= tx.amount;
      toAcct.balanceTHE += tx.amount;
      return;
    }

    case "VAULT_OP":
      // TODO: Implement vault operations (§065/§125).
      return;

    case "BOT_OP":
      // TODO: Implement BoT treasury ops (§075/§080/§200).
      return;

    case "PARAM_UPDATE":
      // TODO: Implement param registry updates (Appendix-B).
      return;

    case "ANCHOR_L2":
    case "ANCHOR_L3":
      // TODO: Implement rollup anchor verification (§030).
      return;
  }
}

// Apply TXs for a block.
function applyTransactions(state: ChainState, block: Block): void {
  for (const tx of block.txs) {
    applyTransaction(state, tx);
  }
}

// ---------------------------------------------------------------------------
// MAIN STATE TRANSITION FUNCTION
// ---------------------------------------------------------------------------

export function applyBlock(state: ChainState, block: Block): ChainState {
  // 1) Validate header basics
  validateHeader(state, block);

  // 2) Clone state so we mutate safely (pure-ish functional style)
  const newState: ChainState = {
    ...state,
    height: block.header.height,
    timestamp: block.header.timestamp,
    // NOTE: for now we store prevHash here; once we compute actual block hashes
    // we will update this to store the current block's hash instead.
    lastBlockHash: block.header.prevHash,
    accounts: new Map(state.accounts) // shallow copy of map; values are shared
  };

  // 3) Apply transactions
  applyTransactions(newState, block);

  // 4) Rewards
  const reward = computeBlockRewards(block.header);

  // 4a) Miner reward → credit directly to miner address
  applyMinerReward(newState, block.header.miner, reward.minerReward);

  // 4b) Node reward → NIP / BoT handled later (currently a no-op)
  applyNodeReward(newState, reward.nodeReward);

  // 5) Split Engine (if a split is triggered at this height)
  const splitEvent = checkForSplit(newState);
  if (splitEvent) {
    applySplit(newState, splitEvent);
  }

  // 6) Return the new state snapshot
  return newState;
}
