// TARGET: chain src/sims/wthe-bridge-sim.ts
//
// Simple sim around the wTHE bridge scaffold. This is purely a ledger-side
// accounting toy: it demonstrates how L1 would track locked THE for wTHE
// issuance without caring about the full L2 rail implementation.

import {
  initWTheBridgeState,
  lockTheForWThe,
  WTheBridgeState
} from "../ledger/wthe-bridge";

export function runWTheBridgeSim(): void {
  console.log("=== WTHE BRIDGE SIM (Pack 25 scaffolding) ===");

  let state: WTheBridgeState = initWTheBridgeState();

  const steps = [
    { l1OwnerAddress: "ADDR_A", l2Address: "L2_ADDR_A", amountThe: 1_000n },
    { l1OwnerAddress: "ADDR_A", l2Address: "L2_ADDR_A", amountThe: 500n },
    { l1OwnerAddress: "ADDR_B", l2Address: "L2_ADDR_B", amountThe: 2_000n }
  ];

  for (const s of steps) {
    const { state: next, account } = lockTheForWThe(state, s);
    state = next;
    console.log("Locked THE for:", s.l1OwnerAddress, "->", s.l2Address);
    console.log("  lockedThe:", account.lockedThe.toString());
    console.log("  mintedWThe (accounting view):", account.mintedWThe.toString());
  }

  console.log("=== FINAL BRIDGE STATE ===");
  for (const [key, account] of state.accounts.entries()) {
    console.log("Account", key, {
      lockedThe: account.lockedThe.toString(),
      mintedWThe: account.mintedWThe.toString(),
      l2Address: account.l2Address
    });
  }

  console.log("=== WTHE BRIDGE SIM COMPLETE ===");
}

if (require.main === module) {
  runWTheBridgeSim();
}
