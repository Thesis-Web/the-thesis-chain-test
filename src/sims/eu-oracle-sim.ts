/**
 * Sim-only EU oracle for THE ↔ EU dynamics.
 *
 * Canonical orientation: EU/THE = "EU per 1 THE".
 * This is a synthetic path consistent with §071, using a smooth
 * appreciation curve for THE against a relatively stable EU index.
 */

export interface EuOracleSnapshot {
  readonly height: number;
  readonly euDimensionless: number;
  readonly euPerThe: number;
  readonly source: "SIM";
}

// From docs/sections/071-oracles.md example snapshot.
const EU_DIMENSIONLESS_T0 = 1.6706353;

/**
 * Sim-only EU/THE path.
 *
 * We start at 1 EU per THE at height 0 and smoothly approach ~3 EU per THE
 * over ~10k blocks. This keeps numbers in the same ballpark as earlier
 * dev-split sims while matching the EU/THE orientation.
 */
export function euPerThePriceAtHeight(height: number): number {
  if (height <= 0) return 1.0;

  const t = height / 10_000;
  const base = 1.0;
  const target = 3.0;
  const k = 3.0;

  return base + (target - base) * (1 - Math.exp(-k * t));
}

/**
 * Lightweight snapshot view for sims that want both the raw EU index
 * and the EU/THE display ratio.
 */
export function oracleSnapshotAtHeight(height: number): EuOracleSnapshot {
  const euPerThe = euPerThePriceAtHeight(height);
  return {
    height,
    euDimensionless: EU_DIMENSIONLESS_T0,
    euPerThe,
    source: "SIM"
  };
}
