// TARGET: chain src/consensus/apply-block.ts
// src/consensus/apply-block.ts
// ---------------------------------------------------------------------------
// Pack 42.1 + 46.1 + 55 + 56C/57 — applyBlock with FullLedgerStateV1 +
// FullLedgerDeltaV1
// ---------------------------------------------------------------------------
//
// This version of applyBlock is the “bridge” between:
//   • FullLedgerStateV1   — aggregated L1 economic state (chain + EU registry)
//   • FullLedgerDeltaV1   — composed delta view (ledger + vaults + EU + splits)
//
// Current semantics (bootstrap phase):
//   • No real tx execution here yet (TX VM wiring remains at the ledger layer).
//   • No actual ledger or EU mutations are applied; we advance height/hash only.
//   • We expose:
//       – lightweight structural ledger counts via FullLedgerDeltaV1.ledger
//       – empty vault/EU sub-deltas
//       – cumulative SplitEngine summary (if provided)
//       – Back-Wall health signal based on the *next* chain state
//
// This keeps the shape stable for sims and tooling while leaving full TX VM
// + rewards wiring to the consensus + ledger bridge (apply-block-ledger).
// ---------------------------------------------------------------------------

import type { FullLedgerStateV1 } from "../fullstate/state";
import type {
  FullLedgerDeltaV1,
  SplitEventSummary
} from "../fullstate/delta";

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";

import type { Block } from "./types";
import type { BackWallEventSummary } from "../ledger/back-wall";
import { checkBackWall, DEFAULT_BACK_WALL_GUARDS } from "../ledger/back-wall";

import type { SplitEventLog } from "./split-events";

export interface ApplyBlockResult {
  readonly next: FullLedgerStateV1;
  readonly delta: FullLedgerDeltaV1;
}

// ---------------------------------------------------------------------------
// applyBlock
// ---------------------------------------------------------------------------
//
// Input:
//   • state — previous full ledger state (chain + EU registry).
//   • block — synthetic Block (types.ts) used by sims / tooling.
//   • splitEventsLog — optional cumulative SplitEngine log (from consensus).
//
// Output:
//   • next  — the next full ledger state after applying the block header.
//   • delta — a composed FullLedgerDeltaV1 for inspection / logging.
// ---------------------------------------------------------------------------

export function applyBlock(
  state: FullLedgerStateV1,
  block: Block,
  splitEventsLog?: SplitEventLog
): ApplyBlockResult {
  // -------------------------------------------------------------------------
  // 1) Advance chain header fields (height + hash)
  // -------------------------------------------------------------------------
  //
  // For now, we trust the Block provided by the caller and do not repeat
  // consensus-level linkage checks here. Those live in the higher-level
  // consensus engine (`src/consensus/chain.ts`) when driving real blocks.
  //
  // We intentionally:
  //   • bump height to block.height,
  //   • set lastBlockHash to block.hash,
  //   • carry over accounts / vaults / EU registry by cloning Maps.
  // -------------------------------------------------------------------------

  const next: FullLedgerStateV1 = {
    chain: {
      height: block.height,
      lastBlockHash: block.hash,
      accounts: new Map(state.chain.accounts),
      vaults: new Map(state.chain.vaults)
    },
    euRegistry: {
      byId: new Map(state.euRegistry.byId),
      byOwner: new Map(state.euRegistry.byOwner)
    }
  };

  // -------------------------------------------------------------------------
  // 2) Synthesize neutral per-layer deltas
  // -------------------------------------------------------------------------
  //
  // Once TX VM + ledger mutations are wired into this bridge, this section
  // will:
  //   • run txs,
  //   • capture before/after snapshots,
  //   • compute LedgerDelta / VaultDelta / EuRegistryDelta,
  //   • thread in SplitEngine summaries rooted in consensus state.
  //
  // For now we emit empty structural deltas plus:
  //   • splitEvents: snapshot of the cumulative splitEvents log (if provided).
  //   • backWallEvent: derived — simple ledger-local Back-Wall inspection.
  //
  // This is enough for:
  //   • multiblock-sim (Pack 43/48C),
  //   • replay-harness-sim (Pack 46),
  //   • back-wall monitor sims (Pack 48),
  //   • any consumers that just want a stable delta *shape*.
  // -------------------------------------------------------------------------

  const emptyLedgerDelta: LedgerDelta = {
    accounts: new Map(),
    vaults: new Map(),
    euCerts: new Map()
  };

  const emptyVaultDelta: VaultDelta = {
    vaults: new Map()
  };

  const emptyEuDelta: EuRegistryDelta = {
    certs: new Map()
  };

  // -------------------------------------------------------------------------
  // 3) Back-Wall monitoring (read-only)
  // -------------------------------------------------------------------------
  //
  // We run a conservative, ledger-local Back-Wall check against the *next*
  // state. This aggregates:
  //   • totalAccountThe
  //   • totalVaultThe
  //   • totalThe
  //
  // and classifies the block into a BackWallEventKind. This is intentionally
  // monitor-only: it does **not** move funds or enforce BoT policy.
  // -------------------------------------------------------------------------

  const backWallEvent: BackWallEventSummary = checkBackWall(
    next.chain,
    DEFAULT_BACK_WALL_GUARDS
  );

  // -------------------------------------------------------------------------
  // 4) SplitEngine history snapshot (cumulative)
  // ---------------------------------------------------------------------------
  //
  // We allow the caller (typically consensus/chain.ts) to optionally provide
  // the canonical SplitEventLog for the chain at the end of this block. When
  // present, we map it into a list of SplitEventSummary values. When absent,
  // we fall back to an empty list.
  //
  // This keeps applyBlock independent of the internal consensus state shape
  // while still exposing a rich, cumulative view for downstream consumers.
  // -------------------------------------------------------------------------

  const splitEvents: readonly SplitEventSummary[] =
    splitEventsLog && splitEventsLog.length > 0
      ? splitEventsLog.map((evt) => ({
          height: evt.height,
          factor: evt.factor,
          cumulativeFactor: evt.cumulativeFactor,
          euPerThePrice: evt.euPerThePrice,
          reason: evt.reason
        }))
      : [];

  const fullDelta: FullLedgerDeltaV1 = {
    ledger: emptyLedgerDelta,
    vaults: emptyVaultDelta,
    eu: emptyEuDelta,
    splitEvents,
    backWallEvent
  };

  return { next, delta: fullDelta };
}
