// reward-applier.ts (Fixed Pack 8)

import type { EmissionBreakdown } from "../emissions/model";

export interface RewardApplication {
  minerTHE: number;
  nipTHE: number;
}

/**
 * Placeholder reward application logic.
 * Ledger is returned unchanged for now.
 */
export function applyRewards<LState>(
  ledger: LState,
  emission: EmissionBreakdown
): { ledger: LState; reward: RewardApplication } {
  return {
    ledger,
    reward: {
      minerTHE: Number(emission.minerRewardTHE),
      nipTHE: Number(emission.nipRewardTHE)
    }
  };
}
