// TARGET: chain src/sims/consensus-skeleton-sim.ts
// consensus-skeleton-sim.ts (Fixed Pack 8)

import { initChainState } from "../consensus/state";
import { makeConsensusEnv, applyBlock } from "../consensus/chain";
import { computeBlockHash } from "../consensus/block";

interface DummyLedger { note: string; }

function makeBlock(height: number, parentHash: string | null) {
  const header = {
    height,
    parentHash,
    timestampSec: Math.floor(Date.now() / 1000) + height,
    nonce: BigInt(height * 123456)
  };
  const hash = computeBlockHash(header);
  return {
    header,
    body: { txs: [] },
    hash
  };
}

const ledger0: DummyLedger = { note: "initial" };
let state = initChainState(ledger0);
const env = makeConsensusEnv();

for (let i = 0; i < 5; i++) {
  const block = makeBlock(i, state.tipHash);
  const res = applyBlock(env, state, block, {});
  console.log(
    "HEIGHT", i,
    "minerRewardTHE", res.emission.minerRewardTHE,
    "splitCF", res.splitShadowInfo.cumulativeFactor
  );
  state = res.nextState;
}
