import { createGenesisParamRegistry, proposeParamUpdate, approveProposal, tickGovernance } from "../params/registry.js";
import type { Address } from "../types/primitives.js";

export function runParamSim(): void {
  console.log("\n=== PARAM REGISTRY SIM ===\n");

  const height0 = 0;
  const reg = createGenesisParamRegistry(height0);

  const gov1: Address = "GOV_1";
  const gov2: Address = "GOV_2";

  // Propose changing MAX_MINER_REWARD_THE from 10 → 8
  const proposal = proposeParamUpdate(reg, {
    key: "MAX_MINER_REWARD_THE",
    newValue: 8n,
    creator: gov1,
    currentHeight: 1,
    timelockBlocks: 2,
    expiryBlocks: 100,
    requiredApprovals: 2
  });

  console.log("Created proposal:", proposal.id);

  // Approvals
  approveProposal(reg, proposal.id, gov1);
  approveProposal(reg, proposal.id, gov2);

  // Tick before timelock
  tickGovernance(reg, { currentHeight: 2 });
  console.log("After height 2, status:", reg.proposals.get(proposal.id)?.status);

  // Tick after timelock
  tickGovernance(reg, { currentHeight: 4 });
  console.log("After height 4, status:", reg.proposals.get(proposal.id)?.status);

  console.log("History:", reg.history);
}

// auto-run when executed directly
if (process.argv[1]?.endsWith("param-sim.ts")) {
  runParamSim();
}
