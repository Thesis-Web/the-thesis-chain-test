// TARGET: chain src/fullstate/state.ts
// src/fullstate/state.ts
// ---------------------------------------------------------------------------
// Fullstate façade — re-export canonical FullLedgerStateV1 + helpers
// ---------------------------------------------------------------------------
//
// This module exists to give sims / tooling a stable import path while keeping
// the *authoritative* definition of FullLedgerStateV1 in
// src/consensus/ledger-state.ts.
//
// It simply re-exports the type + helpers and provides a small convenience
// alias for the "createEmpty..." constructor name used in earlier packs.
// ---------------------------------------------------------------------------

import type { FullLedgerStateV1 } from "../consensus/ledger-state";
import {
  makeEmptyFullLedgerStateV1,
  cloneFullLedgerStateV1
} from "../consensus/ledger-state";

export type { FullLedgerStateV1 } from "../consensus/ledger-state";

/**
 * Canonical constructor (preferred name).
 */
export { makeEmptyFullLedgerStateV1, cloneFullLedgerStateV1 };

/**
 * Backwards-compatible alias used by older sims.
 *
 * Internally delegates to makeEmptyFullLedgerStateV1 so that there is a
 * single source of truth for genesis construction.
 */
export function createEmptyFullLedgerStateV1(): FullLedgerStateV1 {
  return makeEmptyFullLedgerStateV1();
}
