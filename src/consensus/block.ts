// src/consensus/block.ts

import { createHash } from "crypto";

export type Hash = string;

export interface BlockHeader {
  readonly height: number;
  readonly parentHash: Hash | null;
  readonly timestampSec: number;
  readonly nonce: bigint;
}

export interface BlockBody {
  readonly txs: readonly unknown[];
}

export interface Block {
  readonly header: BlockHeader;
  readonly body: BlockBody;
  readonly hash: Hash;
}

export function computeBlockHash(header: BlockHeader): Hash {
  const payload = JSON.stringify({
    height: header.height,
    parentHash: header.parentHash,
    timestampSec: header.timestampSec,
    nonce: header.nonce.toString()
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function makeBlock(header: BlockHeader, body: BlockBody): Block {
  return {
    header,
    body,
    hash: computeBlockHash(header)
  };
}
