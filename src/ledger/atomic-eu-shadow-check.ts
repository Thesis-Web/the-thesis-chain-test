// TARGET: chain src/ledger/atomic-eu-shadow-check.ts
// src/ledger/atomic-eu-shadow-check.ts
// ---------------------------------------------------------------------------
// Pack 54 — EU Atomic Shadow Check Hook (non-invasive)
// ---------------------------------------------------------------------------
//
// Purpose:
//   • Provide a *shadow* EU atomicity check that can be wired into the
//     consensus apply-ledger path without changing consensus validity rules.
//   • Reuse the LedgerEuSnapshot helpers from Packs 52/53 to derive a
//     snapshot from the current full ledger (when available) and assert
//     that all EU amounts respect the configured AtomicCoinPolicy.
//   • Stay completely optional and duck-typed: if the given ledger does
//     not expose the expected EU-aware structure, this helper is a no-op.
//
// This file does NOT:
//   • mutate the ledger;
//   • change tx semantics, vault behaviour, or rewards;
//   • alter block validity rules in consensus.
//
// It is intended for sims, BoT tooling, and internal audits. Enabling the
// shadow check is done via an opts flag in applyLedgerWithRewards; if the
// flag is false or omitted, this helper is never invoked.
// ---------------------------------------------------------------------------

import type { ChainState } from "./state";
import type { EuRegistry } from "./eu";
import type { AtomicCoinPolicy } from "./atomic-coin";
import {
  assertLedgerEuSnapshotAtomic,
  type LedgerEuSnapshot,
} from "./atomic-eu-ledger-enforce";
import { buildEuLedgerSnapshotFromRegistry } from "./atomic-eu-ledger-debug";

// ---------------------------------------------------------------------------
// Structural types
// ---------------------------------------------------------------------------

/**
 * Minimal structural view of a ledger that exposes both the L1 ChainState
 * and the EuRegistry. FullLedgerStateV1 is expected to satisfy this shape,
 * but we keep it duck-typed so that this module does not need to import
 * the fullstate definitions directly.
 */
interface EuAwareLedgerLike {
  readonly chain: ChainState;
  readonly euRegistry: EuRegistry;
}

/**
 * Optional context for logging when running the shadow check.
 */
export interface EuAtomicShadowContext {
  readonly height?: number;
  readonly blockHash?: string | null;
}

/**
 * Narrow an arbitrary value into the EuAwareLedgerLike shape in a
 * conservative, duck-typed way.
 *
 * If the value does not look like a full ledger with ChainState + EuRegistry,
 * we simply return false and the caller can treat the helper as a no-op.
 */
function isEuAwareLedgerLike(value: unknown): value is EuAwareLedgerLike {
  if (!value || typeof value !== "object") return false;

  const anyVal: any = value as any;
  const chain = anyVal.chain;
  const registry = anyVal.euRegistry;

  if (!chain || !registry) return false;
  if (!(chain.vaults instanceof Map)) return false;
  if (!(registry.byId instanceof Map)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a shadow EU atomicity check against the given ledger, if and only if
 * it exposes a ChainState + EuRegistry pair compatible with the existing
 * Pack 52/53 helpers.
 *
 * Behaviour:
 *   • If the ledger is not Eu-aware (no chain/euRegistry), this is a no-op.
 *   • If the snapshot is atomic under the given policy, a single debug
 *     log line is emitted.
 *   • If invariants are violated, a detailed error is logged and the
 *     underlying assertLedgerEuSnapshotAtomic error is re-thrown.
 *
 * This helper is designed to be wired into applyLedgerWithRewards as an
 * optional, non-invasive shadow hook controlled by a boolean flag.
 */
export function runEuAtomicShadowCheck(
  ledger: unknown,
  policy: AtomicCoinPolicy,
  ctx?: EuAtomicShadowContext,
): void {
  if (!isEuAwareLedgerLike(ledger)) {
    // Ledger is not EU-aware in the expected shape; silently skip.
    return;
  }

  const snapshot: LedgerEuSnapshot = buildEuLedgerSnapshotFromRegistry(
    ledger.chain,
    ledger.euRegistry,
  );

  const h = ctx?.height ?? "?";
  const hash = ctx?.blockHash ?? "?";

  try {
    assertLedgerEuSnapshotAtomic(policy, snapshot);
    // Debug log so sims / tools can see that the shadow check is running.
    // This can be made more structured later if needed.
    console.log(
      `[EU-ATOMIC-SHADOW] OK at height=${String(h)} blockHash=${String(
        hash,
      )}`,
    );
  } catch (err) {
    console.error(
      `[EU-ATOMIC-SHADOW] VIOLATION at height=${String(
        h,
      )} blockHash=${String(hash)}`,
    );
    throw err;
  }
}
