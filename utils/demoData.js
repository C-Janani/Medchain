/* ==========================================================================
   demoData.js - isolated, in-memory PUBLIC DEMO dataset.

   - Entirely fictional people and records. Never touches MongoDB.
   - Built once at server start. The ledger is a simulated hash chain
     (SHA-256, each block stores the previous block's hash) created with the
     SAME functions the real app uses (utils/blockchain.js). It is NOT a
     deployed blockchain network.
   - Pure data + read helpers. Nothing here can modify real records.
   ========================================================================== */

const crypto = require("crypto");
const { calculateHash } = require("./blockchain");
const { analyzePrescription } = require("./aiAnalysis");
const { generatePrescriptionQR } = require("./qr");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const USERS = {
  doctor: { _id: "demo-doc", registrationId: "DOC-DEMO", name: "Dr. Asha Venkat (Demo)", role: "doctor", specialization: "General Medicine", licenseNumber: "DEMO-0000" },
  doctor2: { _id: "demo-doc2", registrationId: "DOC-DEMO2", name: "Dr. Ravi Kumar (Demo)", role: "doctor", specialization: "Internal Medicine", licenseNumber: "DEMO-0001" },
  patient: { _id: "demo-pat", registrationId: "PAT-DEMO", name: "Priya Sample", role: "patient", dateOfBirth: "1991-06-12", allergies: ["Penicillin"] },
  patient2: { _id: "demo-pat2", registrationId: "PAT-DEMO2", name: "Arun Example", role: "patient", dateOfBirth: "1968-02-03", allergies: [] },
  patient3: { _id: "demo-pat3", registrationId: "PAT-DEMO3", name: "Meena Test", role: "patient", dateOfBirth: "2016-09-21", allergies: [] },
  pharmacy: { _id: "demo-phr", registrationId: "PHR-DEMO", name: "Sample Care Pharmacy (Demo)", role: "pharmacy", licenseNumber: "DEMO-PH-1" },
  admin: { _id: "demo-adm", registrationId: "ADM-DEMO", name: "Demo Administrator", role: "admin" },
};

// [doctor, patient, diagnosis, medicines, instructions, ageHours, status, dispensedAfterHours]
const SEED = [
  ["doctor", "patient", "Viral fever", [
    { name: "Paracetamol", dosage: "500 mg", frequency: "1-1-1", duration: "5 days" },
  ], "Drink plenty of fluids and rest.", 26 * 24, "dispensed", 2],
  ["doctor", "patient", "Seasonal allergic rhinitis", [
    { name: "Cetirizine", dosage: "10 mg", frequency: "0-0-1", duration: "7 days" },
  ], "Avoid dust. Take at night.", 9 * 24, "dispensed", 5],
  ["doctor", "patient", "Acid reflux", [
    { name: "Pantoprazole", dosage: "40 mg", frequency: "1-0-0", duration: "14 days" },
    { name: "Paracetamol", dosage: "500 mg", frequency: "1-0-1", duration: "3 days" },
  ], "Take Pantoprazole 30 minutes before breakfast.", 30, "active", null],
  ["doctor2", "patient2", "Type 2 diabetes follow-up", [
    { name: "Metformin", dosage: "500 mg", frequency: "1-0-1", duration: "30 days" },
  ], "Take after food. Review in 4 weeks.", 18 * 24, "dispensed", 3],
  ["doctor2", "patient2", "Joint pain", [
    { name: "Ibuprofen", dosage: "400 mg", frequency: "1-0-1", duration: "5 days" },
    { name: "Aspirin", dosage: "75 mg", frequency: "1-0-0", duration: "5 days" },
  ], "Take after food. Doctor reviewed the NSAID + aspirin interaction warning before issuing.", 20, "active", null],
  ["doctor", "patient3", "Throat infection", [
    { name: "Paracetamol", dosage: "250 mg", frequency: "1-1-1", duration: "3 days" },
  ], "Pediatric dose. Warm fluids.", 3 * 24, "active", null],
];

let state = null;

function ctx(patient) {
  const dob = new Date(patient.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * DAY));
  return { age, allergies: patient.allergies || [] };
}

async function build() {
  const now = Date.now();
  const blocks = [];
  const genesisData = { type: "GENESIS", message: "RxChain DEMO ledger initialized" };
  const genesisTs = new Date(now - 40 * DAY);
  blocks.push({ index: 0, timestamp: genesisTs, data: genesisData, previousHash: "0", hash: calculateHash(0, genesisTs, genesisData, "0") });

  const prescriptions = [];
  const ordered = SEED.slice().sort((a, b) => b[5] - a[5]); // oldest first
  let n = 1;
  for (const [docKey, patKey, diagnosis, medicines, instructions, ageHours, status, dispAfter] of ordered) {
    const doctor = USERS[docKey];
    const patient = USERS[patKey];
    const createdAt = new Date(now - ageHours * HOUR);
    const prescriptionId = `RX-DEMO-${String(1000 + n).padStart(4, "0")}`;
    const qrToken = crypto.randomBytes(16).toString("hex");

    const analysis = analyzePrescription({ diagnosis, newMedicines: medicines, ...ctx(patient) });

    const data = {
      type: "PRESCRIPTION",
      prescriptionId,
      patientId: patient.registrationId,
      doctorId: doctor.registrationId,
      diagnosis,
      medicines: medicines.map((m) => ({ name: m.name, dosage: m.dosage, duration: m.duration, frequency: m.frequency })),
      issuedAt: createdAt,
    };
    const prev = blocks[blocks.length - 1];
    const ts = createdAt;
    const block = { index: prev.index + 1, timestamp: ts, data, previousHash: prev.hash, hash: calculateHash(prev.index + 1, ts, data, prev.hash) };
    blocks.push(block);

    prescriptions.push({
      prescriptionId,
      doctorKey: docKey,
      patientKey: patKey,
      diagnosis,
      medicines,
      instructions,
      aiAnalysis: { summary: analysis.summary, warnings: analysis.warnings },
      warningsAcknowledged: !!analysis.blocking,
      qrToken,
      blockchain: { blockIndex: block.index, blockHash: block.hash },
      status,
      dispensedAt: status === "dispensed" ? new Date(createdAt.getTime() + dispAfter * HOUR) : null,
      createdAt,
      updatedAt: createdAt,
    });
    n++;
  }

  state = { blocks, prescriptions };
  return state;
}

function ready() {
  if (!state) throw new Error("Demo data not initialised");
  return state;
}

// Shape a record like the real API does (populated doctor/patient).
function shape(rx, extra = {}) {
  const d = USERS[rx.doctorKey];
  const p = USERS[rx.patientKey];
  const pick = (u, f) => Object.fromEntries(f.map((k) => [k, u[k]]));
  return {
    _id: rx.prescriptionId,
    prescriptionId: rx.prescriptionId,
    doctor: pick(d, ["_id", "registrationId", "name", "specialization", "licenseNumber"]),
    patient: pick(p, ["_id", "registrationId", "name", "dateOfBirth"]),
    diagnosis: rx.diagnosis,
    medicines: rx.medicines,
    instructions: rx.instructions,
    aiAnalysis: rx.aiAnalysis,
    warningsAcknowledged: rx.warningsAcknowledged,
    qrToken: rx.qrToken,
    blockchain: rx.blockchain,
    status: rx.status,
    dispensedBy: rx.status === "dispensed" ? pick(USERS.pharmacy, ["_id", "registrationId", "name"]) : null,
    dispensedAt: rx.dispensedAt,
    createdAt: rx.createdAt,
    updatedAt: rx.updatedAt,
    ...extra,
  };
}

async function withQr(rx) {
  const qrCode = await generatePrescriptionQR({
    prescriptionId: rx.prescriptionId,
    qrToken: rx.qrToken,
    blockHash: rx.blockchain.blockHash,
  });
  return { qrCode, prescription: shape(rx) };
}

module.exports = { USERS, build, ready, shape, withQr, DAY, HOUR };
