export interface WTheBridgeAccount {
  l1OwnerAddress: string;
  l2Address: string;
  lockedThe: bigint;
  mintedWThe: bigint;
}

export interface WTheBridgeState {
  accounts: Map<string, WTheBridgeAccount>;
}

export function initWTheBridgeState(): WTheBridgeState {
  return { accounts: new Map() };
}

export interface LockTheForWTheInput {
  l1OwnerAddress: string;
  l2Address: string;
  amountThe: bigint;
}

export function lockTheForWThe(
  prev: WTheBridgeState,
  input: LockTheForWTheInput
): WTheBridgeState {
  if (input.amountThe <= 0n) throw new Error("invalid amount");
  const next = { accounts: new Map(prev.accounts) };
  const acc = next.accounts.get(input.l1OwnerAddress) ?? {
    l1OwnerAddress: input.l1OwnerAddress,
    l2Address: input.l2Address,
    lockedThe: 0n,
    mintedWThe: 0n
  };
  acc.lockedThe += input.amountThe;
  next.accounts.set(input.l1OwnerAddress, acc);
  return next;
}

export interface RecordMintOnL2Input {
  l1OwnerAddress: string;
  amountWThe: bigint;
}

export function recordMintOnL2(
  prev: WTheBridgeState,
  input: RecordMintOnL2Input
): WTheBridgeState {
  const next = { accounts: new Map(prev.accounts) };
  const acc = next.accounts.get(input.l1OwnerAddress);
  if (!acc) throw new Error("unknown account");
  const newMint = acc.mintedWThe + input.amountWThe;
  if (newMint > acc.lockedThe) throw new Error("mint exceeds locked");
  acc.mintedWThe = newMint;
  next.accounts.set(input.l1OwnerAddress, acc);
  return next;
}

export interface RecordBurnOnL2Input {
  l1OwnerAddress: string;
  amountWThe: bigint;
}

export function recordBurnOnL2(
  prev: WTheBridgeState,
  input: RecordBurnOnL2Input
): WTheBridgeState {
  const next = { accounts: new Map(prev.accounts) };
  const acc = next.accounts.get(input.l1OwnerAddress);
  if (!acc) throw new Error("unknown account");
  const newMint = acc.mintedWThe - input.amountWThe;
  if (newMint < 0n) throw new Error("burn exceeds minted");
  acc.mintedWThe = newMint;
  next.accounts.set(input.l1OwnerAddress, acc);
  return next;
}
