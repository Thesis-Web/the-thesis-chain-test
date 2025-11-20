import type { Address, Amount } from "../types/primitives.js";
import type { VaultId, VaultState, VaultMap, VaultKind } from "./types.js";

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

// Generic vault constructor. Used by the helpers below. Caller is responsible
// for choosing the right kind and metadata; oracle logic lives elsewhere.
export function createVault(
  vaults: VaultMap,
  id: VaultId,
  owner: Address,
  currentHeight: number,
  kind: VaultKind = "GENERIC",
  euFaceValueEU?: bigint,
  wrappedSupplyTHE?: Amount
): VaultState {
  if (vaults.has(id)) {
    throw new Error(`Vault already exists: ${id}`);
  }

  const v: VaultState = {
    id,
    owner,
    kind,
    balanceTHE: 0n,
    euFaceValueEU,
    wrappedSupplyTHE,
    createdAtHeight: currentHeight,
    updatedAtHeight: currentHeight
  };

  vaults.set(id, v);
  return v;
}

// EU Certificate vault: backing a physical/digital EU note.
// `faceEU` is the EU face value; the caller must have already converted this
// into a concrete THE deposit using the oracle.
export function createEuCertVault(
  vaults: VaultMap,
  id: VaultId,
  owner: Address,
  faceEU: bigint,
  currentHeight: number
): VaultState {
  return createVault(vaults, id, owner, currentHeight, "EU_CERT", faceEU, undefined);
}

// wTHE backing vault: backing a given amount of wrapped THE for a specific
// owner. The caller is responsible for keeping wrappedSupplyTHE in sync with
// the fast-rail module.
export function createWtheBackingVault(
  vaults: VaultMap,
  id: VaultId,
  owner: Address,
  wrappedSupplyTHE: Amount,
  currentHeight: number
): VaultState {
  return createVault(
    vaults,
    id,
    owner,
    currentHeight,
    "WTHE_BACKING",
    undefined,
    wrappedSupplyTHE
  );
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

// Apply an upward split to all vault balances. This is the generic hook that
// ensures vault contents stay consistent with §085 / §101 split rules.
//
// NOTE: wTHE-specific behavior (where surplus goes to the owner) will be
// implemented at the ChainState layer, where we also have access to accounts.
// For now, this function just scales balances.
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
