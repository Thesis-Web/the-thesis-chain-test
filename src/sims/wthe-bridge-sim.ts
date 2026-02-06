import { initWTheBridgeState, lockTheForWThe, recordMintOnL2, recordBurnOnL2 } from "../ledger/wthe-bridge";

export function runWTheBridgeSim() {
  let state = initWTheBridgeState();

  const locks = [
    { l1OwnerAddress: "ADDR_A", l2Address:"L2_ADDR_A", amountThe:1000n },
    { l1OwnerAddress: "ADDR_A", l2Address:"L2_ADDR_A", amountThe:500n },
    { l1OwnerAddress: "ADDR_B", l2Address:"L2_ADDR_B", amountThe:2000n }
  ];

  for (const step of locks) {
    state = lockTheForWThe(state, step);
  }

  state = recordMintOnL2(state, { l1OwnerAddress:"ADDR_A", amountWThe:600n });
  state = recordBurnOnL2(state, { l1OwnerAddress:"ADDR_A", amountWThe:100n });

  console.log("=== FINAL BRIDGE STATE ===");
  for (const [owner, acc] of state.accounts) {
    console.log("Account", owner, acc);
  }
}

if (require.main === module) runWTheBridgeSim();
