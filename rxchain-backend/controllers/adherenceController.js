const Prescription = require("../models/Prescription");
const DoseLog = require("../models/DoseLog");
const AuditLog = require("../models/AuditLog");
const { buildDoses, summarize, localParts, DEFAULT_TZ } = require("../utils/schedule");

const DAY_MS = 24 * 60 * 60 * 1000;

function minutes(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 60000) + h * 60 + min;
}

async function loadPatientData(patientId) {
  const prescriptions = await Prescription.find({
    patient: patientId,
    status: { $ne: "cancelled" },
    createdAt: { $gte: new Date(Date.now() - 90 * DAY_MS) },
  })
    .sort({ createdAt: -1 })
    .lean();

  const logs = await DoseLog.find({
    patient: patientId,
    prescriptionId: { $in: prescriptions.map((p) => p.prescriptionId) },
  }).lean();

  return { prescriptions, logs };
}

// GET /api/adherence/summary
async function getSummary(req, res) {
  try {
    const { prescriptions, logs } = await loadPatientData(req.user.id);
    res.json({ summary: summarize(prescriptions, logs, new Date(), DEFAULT_TZ), timeZone: DEFAULT_TZ });
  } catch (error) {
    res.status(500).json({ message: "Failed to load your reminders", error: error.message });
  }
}

// POST /api/adherence/log  { prescriptionId, medicine, date, slot, status: "taken"|"skipped"|"clear" }
async function logDose(req, res) {
  try {
    const { prescriptionId, medicine, date, slot, status } = req.body || {};

    if (!prescriptionId || !medicine || !date || !slot || !["taken", "skipped", "clear"].includes(status)) {
      return res.status(400).json({ message: "prescriptionId, medicine, date, slot and a valid status are required" });
    }

    const prescription = await Prescription.findOne({
      prescriptionId,
      patient: req.user.id,
    }).lean();

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    // the dose must exist in this prescription's schedule
    const key = `${prescriptionId}|${medicine}|${date}|${slot}`;
    const dose = buildDoses([prescription], DEFAULT_TZ).find((d) => d.key === key);
    if (!dose) {
      return res.status(400).json({ message: "That dose is not part of this prescription's schedule" });
    }

    // cannot mark doses that are more than 3 hours in the future
    const now = localParts(new Date(), DEFAULT_TZ);
    if (minutes(date, slot) > minutes(now.date, now.time) + 180) {
      return res.status(400).json({ message: "You can only mark a dose close to its scheduled time" });
    }

    const filter = { patient: req.user.id, prescriptionId, medicine, date, slot };

    if (status === "clear") {
      await DoseLog.deleteOne(filter);
    } else {
      await DoseLog.findOneAndUpdate(
        filter,
        { ...filter, status, loggedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({ message: "Saved", status });
  } catch (error) {
    res.status(500).json({ message: "Failed to save", error: error.message });
  }
}

module.exports = { getSummary, logDose };
