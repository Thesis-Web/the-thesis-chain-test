// TARGET: chain src/fullstate/delta.ts
// src/fullstate/delta.ts
// -----------------------------------------------------------------------------
// Pack 56C + 57 — FullLedgerDeltaV1 view + SplitEngine summary log
// -----------------------------------------------------------------------------
//
// This module defines the **typed delta view** that higher-level sims and tools
// use when inspecting the L1 economic state:
//
//   • ledger  — structural deltas for accounts / vaults / EU certificates
//   • vaults  — vault-focused delta structure
//   • eu      — EuRegistry-focused delta structure
//   • splitEvents — cumulative SplitEngine summary as of this block
//   • backWallEvent — per-block Back-Wall health signal
//
// Notes:
//   • The underlying delta structs (LedgerDelta, VaultDelta, EuRegistryDelta)
//     come from the ledger modules and may evolve over time.
//   • This module stays defensive and only relies on their *shape* in a
//     best-effort fashion when pretty-printing (using `instanceof Map` checks).
//   • All fields are optional so older callers that construct partial deltas
//     remain valid.
// -----------------------------------------------------------------------------

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";

import type { BackWallEventSummary } from "../ledger/back-wall";

// -----------------------------------------------------------------------------
// SplitEventSummary — lightweight view for sims / tools
// -----------------------------------------------------------------------------
//
// This is the "public" representation of SplitEngine events exposed via
// FullLedgerDeltaV1. It mirrors the consensus-level SplitEvent shape but
// avoids pulling in the full engine types.
// -----------------------------------------------------------------------------

export interface SplitEventSummary {
  readonly height: number;
  readonly factor: bigint;
  readonly cumulativeFactor: bigint;
  readonly euPerThePrice: number | null;
  readonly reason: string | null;
}

// -----------------------------------------------------------------------------
// FullLedgerDeltaV1
// -----------------------------------------------------------------------------
//
// All fields are optional / nullable to keep the type forgiving for older
// codepaths and partial producers.
// -----------------------------------------------------------------------------

export interface FullLedgerDeltaV1 {
  // Underlying ledger delta (accounts / vaults / EU certs).
  readonly ledger?: LedgerDelta | null;

  // Vault-centric delta (typically wraps a Map of vault changes).
  readonly vaults?: VaultDelta | null;

  // EuRegistry-centric delta (typically wraps a Map of certificate changes).
  readonly eu?: EuRegistryDelta | null;

  // Cumulative SplitEngine summary as of this block.
  readonly splitEvents?: readonly SplitEventSummary[] | null;

  // Back-Wall health summary (if computed for this block).
  readonly backWallEvent?: BackWallEventSummary | null;
}

// -----------------------------------------------------------------------------
// Pretty-printer used by sims (multiblock, replay harness, fullstate-sim).
// -----------------------------------------------------------------------------
//
// This function is intentionally defensive: it only assumes the presence of
// Maps where they exist today and falls back to zero / "unknown" when fields
// are missing or shapes evolve.
// -----------------------------------------------------------------------------

export function printFullLedgerDeltaV1(delta: FullLedgerDeltaV1): void {
  console.log("=== FullLedgerDeltaV1 ===");

  // 1) Ledger head-counts (accounts / vaults / EU certs).
  const ledgerAny: any = delta.ledger ?? null;
  const accounts =
    ledgerAny && ledgerAny.accounts instanceof Map
      ? ledgerAny.accounts.size
      : 0;
  const vaults =
    ledgerAny && ledgerAny.vaults instanceof Map
      ? ledgerAny.vaults.size
      : 0;
  const euCerts =
    ledgerAny && ledgerAny.euCerts instanceof Map
      ? ledgerAny.euCerts.size
      : 0;

  console.log(
    `  ledger: accounts=${accounts}, vaults=${vaults}, euCerts=${euCerts}`
  );

  // 2) Vault / EU sub-deltas — just length summaries for now.
  const vaultDeltaAny: any = delta.vaults ?? null;
  const vaultDeltaCount =
    vaultDeltaAny && vaultDeltaAny.vaults instanceof Map
      ? vaultDeltaAny.vaults.size
      : 0;
  console.log(`  vaultDelta.vaults=${vaultDeltaCount}`);

  const euDeltaAny: any = delta.eu ?? null;
  const euDeltaCount =
    euDeltaAny && euDeltaAny.certs instanceof Map
      ? euDeltaAny.certs.size
      : 0;
  console.log(`  euDelta.certs=${euDeltaCount}`);

  // 3) SplitEngine log — cumulative summary.
  const events: readonly SplitEventSummary[] = (delta.splitEvents ??
    []) as readonly SplitEventSummary[];

  if (!events.length) {
    console.log("  splitEvents: none");
  } else {
    console.log("  splitEvents (cumulative):");
    for (const ev of events) {
      const h = ev.height ?? "?";

      const factorStr =
        typeof ev.factor === "bigint"
          ? ev.factor.toString()
          : String((ev as any).factor ?? "?");

      const cumulativeStr =
        typeof ev.cumulativeFactor === "bigint"
          ? ev.cumulativeFactor.toString()
          : String((ev as any).cumulativeFactor ?? "?");

      const price =
        typeof ev.euPerThePrice === "number"
          ? ev.euPerThePrice.toFixed(4)
          : String(ev.euPerThePrice ?? "null");

      const reason = ev.reason ?? "unknown";

      console.log(
        `    • h=${h} factor=${factorStr} cumulativeFactor=${cumulativeStr} price=${price} reason=${reason}`
      );
    }
  }

  // 4) Back-Wall health summary (if available).
  const bw: any = delta.backWallEvent ?? null;
  if (!bw) {
    console.log(
      "  backWallEvent: none (no back-wall check performed or no signal)"
    );
  } else {
    const kind = bw.kind ?? "UNKNOWN";
    const height = bw.height ?? "?";
    const totalThe = bw.totalThe ?? "?";
    const totalAccountThe = bw.totalAccountThe ?? "?";
    const totalVaultThe = bw.totalVaultThe ?? "?";

    console.log(
      `  backWallEvent: height=${height}, kind=${kind}, totalThe=${totalThe}, totalAccountThe=${totalAccountThe}, totalVaultThe=${totalVaultThe}`
    );
  }
}
