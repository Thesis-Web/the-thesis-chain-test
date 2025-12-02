// TARGET: chain src/consensus/apply-block.ts
// src/consensus/apply-block.ts
// ---------------------------------------------------------------------------
// Pack 42.1 + 46.1 — applyBlock with FullLedgerStateV1 + FullLedgerDeltaV1
// ---------------------------------------------------------------------------
//
// This version of applyBlock is the final “bridge” between:
//   • FullLedgerStateV1   — aggregated L1 economic state (chain + EU registry)
//   • FullLedgerDeltaV1   — composed delta view (ledger + vaults + EU + splits)
//
// For now, it keeps semantics deliberately minimal:
//   • No real tx execution yet (tx VM wiring is reserved for later packs).
//   • No actual ledger or EU mutations are applied.
//   • It focuses on correct *shape* and invariant-friendly wiring so that
//     higher-level sims (multiblock, replay harness, difficulty-safe, etc.)
//     can exercise the full stack safely.
//
// Later packs can extend the “tx execution” and “delta synthesis” blocks
// without changing the public signature of applyBlock.
// ---------------------------------------------------------------------------

import type { FullLedgerStateV1 } from "../fullstate/state";
import type { FullLedgerDeltaV1 } from "../fullstate/delta";

import type { LedgerDelta } from "../ledger/ledger-delta";
import type { VaultDelta } from "../ledger/vault-delta";
import type { EuRegistryDelta } from "../ledger/eu-registry-delta";

import type { Block } from "./types";
import type { BackWallEventSummary } from "../ledger/back-wall";
import { checkBackWall, DEFAULT_BACK_WALL_GUARDS } from "../ledger/back-wall";

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
//   • block — consensus Block header + tx list.
//
// Output:
//   • next  — the next full ledger state after applying the block.
//   • delta — a composed FullLedgerDeltaV1 for inspection / logging.
//
// In this minimal implementation we only advance the chain height/hash and
// keep economic state neutral (no account / vault / EU changes yet).
// ---------------------------------------------------------------------------

export function applyBlock(
  state: FullLedgerStateV1,
  block: Block
): ApplyBlockResult {
  // -------------------------------------------------------------------------
  // 1) Basic structural / monotonic sanity (non-throwing for now)
  // -------------------------------------------------------------------------
  const expectedHeight = state.chain.height + 1;
  if (block.height !== expectedHeight) {
    // We *could* throw here, but for now we keep the pipeline lenient so
    // sims can experiment freely. Invariant checks are handled in sims.
    // console.warn(
    //   `applyBlock: non-sequential height (prev=${state.chain.height}, block.height=${block.height})`
    // );
  }

  if (block.height > 1 && !block.parentHash) {
    // Again, we log-worthy but non-fatal in this minimal version.
    // console.warn("applyBlock: missing parentHash for non-genesis block");
  }

  // -------------------------------------------------------------------------
  // 2) Construct next FullLedgerStateV1
  // -------------------------------------------------------------------------
  //
  // We clone Maps to keep sims / tooling safe from accidental aliasing.
  // No balances or EU registry entries are changed yet.
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
  // 3) Synthesize a neutral FullLedgerDeltaV1
  // -------------------------------------------------------------------------
  //
  // Once tx VM + ledger mutations are wired, this section will:
  //   • run txs,
  //   • capture before/after snapshots,
  //   • compute LedgerDelta / VaultDelta / EuRegistryDelta,
  //   • thread in SplitEngine summaries.
  //
  // For now we emit empty deltas plus a null splitEvent. This is enough for:
  //   • multiblock-sim (Pack 43/44),
  //   • replay-harness-sim (Pack 46),
  //   • difficulty-safe sims that only care about heights + hashes.
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

  const backWallEvent: BackWallEventSummary = checkBackWall(
    next.chain,
    DEFAULT_BACK_WALL_GUARDS
  );

  const fullDelta: FullLedgerDeltaV1 = {
    ledger: emptyLedgerDelta,
    vaults: emptyVaultDelta,
    eu: emptyEuDelta,
    splitEvent: null,
    backWallEvent
  };

  return { next, delta: fullDelta };
}
