// TARGET: chain src/consensus/tx/tx-types.ts

// Pack 15.0 — THE-specific transaction types (skeleton)
export type TxTransferTHE = {
  txType: "TRANSFER_THE",
  from: string,
  to: string,
  amount: bigint
};

export type TxMintEU = {
  txType: "MINT_EU",
  owner: string,
  euId: string,
  backingVaultId: string
};

export type TxRedeemEU = {
  txType: "REDEEM_EU",
  euId: string
};

export type TxSplitAward = {
  txType: "SPLIT_AWARD",
  factor: bigint
};

export type TxInternalReward = {
  txType: "INTERNAL_REWARD",
  miner: string,
  amountTHE: bigint
};

export type TheTx =
  | TxTransferTHE
  | TxMintEU
  | TxRedeemEU
  | TxSplitAward
  | TxInternalReward;
