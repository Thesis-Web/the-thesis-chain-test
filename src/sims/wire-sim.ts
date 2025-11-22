// src/sims/wire-sim.ts
// ---------------------------------------------------------------------------
// Wire serialization demo for THE
// ---------------------------------------------------------------------------
//
// Builds a sample block with PAYMENT + VAULT txs, runs it through
// encodeBlockToJsonWire / decodeBlockFromJsonWire, and prints both
// sides so we can eyeball that:
//
//   - txType shapes are preserved
//   - Amount fields round-trip as BigInt
//   - Header fields are intact
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";
import type { AnyTx, Block } from "../ledger/block";
import { makeSimpleBlock } from "../ledger/block";
import { encodeBlockToJsonWire, decodeBlockFromJsonWire } from "../serialization/block-wire";

function main(): void {
  console.log("=== WIRE / JSON SERIALIZATION SIM ===\n");

  const ADDR_A = "ADDR_WIRE_A" as Address;
  const ADDR_B = "ADDR_WIRE_B" as Address;
  const MINER = "MINER_WIRE" as Address;

  const paymentAmount = 42n as Amount;
  const vaultAmount = 120n as Amount;

  const txs: AnyTx[] = [
    {
      txType: "PAYMENT",
      from: ADDR_A,
      to: ADDR_B,
      amount: paymentAmount
    },
    {
      txType: "VAULT_CREATE",
      vaultId: "VAULT_WIRE_001",
      owner: ADDR_A
    },
    {
      txType: "VAULT_DEPOSIT",
      vaultId: "VAULT_WIRE_001",
      amount: vaultAmount
    }
  ];

  const block: Block = makeSimpleBlock(1, null, MINER, txs);

  console.log("Original Block:");
  console.dir(block, { depth: null });
  console.log("");

  const bytes = encodeBlockToJsonWire(block);
  console.log("Encoded length (bytes):", bytes.byteLength);
  console.log("Encoded preview (utf8 slice):");
  console.log(Buffer.from(bytes).toString("utf8").slice(0, 200) + "...");
  console.log("");

  const decoded = decodeBlockFromJsonWire(bytes);

  console.log("Decoded Block:");
  console.dir(decoded, { depth: null });
  console.log("");

  console.log("Check types:");
  console.log("  typeof decoded.txs[0].amount:", typeof (decoded.txs[0] as any).amount);
  console.log("  typeof decoded.txs[2].amount:", typeof (decoded.txs[2] as any).amount);

  console.log("\n=== WIRE / JSON SERIALIZATION SIM COMPLETE ===");
}

main();
