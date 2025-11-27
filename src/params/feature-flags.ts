// TARGET: chain src/params/feature-flags.ts
// Pack 14.4 — Add powEnforcement flag

export interface FeatureFlags {
  readonly powEnforcement: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  powEnforcement: true
};
