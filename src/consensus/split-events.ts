// TARGET: chain src/consensus/split-events.ts
export interface SplitEvent {
  height: number;
  factor: bigint;
  cumulativeFactor: bigint;
  euPerThePrice: number;
  reason: string;
  timestampMs?: number;
}

export type SplitEventLog = readonly SplitEvent[];

export function appendSplitEvent(
  log: SplitEventLog,
  evt: SplitEvent,
  maxEvents = 64
): SplitEventLog {
  const arr = [...log, evt];
  if (arr.length > maxEvents) return arr.slice(arr.length - maxEvents);
  return arr;
}

export function findLastSplitAtOrBeforeHeight(
  log: SplitEventLog,
  height: number
): SplitEvent | undefined {
  let last: SplitEvent | undefined = undefined;
  for (const evt of log) {
    if (evt.height <= height) last = evt;
  }
  return last;
}

export function cumulativeFactorAtHeight(
  log: SplitEventLog,
  height: number
): bigint {
  const evt = findLastSplitAtOrBeforeHeight(log, height);
  return evt ? evt.cumulativeFactor : 1n;
}
