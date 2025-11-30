// TARGET: chain src/ledger/ledger-delta.ts
// src/ledger/ledger-delta.ts
// ---------------------------------------------------------------------------
// Pack 34 — Neutral LedgerSnapshot + LedgerDelta utilities
// ---------------------------------------------------------------------------
//
// This module defines a neutral snapshot + delta format for the L1 ledger.
// It is intentionally decoupled from any concrete in-memory ChainState so
// that it can be used from sims, tools, or future Rust ports.
//
// The pattern is:
//   • Take snapshots (before/after) in a neutral form (LedgerSnapshot).
//   • Compute a LedgerDelta by diffing those snapshots.
//   • Use the delta for logging, invariants, remote sync, etc.
// ---------------------------------------------------------------------------

export interface AccountSnapshot {
  readonly THE: bigint;
  readonly EU: bigint;
  readonly nonce: number;
}

export interface VaultSnapshot {
  readonly THE: bigint;
}

export interface EuCertSnapshot {
  readonly faceEU: bigint;
  readonly status: string;
  readonly activatedAt: number | null;
}

export interface LedgerSnapshot {
  readonly accounts: Map<string, AccountSnapshot>;
  readonly vaults: Map<string, VaultSnapshot>;
  readonly euCerts: Map<string, EuCertSnapshot>;
}

export interface AccountDelta {
  readonly before: AccountSnapshot | null;
  readonly after: AccountSnapshot | null;
}

export interface VaultDelta {
  readonly before: VaultSnapshot | null;
  readonly after: VaultSnapshot | null;
}

export interface EuCertDelta {
  readonly before: EuCertSnapshot | null;
  readonly after: EuCertSnapshot | null;
}

export interface LedgerDelta {
  readonly accounts: Map<string, AccountDelta>;
  readonly vaults: Map<string, VaultDelta>;
  readonly euCerts: Map<string, EuCertDelta>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneAccountSnapshot(a: AccountSnapshot): AccountSnapshot {
  return { THE: a.THE, EU: a.EU, nonce: a.nonce };
}

function cloneVaultSnapshot(v: VaultSnapshot): VaultSnapshot {
  return { THE: v.THE };
}

function cloneEuCertSnapshot(e: EuCertSnapshot): EuCertSnapshot {
  return {
    faceEU: e.faceEU,
    status: e.status,
    activatedAt: e.activatedAt
  };
}

function diffMap<K extends string, S, D>(
  before: Map<K, S>,
  after: Map<K, S>,
  mkDelta: (b: S | null, a: S | null) => D
): Map<K, D> {
  const result = new Map<K, D>();
  const allKeys = new Set<K>();
  for (const k of before.keys()) allKeys.add(k);
  for (const k of after.keys()) allKeys.add(k);

  for (const key of allKeys) {
    const b = before.get(key) ?? null;
    const a = after.get(key) ?? null;
    const delta = mkDelta(b, a);
    result.set(key, delta);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeLedgerDelta(
  before: LedgerSnapshot,
  after: LedgerSnapshot
): LedgerDelta {
  const accounts = diffMap(
    before.accounts,
    after.accounts,
    (b, a): AccountDelta => ({
      before: b ? cloneAccountSnapshot(b) : null,
      after: a ? cloneAccountSnapshot(a) : null
    })
  );

  const vaults = diffMap(
    before.vaults,
    after.vaults,
    (b, a): VaultDelta => ({
      before: b ? cloneVaultSnapshot(b) : null,
      after: a ? cloneVaultSnapshot(a) : null
    })
  );

  const euCerts = diffMap(
    before.euCerts,
    after.euCerts,
    (b, a): EuCertDelta => ({
      before: b ? cloneEuCertSnapshot(b) : null,
      after: a ? cloneEuCertSnapshot(a) : null
    })
  );

  return { accounts, vaults, euCerts };
}

export function printLedgerDelta(delta: LedgerDelta): void {
  // Accounts
  console.log("Accounts delta:");
  if (delta.accounts.size === 0) {
    console.log("  (none)");
  } else {
    for (const [addr, d] of delta.accounts.entries()) {
      const before = d.before
        ? `{THE=${d.before.THE},EU=${d.before.EU},nonce=${d.before.nonce}}`
        : "null";
      const after = d.after
        ? `{THE=${d.after.THE},EU=${d.after.EU},nonce=${d.after.nonce}}`
        : "null";
      console.log(`  addr=${addr} before=${before} after=${after}`);
    }
  }

  // Vaults
  console.log("Vaults delta:");
  if (delta.vaults.size === 0) {
    console.log("  (none)");
  } else {
    for (const [vaultId, d] of delta.vaults.entries()) {
      const before = d.before ? `{THE=${d.before.THE}}` : "null";
      const after = d.after ? `{THE=${d.after.THE}}` : "null";
      console.log(`  vault=${vaultId} before=${before} after=${after}`);
    }
  }

  // EU certificates
  console.log("EU certificates delta:");
  if (delta.euCerts.size === 0) {
    console.log("  (none)");
  } else {
    for (const [id, d] of delta.euCerts.entries()) {
      const b = d.before;
      const a = d.after;
      const fmt = (x: EuCertSnapshot | null) =>
        x
          ? `{faceEU=${x.faceEU},status=${x.status},activatedAt=${x.activatedAt}}`
          : "null";
      console.log(`  cert=${id} before=${fmt(b)} after=${fmt(a)}`);
    }
  }
}
