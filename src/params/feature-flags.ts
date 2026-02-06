// Pack 14.5 — Feature flags for consensus + split shadow

export interface FeatureFlags {
  readonly powEnforcement: boolean;
  readonly enableSplitShadowMode: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  powEnforcement: true,
  enableSplitShadowMode: true
};
