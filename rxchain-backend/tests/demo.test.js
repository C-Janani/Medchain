// Offline tests for the public demo dataset (no MongoDB, no network).
const assert = require("assert");
const demo = require("../utils/demoData");
const { verifyLedger } = require("../utils/integrity");
const { verifyBlock } = require("../utils/blockchain");
const { computeFraud } = require("../utils/fraud");

(async () => {
  const { blocks, prescriptions } = await demo.build();
  const rows = prescriptions.map((p) => demo.shape(p));

  // 1. chain is intact and every record cross-checks
  const ok = verifyLedger(blocks, rows);
  assert.strictEqual(ok.status, "intact", JSON.stringify(ok.issues));
  assert.strictEqual(ok.blocksChecked, blocks.length);

  // 2. each block verifies against its predecessor
  blocks.forEach((b, i) => assert.ok(verifyBlock(b, blocks[i - 1] || null), "block " + b.index));

  // 3. editing one dosage is detected (what the tamper simulation does)
  const bad = rows.map((r) => ({ ...r }));
  bad[0].medicines = bad[0].medicines.map((m, i) => (i ? m : { ...m, dosage: "5000 mg" }));
  const tampered = verifyLedger(blocks, bad);
  assert.strictEqual(tampered.status, "compromised");
  assert.ok(tampered.issues.some((i) => i.code === "RECORD_MODIFIED"));

  // 4. altering a block breaks the chain
  const broken = blocks.map((b) => ({ ...b }));
  broken[2].data = { ...broken[2].data, diagnosis: "changed" };
  assert.ok(verifyLedger(broken, rows).issues.some((i) => i.code === "BAD_HASH" || i.code === "BROKEN_LINK"));

  // 5. demo data is fictional and has no real identifiers / password hashes
  const dump = JSON.stringify({ rows, users: demo.USERS });
  assert.ok(!/passwordHash|bcrypt/i.test(dump));
  assert.ok(Object.values(demo.USERS).every((u) => /DEMO/.test(u.registrationId)));

  // 6. safety engine output is stored with the sample records, and the live check flags a Penicillin allergy
  assert.ok(prescriptions.some((p) => p.aiAnalysis.warnings.some((w) => w.category === "interaction")), "expected an interaction sample");
  const { analyzePrescription } = require("../utils/aiAnalysis");
  const live = analyzePrescription({ diagnosis: "Throat infection", newMedicines: [{ name: "Amoxicillin", dosage: "500 mg", frequency: "1-1-1", duration: "5 days" }], allergies: demo.USERS.patient.allergies, age: 35 });
  assert.ok(live.blocking && live.warnings.some((w) => w.severity === "high" && w.category === "allergy"), "allergy check should block");

  // 7. fraud report computes on the demo data
  const fraud = computeFraud({ prescriptions: rows, auditLogs: [], integrity: ok });
  assert.ok(fraud.overall && typeof fraud.overall.score === "number");

  console.log("demo tests passed:", blocks.length, "blocks,", prescriptions.length, "prescriptions, fraud score", fraud.overall.score);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
