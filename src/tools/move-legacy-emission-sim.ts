// src/tools/move-legacy-emission-sim.ts
// ---------------------------------------------------------------------------
// Helper script to move the legacy emission-sim.ts into src/sims/legacy/.
// Run once with:
//   npx ts-node src/tools/move-legacy-emission-sim.ts
// ---------------------------------------------------------------------------

import { promises as fs } from "fs";
import * as path from "path";

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const legacyDir = path.join(repoRoot, "src", "sims", "legacy");
  const oldPath = path.join(repoRoot, "src", "sims", "emission-sim.ts");
  const newPath = path.join(legacyDir, "emission-sim.ts");

  await fs.mkdir(legacyDir, { recursive: true });

  try {
    await fs.stat(oldPath);
  } catch {
    console.error("❌ No emission-sim.ts found at", oldPath);
    process.exit(1);
  }

  await fs.rename(oldPath, newPath);
  console.log("✅ Moved emission-sim.ts →", path.relative(repoRoot, newPath));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
