/* ==========================================================================
   demoRoutes.js - PUBLIC, READ-ONLY demo API mounted at /api/demo.

   Safety rules:
   - Never imports a Mongoose model, never reads or writes MongoDB.
   - Serves only the fictional in-memory dataset from utils/demoData.js.
   - Every write endpoint answers 403 "read-only demo".
   - The real protected endpoints (/api/auth, /api/prescriptions, /api/admin ...)
     are untouched and still require a valid JWT.
   The paths mirror the real API so the same front-end code works in demo mode.
   ========================================================================== */

const express = require("express");
const demo = require("../utils/demoData");
const { verifyBlock } = require("../utils/blockchain");
const { verifyLedger } = require("../utils/integrity");
const { computeFraud } = require("../utils/fraud");
const { analyzePrescription } = require("../utils/aiAnalysis");
const { explainPrescription } = require("../utils/explain");
const { suggestMedicines } = require("../utils/safety");
const { TEMPLATES } = require("../utils/clinicalData");
const { summarize, DEFAULT_TZ } = require("../utils/schedule");
const { parseDurationDays } = require("../utils/parse");
const { generatePrescriptionQR } = require("../utils/qr");

const router = express.Router();
const { USERS } = demo;

const READ_ONLY = {
  message: "Demo mode is read-only. Sign in with a real account to create or change records.",
  demo: true,
  readOnly: true,
};

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const find = (id) => demo.ready().prescriptions.find((p) => p.prescriptionId === id);
const byPatientKey = (key) => demo.ready().prescriptions.filter((p) => p.patientKey === key);
const newestFirst = (list) => list.slice().sort((a, b) => b.createdAt - a.createdAt);

function patientContext(patient, excludeId) {
  const prev = newestFirst(demo.ready().prescriptions.filter((p) => p.patientKey === patient && p.prescriptionId !== excludeId));
  const now = Date.now();
  const active = [];
  for (const rx of prev) {
    for (const m of rx.medicines) {
      const days = parseDurationDays(m.duration);
      const live = days !== null ? rx.createdAt.getTime() + days * demo.DAY >= now : now - rx.createdAt.getTime() <= 14 * demo.DAY;
      if (live) active.push({ ...m, source: `(${rx.prescriptionId})` });
    }
  }
  const u = USERS[patient];
  const age = Math.floor((now - new Date(u.dateOfBirth).getTime()) / (365.25 * demo.DAY));
  return {
    previousMedicines: prev.flatMap((r) => r.medicines.map((m) => m.name)),
    previousDiagnoses: prev.map((r) => r.diagnosis),
    activeMedicines: active,
    allergies: u.allergies || [],
    age,
  };
}

/* ---------- info / samples ---------- */
router.get("/info", (req, res) => {
  res.json({
    demo: true,
    readOnly: true,
    ledger: "Simulated SHA-256 hash chain. This is not a deployed blockchain network.",
    users: Object.fromEntries(Object.entries(USERS).map(([k, u]) => [k, { registrationId: u.registrationId, name: u.name, role: u.role }])),
  });
});

// Sample QR codes for the pharmacy demo (tokens belong to fictional demo records only).
router.get("/samples", async (req, res, next) => {
  try {
    const out = [];
    for (const rx of newestFirst(demo.ready().prescriptions)) {
      const qr = await generatePrescriptionQR({ prescriptionId: rx.prescriptionId, qrToken: rx.qrToken, blockHash: rx.blockchain.blockHash });
      out.push({
        prescriptionId: rx.prescriptionId,
        qrToken: rx.qrToken,
        patient: USERS[rx.patientKey].name,
        medicines: rx.medicines.map((m) => m.name).join(", "),
        status: rx.status,
        qrCode: qr,
      });
    }
    const first = out[0];
    out.push({
      prescriptionId: first.prescriptionId,
      qrToken: "forged-token-0000",
      patient: first.patient,
      medicines: first.medicines,
      status: "forged QR",
      forged: true,
      qrCode: await generatePrescriptionQR({ prescriptionId: first.prescriptionId, qrToken: "forged-token-0000", blockHash: "forged" }),
    });
    res.json({ samples: out });
  } catch (e) { next(e); }
});

/* ---------- /auth + /users ---------- */
router.get("/users/patients", (req, res) => {
  const q = String(req.query.search || "").trim().toLowerCase();
  const patients = ["patient", "patient2", "patient3"].map((k) => USERS[k]).filter((p) =>
    !q || p.name.toLowerCase().includes(q) || p.registrationId.toLowerCase().includes(q));
  res.json({ patients: patients.map(({ _id, registrationId, name, dateOfBirth, allergies }) => ({ _id, registrationId, name, dateOfBirth, allergies })) });
});
router.get("/users/profile", (req, res) => res.json({ user: USERS.patient }));

/* ---------- /prescriptions ---------- */
router.get("/prescriptions/doctor", (req, res) =>
  res.json({ prescriptions: newestFirst(demo.ready().prescriptions.filter((p) => p.doctorKey === "doctor")).map((p) => demo.shape(p)) }));

router.get("/prescriptions/mine", async (req, res, next) => {
  try {
    const out = [];
    for (const p of newestFirst(byPatientKey("patient"))) out.push({ ...demo.shape(p), qrCode: (await demo.withQr(p)).qrCode });
    res.json({ prescriptions: out });
  } catch (e) { next(e); }
});

router.get("/prescriptions/all", (req, res) =>
  res.json({ prescriptions: newestFirst(demo.ready().prescriptions).map((p) => demo.shape(p)) }));

router.get("/prescriptions/patient/:patientId", (req, res) => {
  const key = Object.keys(USERS).find((k) => USERS[k].registrationId === req.params.patientId && USERS[k].role === "patient");
  if (!key) return res.status(404).json({ message: "Patient not found" });
  res.json({ patient: USERS[key], prescriptions: newestFirst(byPatientKey(key)).map((p) => demo.shape(p)) });
});

router.get("/prescriptions/ledger", (req, res) =>
  res.json({
    blocks: demo.ready().blocks.map((b) => ({
      index: b.index, timestamp: b.timestamp, hash: b.hash, previousHash: b.previousHash,
      prescriptionId: b.data && b.data.prescriptionId ? b.data.prescriptionId : null,
    })),
  }));

// Dry-run safety check (nothing is saved) - runs the real rule engine.
router.post("/prescriptions/check", (req, res) => {
  const { patientId, diagnosis, medicines } = req.body || {};
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ message: "Add at least one medicine to check" });
  }
  const meds = medicines.map((m) => ({
    name: String((m && m.name) || "").trim(),
    dosage: String((m && m.dosage) || "").trim(),
    frequency: String((m && m.frequency) || "").trim(),
    duration: String((m && m.duration) || "").trim(),
  })).filter((m) => m.name);
  let context = { previousMedicines: [], previousDiagnoses: [], activeMedicines: [], allergies: [], age: null };
  if (patientId) {
    const key = Object.keys(USERS).find((k) => USERS[k].registrationId === patientId && USERS[k].role === "patient");
    if (!key) return res.status(404).json({ message: "Patient not found" });
    context = patientContext(key);
  }
  res.json({ analysis: analyzePrescription({ diagnosis, newMedicines: meds, ...context }) });
});

router.post("/prescriptions/verify", (req, res) => {
  const { prescriptionId, qrToken } = req.body || {};
  if (!prescriptionId || !qrToken) return res.status(400).json({ message: "Prescription ID and QR token are required" });
  const rx = find(prescriptionId);
  if (!rx || rx.qrToken !== qrToken) return res.status(404).json({ verified: false, message: "Invalid prescription or QR code" });
  const { blocks } = demo.ready();
  const block = blocks.find((b) => b.index === rx.blockchain.blockIndex);
  const prev = blocks.find((b) => b.index === rx.blockchain.blockIndex - 1);
  if (!block || !verifyBlock(block, prev)) return res.status(400).json({ verified: false, message: "Blockchain verification failed" });
  if (block.hash !== rx.blockchain.blockHash) return res.status(400).json({ verified: false, message: "Prescription hash does not match blockchain" });
  res.json({
    verified: true,
    message: "Prescription verified successfully",
    prescription: demo.shape(rx),
    blockchain: { blockIndex: block.index, blockHash: block.hash, valid: true },
  });
});

router.get("/prescriptions/:prescriptionId/analysis", (req, res) => {
  const rx = find(req.params.prescriptionId);
  if (!rx) return res.status(404).json({ message: "Prescription not found" });
  const analysis = analyzePrescription({
    diagnosis: rx.diagnosis,
    newMedicines: rx.medicines,
    ...patientContext(rx.patientKey, rx.prescriptionId),
  });
  res.json({
    report: {
      risk: analysis.risk,
      summary: analysis.summary,
      findings: analysis.warnings.length ? analysis.warnings.map((w) => w.reason) : ["No allergy, interaction, duplication or dosage concerns were found."],
      warnings: analysis.warnings,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get("/prescriptions/:prescriptionId/explain", async (req, res, next) => {
  try {
    const rx = find(req.params.prescriptionId);
    if (!rx) return res.status(404).json({ message: "Prescription not found" });
    const lang = req.query.lang === "ta" ? "ta" : "en";
    res.json({ explanation: await explainPrescription(demo.shape(rx), lang) });
  } catch (e) { next(e); }
});

router.get("/prescriptions/:prescriptionId", async (req, res, next) => {
  try {
    const rx = find(req.params.prescriptionId);
    if (!rx) return res.status(404).json({ message: "Prescription not found" });
    res.json(await demo.withQr(rx));
  } catch (e) { next(e); }
});

/* ---------- /clinical ---------- */
router.get("/clinical/medicines", (req, res) => res.json({ medicines: suggestMedicines(req.query.q || "") }));

router.get("/clinical/templates", (req, res) => {
  const q = String(req.query.diagnosis || "").trim().toLowerCase();
  const library = TEMPLATES.filter((t) => !q || t.keywords.some((k) => q.includes(k) || k.includes(q))).map((t) => ({
    id: "builtin:" + t.key, name: t.label, diagnosis: t.diagnosis, medicines: t.medicines, instructions: t.note, builtin: true,
  }));
  res.json({ suggested: q ? library : [], mine: [], library });
});

/* ---------- /adherence (reminders) ---------- */
router.get("/adherence/summary", (req, res) => {
  const list = byPatientKey("patient").filter((p) => p.status !== "cancelled");
  // Illustrative sample history so the adherence figures are not empty:
  // every older dose is marked taken except one skipped dose.
  const logs = [];
  const { buildDoses } = require("../utils/schedule");
  const doses = buildDoses(list, DEFAULT_TZ);
  const cutoff = Date.now() - 6 * demo.HOUR;
  doses.forEach((d, i) => {
    const t = new Date(`${d.date}T${d.time}:00`).getTime();
    if (t < cutoff) logs.push({ prescriptionId: d.prescriptionId, medicine: d.medicine, date: d.date, slot: d.time, status: i % 9 === 4 ? "skipped" : "taken" });
  });
  res.json({ summary: summarize(list, logs, new Date(), DEFAULT_TZ), timeZone: DEFAULT_TZ, demo: true });
});

/* ---------- /admin ---------- */
function integrityInput(tamper) {
  const { blocks, prescriptions } = demo.ready();
  const rows = prescriptions.map((p) => demo.shape(p));
  let chain = blocks.map((b) => ({ ...b }));
  let recs = rows;
  if (tamper) {
    // Simulation on a COPY: change one dosage in a record, as an attacker editing the database would.
    recs = rows.map((r) => ({ ...r }));
    const victim = recs.find((r) => r.status === "dispensed") || recs[0];
    victim.medicines = victim.medicines.map((m, i) => (i === 0 ? { ...m, dosage: "5000 mg" } : m));
  }
  return { blocks: chain, prescriptions: recs };
}

router.get("/admin/integrity", (req, res) => {
  const tamper = req.query.tamper === "1";
  const { blocks, prescriptions } = integrityInput(tamper);
  const report = verifyLedger(blocks, prescriptions);
  if (tamper) report.simulated = "Demo only: one dosage was changed in an in-memory copy to show how tampering is detected. No stored data was modified.";
  res.json({ report });
});

router.get("/admin/fraud", (req, res) => {
  const { blocks, prescriptions } = integrityInput(false);
  const integrity = verifyLedger(blocks, prescriptions);
  const report = computeFraud({ prescriptions: prescriptions.map((r) => ({ ...r })), auditLogs: [], integrity });
  res.json({ report });
});

router.get("/admin/stats", (req, res) => {
  const p = demo.ready().prescriptions;
  res.json({ stats: {
    totalUsers: Object.keys(USERS).length, doctors: 2, patients: 3, pharmacies: 1,
    prescriptions: p.length, activePrescriptions: p.filter((x) => x.status === "active").length,
    dispensedPrescriptions: p.filter((x) => x.status === "dispensed").length,
    blockchainBlocks: demo.ready().blocks.length,
  } });
});
router.get("/admin/blocks", (req, res) => res.json({ blocks: demo.ready().blocks }));
router.get("/admin/users", (req, res) =>
  res.json({ users: Object.values(USERS).map(({ _id, registrationId, name, role }) => ({ _id, registrationId, name, role })) }));
router.get("/admin/audit-logs", (req, res) => res.json({ logs: [] }));

/* ---------- every write is refused ---------- */
router.all(/.*/, (req, res) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return res.status(403).json(READ_ONLY);
  res.status(404).json({ message: "Demo API route not found", path: req.originalUrl });
});

module.exports = router;
