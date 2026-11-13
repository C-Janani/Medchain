/* ==========================================================================
   fraud.js - rule-based fraud / anomaly detection and risk scoring.
   Pure function: prescriptions + audit logs + integrity report in, report out.

   Each rule adds points to the person it concerns (doctor, pharmacy or
   patient). Scores are capped at 100:  < 30 low,  30-59 medium,  60+ high.
   These are SIGNALS for an admin to review, not proof of wrongdoing.
   ========================================================================== */

const { CONTROLLED_SUBSTANCES } = require("./clinicalData");
const { resolveMedicine } = require("./safety");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const LIMITS = {
  doctorDayHigh: 8,         // prescriptions in 24h (and 3x the doctor's usual rate)
  doctorDayMedium: 5,
  spikeFactor: 3,
  burstCount: 5,            // prescriptions inside one burst window
  burstWindowMs: 10 * 60 * 1000,
  controlledPerDay: 3,
  shoppingWindowMs: 7 * DAY,
  pharmacyHourHigh: 10,
  pharmacyHourMedium: 5,
  duplicateDispenseHigh: 2,
  verifyFailMedium: 2,
  verifyFailHigh: 4,
};

function levelOf(score) {
  return score >= 60 ? "high" : score >= 30 ? "medium" : "low";
}

function medicineKeys(rx) {
  const keys = new Set();
  for (const m of rx.medicines || []) {
    const generics = resolveMedicine(m.name);
    if (generics.length) generics.forEach((g) => keys.add(g));
    else keys.add(String(m.name || "").trim().toLowerCase());
  }
  keys.delete("");
  return keys;
}

function isControlled(key) {
  return CONTROLLED_SUBSTANCES.includes(key);
}

function computeFraud({ prescriptions = [], auditLogs = [], integrity = null, now = new Date() }) {
  const nowMs = now.getTime();
  const flags = [];
  const entities = new Map();

  function entity(id, name, role) {
    if (!entities.has(id)) entities.set(id, { id, name: name || id, role, score: 0, flags: 0 });
    return entities.get(id);
  }

  function flag({ code, severity, id, name, role, points, message, evidence = [] }) {
    const e = entity(id, name, role);
    e.score = Math.min(100, e.score + points);
    e.flags += 1;
    flags.push({ code, severity, entityId: id, entityName: e.name, role, points, message, evidence });
  }

  const created = (rx) => new Date(rx.createdAt).getTime();
  const docId = (rx) => rx.doctor && rx.doctor.registrationId;
  const patId = (rx) => rx.patient && rx.patient.registrationId;

  // make sure everyone who has activity appears in the table, even at score 0
  for (const rx of prescriptions) {
    if (docId(rx)) entity(docId(rx), rx.doctor.name, "doctor");
    if (rx.dispensedBy && rx.dispensedBy.registrationId) {
      entity(rx.dispensedBy.registrationId, rx.dispensedBy.name, "pharmacy");
    }
  }

  /* 1. Doctor volume spike + bursts */
  const byDoctor = new Map();
  for (const rx of prescriptions) {
    if (!docId(rx)) continue;
    if (!byDoctor.has(docId(rx))) byDoctor.set(docId(rx), []);
    byDoctor.get(docId(rx)).push(rx);
  }

  for (const [id, list] of byDoctor) {
    const name = list[0].doctor.name;
    const last24 = list.filter((rx) => nowMs - created(rx) <= DAY);
    const earlier = list.filter((rx) => nowMs - created(rx) > DAY && nowMs - created(rx) <= 8 * DAY);
    const usualPerDay = Math.max(1, earlier.length / 7);

    if (last24.length >= LIMITS.doctorDayHigh && last24.length >= LIMITS.spikeFactor * usualPerDay) {
      flag({
        code: "DOCTOR_VOLUME_SPIKE", severity: "high", id, name, role: "doctor", points: 30,
        message: `${name} issued ${last24.length} prescriptions in 24 hours (usual rate is about ${Math.round(usualPerDay * 10) / 10} a day).`,
        evidence: last24.slice(0, 10).map((rx) => rx.prescriptionId),
      });
    } else if (last24.length >= LIMITS.doctorDayMedium && last24.length >= LIMITS.spikeFactor * usualPerDay) {
      flag({
        code: "DOCTOR_VOLUME_SPIKE", severity: "medium", id, name, role: "doctor", points: 15,
        message: `${name} issued ${last24.length} prescriptions in 24 hours, well above their usual rate.`,
        evidence: last24.slice(0, 10).map((rx) => rx.prescriptionId),
      });
    }

    const times = list.map(created).sort((a, b) => a - b);
    for (let i = 0; i + LIMITS.burstCount - 1 < times.length; i++) {
      if (times[i + LIMITS.burstCount - 1] - times[i] <= LIMITS.burstWindowMs) {
        flag({
          code: "DOCTOR_BURST", severity: "medium", id, name, role: "doctor", points: 20,
          message: `${name} issued ${LIMITS.burstCount} or more prescriptions within ${LIMITS.burstWindowMs / 60000} minutes.`,
          evidence: [],
        });
        break; // one flag per doctor is enough
      }
    }

    /* 3. Controlled substances */
    const controlled = last24.filter((rx) => [...medicineKeys(rx)].some(isControlled));
    if (controlled.length >= LIMITS.controlledPerDay) {
      flag({
        code: "CONTROLLED_VOLUME", severity: "high", id, name, role: "doctor", points: 25,
        message: `${name} issued ${controlled.length} prescriptions for controlled medicines in 24 hours.`,
        evidence: controlled.map((rx) => rx.prescriptionId),
      });
    }
  }

  /* 2. Same patient, same medicine, different doctors (possible doctor-shopping) */
  const byPatient = new Map();
  for (const rx of prescriptions) {
    if (!patId(rx) || nowMs - created(rx) > LIMITS.shoppingWindowMs * 4) continue;
    if (!byPatient.has(patId(rx))) byPatient.set(patId(rx), []);
    byPatient.get(patId(rx)).push(rx);
  }

  for (const [pid, list] of byPatient) {
    const perMedicine = new Map(); // key -> [{rx}]
    for (const rx of list) {
      for (const key of medicineKeys(rx)) {
        if (!perMedicine.has(key)) perMedicine.set(key, []);
        perMedicine.get(key).push(rx);
      }
    }
    for (const [key, rxs] of perMedicine) {
      const sorted = rxs.slice().sort((a, b) => created(a) - created(b));
      let hit = null;
      for (let i = 0; i < sorted.length && !hit; i++) {
        const group = sorted.filter(
          (rx) => created(rx) >= created(sorted[i]) && created(rx) - created(sorted[i]) <= LIMITS.shoppingWindowMs
        );
        const doctors = new Set(group.map(docId));
        if (doctors.size >= 2) hit = group;
      }
      if (hit) {
        const controlled = isControlled(key);
        flag({
          code: "MULTI_DOCTOR_SAME_MEDICINE",
          severity: controlled ? "high" : "medium",
          id: pid, name: hit[0].patient.name || pid, role: "patient",
          points: controlled ? 40 : 25,
          message: `${pid} received ${key} from ${new Set(hit.map(docId)).size} different doctors within 7 days.`,
          evidence: hit.map((rx) => rx.prescriptionId),
        });
      }
    }
  }

  /* 4. Pharmacy dispensing speed */
  const byPharmacy = new Map();
  for (const rx of prescriptions) {
    if (rx.status !== "dispensed" || !rx.dispensedAt || !rx.dispensedBy || !rx.dispensedBy.registrationId) continue;
    const id = rx.dispensedBy.registrationId;
    if (!byPharmacy.has(id)) byPharmacy.set(id, []);
    byPharmacy.get(id).push(rx);
  }
  for (const [id, list] of byPharmacy) {
    const name = list[0].dispensedBy.name;
    const times = list.map((rx) => new Date(rx.dispensedAt).getTime()).sort((a, b) => a - b);
    const maxIn = (n) => {
      for (let i = 0; i + n - 1 < times.length; i++) if (times[i + n - 1] - times[i] <= HOUR) return true;
      return false;
    };
    if (maxIn(LIMITS.pharmacyHourHigh)) {
      flag({ code: "PHARMACY_RAPID_DISPENSE", severity: "high", id, name, role: "pharmacy", points: 25,
        message: `${name} dispensed ${LIMITS.pharmacyHourHigh} or more prescriptions within one hour.` });
    } else if (maxIn(LIMITS.pharmacyHourMedium)) {
      flag({ code: "PHARMACY_RAPID_DISPENSE", severity: "medium", id, name, role: "pharmacy", points: 10,
        message: `${name} dispensed ${LIMITS.pharmacyHourMedium} or more prescriptions within one hour.` });
    }
  }

  /* 5. Repeated dispense / verification failures (from the audit log) */
  const recent = auditLogs.filter((l) => nowMs - new Date(l.createdAt).getTime() <= DAY);
  const countBy = (action) => {
    const map = new Map();
    for (const l of recent) {
      if (l.action !== action || !l.actor || !l.actor.registrationId) continue;
      const id = l.actor.registrationId;
      if (!map.has(id)) map.set(id, { actor: l.actor, targets: [] });
      map.get(id).targets.push(l.target);
    }
    return map;
  };

  for (const [id, { actor, targets }] of countBy("DUPLICATE_DISPENSE_ATTEMPT")) {
    const high = targets.length >= LIMITS.duplicateDispenseHigh;
    flag({
      code: "DUPLICATE_DISPENSE_ATTEMPT", severity: high ? "high" : "medium", id, name: actor.name, role: actor.role || "pharmacy",
      points: high ? 30 : 10,
      message: `${actor.name || id} tried to dispense an already-dispensed prescription ${targets.length} time${targets.length === 1 ? "" : "s"} in 24 hours.`,
      evidence: [...new Set(targets)].filter(Boolean),
    });
  }
  for (const [id, { actor, targets }] of countBy("VERIFY_FAILED")) {
    if (targets.length < LIMITS.verifyFailMedium) continue;
    const high = targets.length >= LIMITS.verifyFailHigh;
    flag({
      code: "REPEATED_VERIFY_FAILURES", severity: high ? "high" : "medium", id, name: actor.name, role: actor.role || "pharmacy",
      points: high ? 25 : 15,
      message: `${actor.name || id} had ${targets.length} failed prescription verifications in 24 hours.`,
      evidence: [...new Set(targets)].filter(Boolean),
    });
  }

  /* 6. Ledger tampering (from the integrity check) */
  let ledgerCompromised = false;
  if (integrity && integrity.issues && integrity.issues.length) {
    const high = integrity.issues.filter((i) => i.severity === "high");
    ledgerCompromised = high.length > 0;
    const byId = new Map(prescriptions.map((rx) => [rx.prescriptionId, rx]));
    const seenDoctors = new Set();
    for (const issue of high) {
      const rx = issue.prescriptionId && byId.get(issue.prescriptionId);
      if (rx && docId(rx) && !seenDoctors.has(docId(rx))) {
        seenDoctors.add(docId(rx));
        flag({
          code: "LEDGER_TAMPERING", severity: "high", id: docId(rx), name: rx.doctor.name, role: "doctor", points: 40,
          message: `Records linked to ${rx.doctor.name} do not match the ledger. See the integrity report.`,
          evidence: high.filter((i) => i.prescriptionId && byId.get(i.prescriptionId) && docId(byId.get(i.prescriptionId)) === docId(rx)).map((i) => i.prescriptionId),
        });
      }
    }
  }

  const list = [...entities.values()]
    .map((e) => ({ ...e, level: levelOf(e.score) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const top = list.length ? list[0].score : 0;
  const overallScore = ledgerCompromised ? 100 : top;

  const rank = { high: 3, medium: 2, low: 1 };
  flags.sort((a, b) => rank[b.severity] - rank[a.severity] || b.points - a.points);

  return {
    overall: { score: overallScore, level: levelOf(overallScore), ledgerCompromised },
    entities: list,
    flags,
    generatedAt: now.toISOString(),
  };
}

module.exports = { computeFraud, LIMITS };
