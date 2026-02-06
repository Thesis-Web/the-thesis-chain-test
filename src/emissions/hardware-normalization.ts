// src/emissions/hardware-normalization.ts
// ---------------------------------------------------------------------------
// Hardware normalization scaffold (specs/HARDWARE_NORMALIZATION.md, 090b).
//
// This file does NOT yet affect consensus. It provides a typed surface for
// modeling the "reverse ASIC curve" and hardware-class weighting. Sims and
// higher-level difficulty policy code can depend on this safely.
//
// Invariants (from specs):
//   • SBC / low-power hardware must be first-class citizens.
//   • No runaway advantage for ASIC-heavy hashpower.
//   • The normalization function should be monotone with respect to watts,
//     but can dampen the marginal advantage of very high-power rigs.
// ---------------------------------------------------------------------------

export type HardwareClass =
  | "SBC"           // single-board computer (Raspberry Pi-class)
  | "DESKTOP"      // typical consumer desktop
  | "GPU_FRIENDLY" // rig where GPU-parallelism dominates
  | "ASIC";        // domain-specific mining rig

export interface HardwareProfile {
  readonly hwClass: HardwareClass;
  readonly watts: number;        // approximate power draw
  readonly hashRateKHps?: number; // optional kilohash/sec estimate
}

// Normalized weight is dimensionless and >= 0.
// Larger values mean "more effective hash contribution" *after* fairness
// normalization. A perfectly neutral system would be 1.0 for all; here we
// bias slightly toward SBC / DESKTOP and dampen ASIC advantage.
export function normalizedHashWeight(profile: HardwareProfile): number {
  const { hwClass, watts } = profile;
  if (!Number.isFinite(watts) || watts <= 0) return 0;

  // Baseline per class (reverse-ASIC intuition).
  let classBase: number;
  switch (hwClass) {
    case "SBC":
      classBase = 1.2; // slightly favored
      break;
    case "DESKTOP":
      classBase = 1.0;
      break;
    case "GPU_FRIENDLY":
      classBase = 0.9;
      break;
    case "ASIC":
      classBase = 0.6; // dampened
      break;
    default:
      classBase = 1.0;
  }

  // Very rough watts scaling: normalize to a "typical desktop" baseline.
  const DESKTOP_BASE_WATTS = 200;
  const wattRatio = Math.max(0.25, Math.min(watts / DESKTOP_BASE_WATTS, 4.0));

  // Apply a sqrt curve so that doubling power does NOT double normalized weight.
  const powerFactor = Math.sqrt(wattRatio);

  // Final normalization weight.
  const raw = classBase * powerFactor;

  // Cap within a sane safety range so nothing explodes in sims.
  return Math.max(0.1, Math.min(raw, 3.0));
}
