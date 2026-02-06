// Synthetic delta sim

import { createEmptyLedgerDelta, recordAccountChange, recordVaultChange, recordEuCertChange } from "../ledger/ledger-delta";

console.log("=== LEDGER DELTA SIM (synthetic) ===");

const delta = createEmptyLedgerDelta();

recordAccountChange(delta, "addr1",
  { balanceTHE: 100n, balanceEU: 0n, nonce: 0 },
  { balanceTHE: 90n, balanceEU: 0n, nonce: 1 });

recordAccountChange(delta, "addr2",
  { balanceTHE: 50n, balanceEU: 10n, nonce: 1 },
  null);

recordAccountChange(delta, "addr3",
  null,
  { balanceTHE: 10n, balanceEU: 0n, nonce: 0 });

recordEuCertChange(delta, "cert1",
  { faceEU: 1000n, status: "PENDING", activatedAt: null } as any,
  { faceEU: 1000n, status: "ACTIVE", activatedAt: 1700000000 } as any);

recordEuCertChange(delta, "cert2",
  null,
  { faceEU: 500n, status: "ACTIVE", activatedAt: 1700000100 } as any);

console.log(delta);

console.log("=== LEDGER DELTA SIM COMPLETE ===");
