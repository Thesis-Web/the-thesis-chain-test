// TARGET: chain src/params/feature-flags.ts
// src/params/feature-flags.ts
// ---------------------------------------------------------------------------
// Feature flags (v0)
//
// This module centralizes boolean / enum flags that control activation of
// non-fundamental behavior such as split processing in consensus, experimental
// sims, etc. In this initial version, all flags are hard-coded. In later
// phases, they may be driven by config files, environment, or on-chain
// governance decisions.
// ---------------------------------------------------------------------------

export interface FeatureFlags {
  // When false, split decisions are never applied to balances / supply in
  // consensus code. Sims may still use the split engine freely.
  enableConsensusSplits: boolean;

  // When true, consensus code (or sims that want to mimic it) may log or
  // collect "shadow mode" split decisions (what WOULD have happened at a given
  // height) without mutating state.
  enableSplitShadowMode: boolean;
}

// Default flags for dev / alpha networks.
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableConsensusSplits: false,
  enableSplitShadowMode: true
};
