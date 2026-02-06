export enum TxKind { TRANSFER_THE='TRANSFER_THE', VAULT_CREATE='VAULT_CREATE', VAULT_DEPOSIT='VAULT_DEPOSIT', EU_ACTIVATE='EU_ACTIVATE', EU_REDEEM='EU_REDEEM' }
export interface Tx { kind: TxKind; from: string; to?: string; amountTHE?: bigint; vaultId?: string; certId?: string; nonce: number; }
