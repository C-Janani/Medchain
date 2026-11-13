const crypto = require("crypto");

// New blocks hash the timestamp as an ISO string, so the hash does not depend
// on the server's time zone (important once the app runs on a cloud host).
function calculateHash(index, timestamp, data, previousHash) {
  const ts = new Date(timestamp).toISOString();
  return crypto
    .createHash("sha256")
    .update(`${index}|${ts}|${JSON.stringify(data)}|${previousHash}`)
    .digest("hex");
}

// Blocks created before this change hashed `${timestamp}` directly (a
// time-zone dependent string). They are still accepted so old data verifies.
function calculateLegacyHash(index, timestamp, data, previousHash) {
  return crypto
    .createHash("sha256")
    .update(`${index}|${timestamp}|${JSON.stringify(data)}|${previousHash}`)
    .digest("hex");
}

function hashMatches(block) {
  if (!block) return false;
  return (
    block.hash === calculateHash(block.index, block.timestamp, block.data, block.previousHash) ||
    block.hash === calculateLegacyHash(block.index, block.timestamp, block.data, block.previousHash)
  );
}

function createGenesisBlock() {
  const timestamp = new Date();

  const data = {
    type: "GENESIS",
    message: "RxChain ledger initialized",
  };

  return {
    index: 0,
    timestamp,
    data,
    previousHash: "0",
    hash: calculateHash(0, timestamp, data, "0"),
  };
}

function createNextBlock(data, previousBlock) {
  const index = previousBlock ? previousBlock.index + 1 : 0;
  const previousHash = previousBlock ? previousBlock.hash : "0";
  const timestamp = new Date();

  return {
    index,
    timestamp,
    data,
    previousHash,
    hash: calculateHash(index, timestamp, data, previousHash),
  };
}

function verifyBlock(block, previousBlock) {
  if (!block) return false;

  const expectedPreviousHash = previousBlock
    ? previousBlock.hash
    : "0";

  if (block.previousHash !== expectedPreviousHash) {
    return false;
  }

  return hashMatches(block);
}

module.exports = {
  calculateHash,
  calculateLegacyHash,
  hashMatches,
  createGenesisBlock,
  createNextBlock,
  verifyBlock,
};
