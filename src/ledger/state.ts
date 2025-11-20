import type { Address, Amount, Hash, Height, UnixTimeSeconds } from "../types/primitives.js";
import type { Block } from "./block.js";

// Simple account model for L1 balances.
// §040 — Mining & Rewards, §065/§125 — Vaults, §075/§080 — BoT.
export interface AccountState {
  readonly address: Address;
  balanceTHE: Amount;     // liquid THE balance
  // NOTE: Vaults, escrow, and EU-specific fields will live in dedicated modules
  // and be referenced via IDs / keys here, rather than bloating the core account.
}

// Global chain state at a given height.
// This is what stateRoot in the header is committing to (conceptually).
export interface ChainState {
  readonly height: Height;
  readonly timestamp: UnixTimeSeconds;
  readonly lastBlockHash: Hash | null;

  // Simple key-value map of address → account state.
  // Implementation detail: this will be backed by a proper store / trie later.
  accounts: Map<Address, AccountState>;

  // Placeholder hooks for specialized sub-ledgers.
  // These will be typed modules tied to §§065/075/080/125.
  // e.g. vaultRegistry, escrowPools, paramRegistry, etc.
}

// Create an empty genesis state. We'll later wire this to §095/§095B.
export function createGenesisState(): ChainState {
  return {
    height: 0,
    timestamp: 0,
    lastBlockHash: null,
    accounts: new Map()
  };
}

// Apply a block to the current state.
//
// This is the heart of the L1 implementation; right now it's just a stub.
// Next step: implement this using §040 (rewards), §085/§101 (splits),
// and the invariants from §020/§030.
export function applyBlock(state: ChainState, block: Block): ChainState {
  // TODO:
  // 1. Validate header (prevHash, height, timestamp drift).
  // 2. Recompute txRoot, stateRoot pre/post and compare.
  // 3. Iterate txs, mutate accounts map safely.
  // 4. Apply miner rewards + node reward emission (via rewards module).
  // 5. Invoke split engine when configured epochs/triggers are hit.
  // For now, just bump height and timestamp with no changes.
  return {
    ...state,
    height: block.header.height,
    timestamp: block.header.timestamp,
    lastBlockHash: block.header.prevHash // placeholder until we compute actual block hash
  };
}

