import type { Address, Amount } from "../types/primitives.js";
import type { Block, BlockHeader } from "./block.js";
import { computeBlockRewards, applyMinerReward, applyNodeReward } from "../rewards/rewards.js";
import type { VaultMap } from "../vault/types.js";

// ---------------------------------------------------------------------------
// ACCOUNTS
// ---------------------------------------------------------------------------

export interface Account {
  readonly address: Address;
  balanceTHE: Amount;
}

// Simple transfer transaction used in sims.
// Later, we can extend this into a tagged union (PAY, VAULT_OP, GOV_OP, etc.).
export interface Transaction {
  from: Address;
  to: Address;
  amountTHE: Amount; // always base THE
}

// ---------------------------------------------------------------------------
// CHAIN STATE
// ---------------------------------------------------------------------------

// This is the canonical in-memory representation of chain state for sims.
// On a real node, this would be backed by a DB / trie, but the shape is the same.
export interface ChainState {
  // Current canonical height (best chain tip).
  height: number;

  // Simple account model: Address → Account.
  accounts: Map<Address, Account>;

  // Vaults: used for EU Certificates and wTHE-backing escrow.
  // For now, these are populated only by sims / future tx handlers.
  vaults: VaultMap;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

export function getOrCreateAccount(state: ChainState, addr: Address): Account {
  let acct = state.accounts.get(addr);
  if (!acct) {
    acct = { address: addr, balanceTHE: 0n };
    state.accounts.set(addr, acct);
  }
  return acct;
}

// Simple transfer handler used in the basic sim. This will eventually be
// replaced by a richer transaction dispatcher but is fine for now.
export function applyTransferTx(state: ChainState, tx: Transaction): void {
  if (tx.amountTHE <= 0n) return;

  const from = getOrCreateAccount(state, tx.from);
  const to = getOrCreateAccount(state, tx.to);

  if (from.balanceTHE < tx.amountTHE) {
    throw new Error(`Insufficient balance for ${tx.from}`);
  }

  from.balanceTHE -= tx.amountTHE;
  to.balanceTHE += tx.amountTHE;
}

// ---------------------------------------------------------------------------
// GENESIS
// ---------------------------------------------------------------------------

export interface GenesisAccountInit {
  address: Address;
  balanceTHE: Amount;
}

export interface GenesisConfig {
  height?: number;
  accounts?: GenesisAccountInit[];
}

// Minimal genesis for sims: accept an optional list of initial accounts.
export function createGenesisState(cfg: GenesisConfig = {}): ChainState {
  const accounts = new Map<Address, Account>();

  for (const init of cfg.accounts ?? []) {
    accounts.set(init.address, {
      address: init.address,
      balanceTHE: init.balanceTHE
    });
  }

  const vaults: VaultMap = new Map();

  return {
    height: cfg.height ?? 0,
    accounts,
    vaults
  };
}

// ---------------------------------------------------------------------------
// BLOCK APPLICATION
// ---------------------------------------------------------------------------

// Apply all transactions in a block in order (naive, single-threaded).
function applyTransactions(state: ChainState, block: Block): void {
  for (const tx of block.txs as Transaction[]) {
    applyTransferTx(state, tx);
  }
}

// Apply header-level economics (miner + node rewards).
function applyRewards(state: ChainState, header: BlockHeader): void {
  const { minerReward, nodeReward } = computeBlockRewards(header);

  if (!header.miner) {
    throw new Error("BlockHeader.miner is required for rewards");
  }

  if (minerReward > 0n) {
    applyMinerReward(state, header.miner, minerReward);
  }
  if (nodeReward > 0n) {
    applyNodeReward(state, nodeReward);
  }
}

// Public entry point used by sims.
// This mutates the state in-place.
export function applyBlock(state: ChainState, block: Block): void {
  // Basic monotonic height check.
  if (block.header.height !== state.height + 1) {
    throw new Error(
      `applyBlock: unexpected height. Got ${block.header.height}, expected ${state.height + 1}`
    );
  }

  // 1) Apply transactions.
  applyTransactions(state, block);

  // 2) Apply rewards (miner + node pool).
  applyRewards(state, block.header);

  // 3) Advance height.
  state.height = block.header.height;

  // NOTE:
  // - Vaults are present on ChainState but are not yet wired into any tx type.
  // - Split engine, EU Cert logic, and wTHE-backing behavior will be layered
  //   on top in separate, explicit steps so we don't accidentally drift.
}
