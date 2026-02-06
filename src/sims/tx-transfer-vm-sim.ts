// src/sims/tx-transfer-vm-sim.ts
// ---------------------------------------------------------------------------
// TRANSFER_THE VM SIM (Pack 17.0)
// ---------------------------------------------------------------------------
//
// Purpose:
//   - Prove that the consensus-side VM for TRANSFER_THE actually moves THE
//     between accounts when the ledger is a FullLedgerStateV1.
//   - Keep the sim self-contained and side-effect free (no network / mining).
//
// This sim:
//   1. Creates an empty FullLedgerStateV1.
//   2. Credits SENDER with an initial balance.
//   3. Applies a single TRANSFER_THE tx via applyBlockTx.
//   4. Prints balances before/after to confirm the movement.
// ---------------------------------------------------------------------------

import type { Address, Amount } from "../types/primitives";
import type { FullLedgerStateV1 } from "../consensus/ledger-state";
import { makeEmptyFullLedgerStateV1 } from "../consensus/ledger-state";
import { creditAccount } from "../ledger/state";
import type { TxTransferTHE } from "../consensus/tx/tx-types";
import { applyBlockTx } from "../consensus/tx/tx-dispatcher";

function getBalance(
  ledger: FullLedgerStateV1,
  addr: Address
): Amount {
  const acct = ledger.chain.accounts.get(addr);
  return acct ? acct.balanceTHE : 0n;
}

function main(): void {
  console.log("=== TRANSFER_THE VM SIM (Pack 17.0) ===");

  const SENDER: Address = "ADDR_TX_A";
  const RECEIVER: Address = "ADDR_TX_B";

  const initialBalance: Amount = 1000n;
  const transferAmount: Amount = 250n;

  // 1) Start from an empty canonical ledger.
  const ledger0: FullLedgerStateV1 = makeEmptyFullLedgerStateV1();

  // 2) Seed the sender with an initial balance.
  creditAccount(ledger0.chain, SENDER, initialBalance);

  console.log("\n--- BEFORE TRANSFER ---");
  console.log("sender   :", SENDER, "balanceTHE =", getBalance(ledger0, SENDER));
  console.log("receiver :", RECEIVER, "balanceTHE =", getBalance(ledger0, RECEIVER));

  // 3) Build a concrete TRANSFER_THE tx.
  const tx: TxTransferTHE = {
    txType: "TRANSFER_THE",
    from: SENDER,
    to: RECEIVER,
    amountTHE: transferAmount
  };

  // 4) Apply it through the consensus VM dispatcher.
  const ledger1 = applyBlockTx(ledger0, tx);

  console.log("\n--- AFTER TRANSFER ---");
  console.log("sender   :", SENDER, "balanceTHE =", getBalance(ledger1, SENDER));
  console.log("receiver :", RECEIVER, "balanceTHE =", getBalance(ledger1, RECEIVER));

  console.log("\n=== TRANSFER_THE VM SIM COMPLETE ===");
}

main();
