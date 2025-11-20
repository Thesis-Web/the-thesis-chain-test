import type { Address, Amount } from "../types/primitives.js";
import type { Block, BlockHeader } from "./block.js";
import { computeBlockRewards, applyMinerReward, applyNodeReward } from "../rewards/rewards.js";
import type { VaultMap, VaultId } from "../vault/types.js";
import { createVault, depositToVault, withdrawFromVault } from "../vault/vault.js";

// ---------------------------------------------------------------------------
// TRANSACTION TYPES
// ---------------------------------------------------------------------------

export type TxKind = "PAY" | "VAULT_OP";

// Basic payment transaction: move THE between accounts.
export interface PaymentTx {
  kind: "PAY";
  from: Address;
  to: Address;
  amountTHE: Amount; // base THE units
}

// Vault operations are generic for now; EU-/wTHE-specific semantics will be
// layered on later once §§096 / 096a / 101 are fully wired.
export type VaultOpKind =
  | "VAULT_CREATE"   // create a new vault with an owner and optional initial deposit
  | "VAULT_DEPOSIT"  // move THE from an account into an existing vault
  | "VAULT_WITHDRAW"; // move THE from a vault into an account

export interface VaultOpTxBase {
  kind: "VAULT_OP";
  op: VaultOpKind;
  vaultId: VaultId;
}

// Create a new vault and optionally fund it from a source account.
export interface VaultCreateTx extends VaultOpTxBase {
  op: "VAULT_CREATE";
  owner: Address;
  from?: Address;          // optional funding account
  initialDepositTHE?: Amount; // optional initial deposit from `from`
}

// Deposit THE from an account into an existing vault.
export interface VaultDepositTx extends VaultOpTxBase {
  op: "VAULT_DEPOSIT";
  from: Address;
  amountTHE: Amount;
}

// Withdraw THE from a vault into an account.
export interface VaultWithdrawTx extends VaultOpTxBase {
  op: "VAULT_WITHDRAW";
  to: Address;
  amountTHE: Amount;
}

export type VaultOpTx = VaultCreateTx | VaultDepositTx | VaultWithdrawTx;

export type Transaction = PaymentTx | VaultOpTx;

// ---------------------------------------------------------------------------
// ACCOUNTS
// ---------------------------------------------------------------------------

export interface Account {
  readonly address: Address;
  balanceTHE: Amount;
}

// ---------------------------------------------------------------------------
// CHAIN STATE
// ---------------------------------------------------------------------------

export interface ChainState {
  // Current canonical height (best chain tip).
  height: number;

  // Simple account model: Address → Account.
  accounts: Map<Address, Account>;

  // Vaults: used for EU Certificates and wTHE-backing escrow.
  // For now, these are populated only by dedicated VAULT_OP txs / sims.
  vaults: VaultMap;
}

// ---------------------------------------------------------------------------
// ACCOUNT HELPERS
// ---------------------------------------------------------------------------

export function getOrCreateAccount(state: ChainState, addr: Address): Account {
  let acct = state.accounts.get(addr);
  if (!acct) {
    acct = { address: addr, balanceTHE: 0n };
    state.accounts.set(addr, acct);
  }
  return acct;
}

// Basic PAY transaction handler.
export function applyPaymentTx(state: ChainState, tx: PaymentTx): void {
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
// VAULT OP HANDLER (GENERIC FOR NOW)
// ---------------------------------------------------------------------------

function applyVaultOpTx(state: ChainState, tx: VaultOpTx): void {
  const height = state.height; // use current height for vault metadata

  switch (tx.op) {
    case "VAULT_CREATE": {
      const owner = tx.owner;
      const initialDeposit = tx.initialDepositTHE ?? 0n;

      // 1) Create the vault (empty).
      createVault(state.vaults, tx.vaultId, owner, height);

      // 2) Optional initial deposit from `from` account.
      if (initialDeposit > 0n) {
        if (!tx.from) {
          throw new Error("VAULT_CREATE with initialDepositTHE requires `from` account");
        }
        const fromAcct = getOrCreateAccount(state, tx.from);
        if (fromAcct.balanceTHE < initialDeposit) {
          throw new Error(`VAULT_CREATE: insufficient balance in ${tx.from}`);
        }
        fromAcct.balanceTHE -= initialDeposit;
        depositToVault(state.vaults, tx.vaultId, initialDeposit, height);
      }
      break;
    }

    case "VAULT_DEPOSIT": {
      if (tx.amountTHE <= 0n) return;

      const fromAcct = getOrCreateAccount(state, tx.from);
      if (fromAcct.balanceTHE < tx.amountTHE) {
        throw new Error(`VAULT_DEPOSIT: insufficient balance in ${tx.from}`);
      }

      fromAcct.balanceTHE -= tx.amountTHE;
      depositToVault(state.vaults, tx.vaultId, tx.amountTHE, height);
      break;
    }

    case "VAULT_WITHDRAW": {
      if (tx.amountTHE <= 0n) return;

      // Ensure vault has funds; withdrawFromVault will enforce no overdraft.
      withdrawFromVault(state.vaults, tx.vaultId, tx.amountTHE, height);

      const toAcct = getOrCreateAccount(state, tx.to);
      toAcct.balanceTHE += tx.amountTHE;
      break;
    }

    default: {
      const _exhaustive: never = tx;
      throw new Error(`Unknown VaultOp kind: ${(tx as any).op}`);
    }
  }
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

function applyTransactions(state: ChainState, block: Block): void {
  for (const raw of block.txs as Transaction[]) {
    switch (raw.kind) {
      case "PAY":
        applyPaymentTx(state, raw);
        break;
      case "VAULT_OP":
        applyVaultOpTx(state, raw);
        break;
      default: {
        const _never: never = raw;
        throw new Error(`Unknown tx kind: ${(raw as any).kind}`);
      }
    }
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
  // - Vaults are present on ChainState and now manipulated via VAULT_OP txs.
  // - EU Certificate vs wTHE-specific semantics are *not* encoded here yet.
  //   Those rules will be layered in once the higher-level spec sections are
  //   wired through dedicated helpers.
}
