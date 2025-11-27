// TARGET: chain src/params/registry-access.ts
// src/params/registry-access.ts
// ---------------------------------------------------------------------------
// Registry access helpers (v0)
// ---------------------------------------------------------------------------
// This module provides small, typed helpers around the parameter registry
// defined in src/params/registry.ts. It is designed so that consensus code and
// sims can share a common way to obtain emission, difficulty, and split
// parameters without importing the full registry directly everywhere.
// ---------------------------------------------------------------------------

import {
  EMISSION_PARAMS_V1,
  type EmissionParams,
  DIFFICULTY_PARAMS_V1,
  type DifficultyParams
} from "./registry";
import {
  DEFAULT_SPLIT_POLICY,
  type SplitPolicyParams
} from "../splits/split-policy";

export function getEmissionParams(): EmissionParams {
  return EMISSION_PARAMS_V1;
}

export function getDifficultyParams(): DifficultyParams {
  return DIFFICULTY_PARAMS_V1;
}

// Splits are currently parameterized via DEFAULT_SPLIT_POLICY rather than a
// dedicated on-chain registry entry. This helper centralizes the access so we
// can swap in a registry-backed implementation later without touching callers.
export function getSplitPolicyParams(): SplitPolicyParams {
  return DEFAULT_SPLIT_POLICY;
}
