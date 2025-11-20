import type { Address, Amount } from "../types/primitives.js";
import type { VaultId, VaultState, VaultMap } from "./types.js";

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

function assertPositive(amount: Amount, context: string): void {
  if (amount <= 0n) {
    throw new Error(`${context}: amount must be positive`);
  }
}

function getVaultOrThrow(vaults: VaultMap, id: VaultId): VaultState {
  const v = vaults.get(id);
  if (!v) {
    throw new Error(`Vault not found: ${id}`);
  }
  return v;
}

// ---------------------------------------------------------------------------
// CREATION
// ---------------------------------------------------------------------------

// Create a new vault. Fails if the vault id is already in use.
// NOTE: In the full spec, VaultId will be derived (e.g. from EU serials or
// structured keys); for now, it's an opaque string.
export function createVault(
  vaults: VaultMap,
  id: VaultId,
  owner: Address,
  currentHeight: number
): VaultState {
  if (vaults.has(id)) {
    throw new Error(`Vault already exists: ${id}`);
  }

  const v: VaultState = {
    id,
    owner,
    balanceTHE: 0n,
    createdAtHeight: currentHeight,
    updatedAtHeight: currentHeight
  };

  vaults.set(id, v);
  return v;
}

// ---------------------------------------------------------------------------
// DEPOSITS / WITHDRAWALS
// ---------------------------------------------------------------------------

// Credit THE into a vault. In the full system, this will be restricted to
// BoT / protocol actors, not arbitrary end users.
export function depositToVault(
  vaults: VaultMap,
  id: VaultId,
  amount: Amount,
  currentHeight: number
): VaultState {
  assertPositive(amount, "depositToVault");

  const v = getVaultOrThrow(vaults, id);
  v.balanceTHE += amount;
  v.updatedAtHeight = currentHeight;
  return v;
}

// Debit THE from a vault. For now we enforce:
//   - no overdrafts
//   - caller is responsible for permissioning at a higher layer
export function withdrawFromVault(
  vaults: VaultMap,
  id: VaultId,
  amount: Amount,
  currentHeight: number
): VaultState {
  assertPositive(amount, "withdrawFromVault");

  const v = getVaultOrThrow(vaults, id);
  if (v.balanceTHE < amount) {
    throw new Error(`withdrawFromVault: insufficient vault balance for ${id}`);
  }

  v.balanceTHE -= amount;
  v.updatedAtHeight = currentHeight;
  return v;
}

// ---------------------------------------------------------------------------
// SPLIT INVARIANTS
// ---------------------------------------------------------------------------

// Apply an upward split to all vault balances. This is the hook that ensures
// vault contents stay consistent with §085 / §101 split rules.
//
// For now we simply scale balances by factor. The exact semantics (e.g. which
// quantities scale, which remain base, and how EU face values are tracked)
// will be wired once we walk through §§096 / 096a / 101 together.
export function applySplitToVaults(
  vaults: VaultMap,
  factor: bigint,
  currentHeight: number
): void {
  if (factor <= 0n) {
    throw new Error("applySplitToVaults: factor must be positive");
  }

  for (const v of vaults.values()) {
    v.balanceTHE = v.balanceTHE * factor;
    v.updatedAtHeight = currentHeight;
  }
}
