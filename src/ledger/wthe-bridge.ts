// TARGET: chain src/ledger/wthe-bridge.ts
//
// Scaffold for THE <-> wTHE bridge accounting. This is *not* wired into L1
// consensus yet; Pack 25 only defines types and pure helpers so we can reason
// about flows and invariants in sims before touching canonical state.
//
// The picture:
//
//   L1 THE  <-->  Bridge Escrow  <-->  L2 / fast-rail wTHE
//
// - L1 only ever sees locked THE balances and accounting for how much wTHE
//   was minted/burned against each escrowed position.
// - Actual L2 state, slippage, and routing live off-chain or on a separate
//   fast rail; L1 only cares about conservation of THE and peg safety.

export interface WTheBridgeAccount {
  /** L1 address that owns the locked THE. */
  readonly l1OwnerAddress: string;
  /** L2 or fast-rail address that receives wTHE. */
  readonly l2Address: string;
  /** Total THE locked in escrow on L1 for this lane. */
  readonly lockedThe: bigint;
  /** Total wTHE minted against this escrow (should never exceed lockedThe). */
  readonly mintedWThe: bigint;
}

export interface WTheBridgeState {
  readonly accounts: Map<string, WTheBridgeAccount>;
}

/**
 * Create an empty bridge state.
 */
export function initWTheBridgeState(): WTheBridgeState {
  return {
    accounts: new Map()
  };
}

export interface LockTheForWTheInput {
  readonly l1OwnerAddress: string;
  readonly l2Address: string;
  readonly amountThe: bigint;
}

export interface MintWTheResult {
  readonly state: WTheBridgeState;
  readonly account: WTheBridgeAccount;
}

/**
 * Lock THE on L1 and "mint" wTHE in the accounting view. In real life, the
 * minting happens on L2 / fast rail; here we only track the invariant:
 *
 *   0 <= mintedWThe <= lockedThe
 */
export function lockTheForWThe(
  prev: WTheBridgeState,
  input: LockTheForWTheInput
): MintWTheResult {
  if (input.amountThe <= 0n) {
    throw new Error("amountThe must be positive");
  }

  const key = input.l1OwnerAddress;
  const existing = prev.accounts.get(key);

  const lockedThe = (existing?.lockedThe ?? 0n) + input.amountThe;
  const mintedWThe = existing?.mintedWThe ?? 0n; // L2 mint tracked separately

  const account: WTheBridgeAccount = {
    l1OwnerAddress: input.l1OwnerAddress,
    l2Address: input.l2Address,
    lockedThe,
    mintedWThe
  };

  const nextAccounts = new Map(prev.accounts);
  nextAccounts.set(key, account);

  return {
    state: { accounts: nextAccounts },
    account
  };
}
