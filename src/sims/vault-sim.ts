import type { VaultMap } from "../vault/types.js";
import { createVault, depositToVault, withdrawFromVault, applySplitToVaults } from "../vault/vault.js";
import type { Address } from "../types/primitives.js";

export function runVaultSim(): void {
  console.log("\n=== VAULT SIM ===\n");

  const vaults: VaultMap = new Map();
  const bot: Address = "BOT_TREASURY";

  const height0 = 0;
  const vaultId = "VAULT_001";

  createVault(vaults, vaultId, bot, height0);
  console.log("After create:", vaults.get(vaultId));

  depositToVault(vaults, vaultId, 1_000n, 1);
  console.log("After deposit 1000 THE:", vaults.get(vaultId));

  withdrawFromVault(vaults, vaultId, 250n, 2);
  console.log("After withdraw 250 THE:", vaults.get(vaultId));

  applySplitToVaults(vaults, 2n, 3);
  console.log("After 2x split:", vaults.get(vaultId));
}

if (process.argv[1]?.endsWith("vault-sim.ts")) {
  runVaultSim();
}
