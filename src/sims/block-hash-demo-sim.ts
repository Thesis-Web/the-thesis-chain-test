
import { makeBlock, computeBlockHash } from "../consensus/block";

console.log("=== Block Hash Demo (Pack 14.1) ===");

const header = {
  height: 1,
  parentHash: "abc123",
  timestampSec: 1234567890,
  nonce: 42n
};

const body = { txs: [] };

const expected = computeBlockHash(header);
const block = makeBlock(header, body);

console.log("expected hash:", expected);
console.log("block.hash:    ", block.hash);

if (expected === block.hash) {
  console.log("=== OK: canonical header hash enforced ===");
} else {
  console.log("=== ERROR: mismatch ===");
}
