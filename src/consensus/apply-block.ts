// src/consensus/apply-block.ts
// ---------------------------------------------------------------------------
// applyBlock — canonical L1 economic bridge (Unified Ledger)
// ---------------------------------------------------------------------------
//
// Consensus drives:
//   - FullLedgerStateV1 (authoritative state)
//   - FullLedgerDeltaV1 (typed delta/logging view)
//
// Current Bootstrapping Phase:
//   • No full TX VM yet — only chain height/hash + structural snapshot
//   • Neutral deltas for accounts / vaults / EU certs
//   • Cumulative SplitEngine histories provided externally (optional)
//   • Back-Wall check is purely observational
// ---------------------------------------------------------------------------

import type { FullLedgerStateV1 } from "./ledger-state";
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

// ---------------------------------------------------------------------------
// applyBlock
// ---------------------------------------------------------------------------

export interface ApplyBlockResult {
  readonly next: FullLedgerStateV1;
  readonly delta: FullLedgerDeltaV1;
}

export function applyBlock(
  state: FullLedgerStateV1,
  block: Block,
  splitEventsLog?: SplitEventLog
): ApplyBlockResult {
  // Advance chain height/hash, clone underlying data
  const next: FullLedgerStateV1 = {
    chain: {
      height: block.height,
      lastBlockHash: block.hash,
      accounts: new Map(state.chain.accounts),
      vaults: new Map(state.chain.vaults),
    },
    euCertRegistry: {
      byId: new Map(state.euCertRegistry.byId),
      byOwner: new Map(state.euCertRegistry.byOwner),
    }
  };

  // Neutral deltas (no TX VM yet)
  const emptyLedgerDelta: LedgerDelta = {
    accounts: new Map(),
    vaults: new Map(),
    euCerts: new Map(),
  };

  const emptyVaultDelta: VaultDelta = {
    vaults: new Map()
  };

  const emptyEuDelta: EuRegistryDelta = {
    certs: new Map()
  };

  // Back-Wall inspection
  const backWallEvent: BackWallEventSummary = checkBackWall(
    next.chain,
    DEFAULT_BACK_WALL_GUARDS
  );

  // SplitEngine mapping (cumulative)
  const splitEvents: readonly SplitEventSummary[] =
    splitEventsLog && splitEventsLog.length > 0
      ? splitEventsLog.map(ev => ({
          height: ev.height,
          factor: ev.factor,
          cumulativeFactor: ev.cumulativeFactor,
          euPerThePrice: ev.euPerThePrice,
          reason: ev.reason
        }))
      : [];

  const fullDelta: FullLedgerDeltaV1 = {
    ledger: emptyLedgerDelta,
    vaults: emptyVaultDelta,
    eu: emptyEuDelta,
    splitEvents,
    backWallEvent,
  };

  return { next, delta: fullDelta };
}
