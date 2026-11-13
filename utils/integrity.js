/* ==========================================================================
   integrity.js - verify the whole ledger and cross-check it against the
   prescription records in the database. Pure functions (arrays in, report out).

   Issue codes:
     BAD_HASH         block content no longer matches its stored hash
     BROKEN_LINK      block's previousHash does not match the block before it
     INDEX_GAP        block numbers are missing or duplicated
     BAD_GENESIS      first block is not a valid genesis block
     RECORD_MODIFIED  a prescription record differs from what was sealed on chain
     HASH_MISMATCH    prescription points at a block hash that is not on the chain
     MISSING_BLOCK    prescription points at a block that does not exist
     ORPHAN_BLOCK     chain holds a prescription block with no matching record (record deleted)
     UNSEALED         prescription has no block at all
   ========================================================================== */

const { hashMatches } = require("./blockchain");

const norm = (v) => String(v == null ? "" : v).trim();

function medicinesKey(list) {
  return JSON.stringify(
    (list || []).map((m) => ({
      name: norm(m.name),
      dosage: norm(m.dosage),
      duration: norm(m.duration),
      frequency: norm(m.frequency),
    }))
  );
}

function verifyChain(blocks) {
  const issues = [];
  const sorted = (blocks || []).slice().sort((a, b) => a.index - b.index);

  sorted.forEach((block, position) => {
    const prev = position > 0 ? sorted[position - 1] : null;

    if (block.index !== position) {
      issues.push({
        code: "INDEX_GAP",
        severity: "high",
        blockIndex: block.index,
        message: `Expected block #${position} but found block #${block.index}. A block is missing or duplicated.`,
      });
    }

    if (!prev) {
      if (block.previousHash !== "0") {
        issues.push({
          code: "BAD_GENESIS",
          severity: "high",
          blockIndex: block.index,
          message: "The first block does not have the genesis previous-hash.",
        });
      }
    } else if (block.previousHash !== prev.hash) {
      issues.push({
        code: "BROKEN_LINK",
        severity: "high",
        blockIndex: block.index,
        message: `Block #${block.index} does not link to the hash of block #${prev.index}. The chain was altered.`,
      });
    }

    if (!hashMatches(block)) {
      issues.push({
        code: "BAD_HASH",
        severity: "high",
        blockIndex: block.index,
        message: `Block #${block.index} content does not match its stored hash. The sealed data was modified.`,
      });
    }
  });

  return { blocksChecked: sorted.length, issues };
}

// prescriptions must be populated: patient.registrationId, doctor.registrationId
function crossCheck(blocks, prescriptions) {
  const issues = [];
  const byIndex = new Map((blocks || []).map((b) => [b.index, b]));
  const sealedIds = new Set();

  for (const rx of prescriptions || []) {
    const idx = rx.blockchain && rx.blockchain.blockIndex;
    if (idx === undefined || idx === null) {
      issues.push({
        code: "UNSEALED",
        severity: "medium",
        prescriptionId: rx.prescriptionId,
        message: `${rx.prescriptionId} has no ledger block.`,
      });
      continue;
    }

    const block = byIndex.get(idx);
    if (!block) {
      issues.push({
        code: "MISSING_BLOCK",
        severity: "high",
        prescriptionId: rx.prescriptionId,
        blockIndex: idx,
        message: `${rx.prescriptionId} points to block #${idx}, which is not on the chain.`,
      });
      continue;
    }
    sealedIds.add(rx.prescriptionId);

    if (rx.blockchain.blockHash && rx.blockchain.blockHash !== block.hash) {
      issues.push({
        code: "HASH_MISMATCH",
        severity: "high",
        prescriptionId: rx.prescriptionId,
        blockIndex: idx,
        message: `${rx.prescriptionId} stores a hash that differs from block #${idx}.`,
      });
    }

    const sealed = block.data || {};
    const patientId = rx.patient && rx.patient.registrationId;
    const doctorId = rx.doctor && rx.doctor.registrationId;
    const changed = [];

    if (norm(sealed.prescriptionId) !== norm(rx.prescriptionId)) changed.push("prescription ID");
    if (patientId !== undefined && norm(sealed.patientId) !== norm(patientId)) changed.push("patient");
    if (doctorId !== undefined && norm(sealed.doctorId) !== norm(doctorId)) changed.push("doctor");
    if (norm(sealed.diagnosis) !== norm(rx.diagnosis)) changed.push("diagnosis");
    if (medicinesKey(sealed.medicines) !== medicinesKey(rx.medicines)) changed.push("medicines or dosage");

    if (changed.length) {
      issues.push({
        code: "RECORD_MODIFIED",
        severity: "high",
        prescriptionId: rx.prescriptionId,
        blockIndex: idx,
        message: `${rx.prescriptionId} was changed after it was sealed on chain (${changed.join(", ")}).`,
      });
    }
  }

  for (const block of blocks || []) {
    const d = block.data;
    if (d && d.type === "PRESCRIPTION" && d.prescriptionId && !sealedIds.has(d.prescriptionId)) {
      issues.push({
        code: "ORPHAN_BLOCK",
        severity: "high",
        prescriptionId: d.prescriptionId,
        blockIndex: block.index,
        message: `Block #${block.index} holds ${d.prescriptionId}, but that prescription record is missing from the database.`,
      });
    }
  }

  return { prescriptionsChecked: (prescriptions || []).length, issues };
}

function verifyLedger(blocks, prescriptions) {
  const chain = verifyChain(blocks);
  const records = crossCheck(blocks, prescriptions);
  const issues = [...chain.issues, ...records.issues];
  return {
    status: issues.some((i) => i.severity === "high") ? "compromised" : issues.length ? "warning" : "intact",
    blocksChecked: chain.blocksChecked,
    prescriptionsChecked: records.prescriptionsChecked,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = { verifyChain, crossCheck, verifyLedger };
