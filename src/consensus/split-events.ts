// TARGET: chain src/consensus/split-events.ts
//
// Split event log primitives for L1. This pack is scaffolding only: it does not
// mutate consensus state or the ledger directly. It provides a canonical
// SplitEvent shape and a ring-buffer-style append helper that other modules
// and sims can use.
//
// NOTE: Split application to ledger and emissions is intentionally kept in sims
// and helper modules for now, to avoid touching canonical chain state until
// the design is fully locked.

import type { SplitFactor } from "../splits/split-policy";

export interface SplitEvent {
  readonly height: number;
  readonly factor: SplitFactor;
  readonly cumulativeFactor: bigint;
  readonly euPerThePrice: number;
  readonly reason: string;
  /** Optional wall-clock timestamp (ms since epoch) for sims / tooling. */
  readonly timestampMs?: number;
}

export type SplitEventLog = readonly SplitEvent[];

/**
 * Append a split event to a bounded in-memory log. Newest events are kept;
 * oldest are dropped once `maxEvents` is exceeded.
 */
export function appendSplitEvent(
  log: SplitEventLog,
  evt: SplitEvent,
  maxEvents: number = 64
): SplitEventLog {
  const next = [...log, evt];
  if (next.length <= maxEvents) return next;
  return next.slice(next.length - maxEvents);
}
