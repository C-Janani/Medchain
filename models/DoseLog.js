const mongoose = require("mongoose");

// One row per dose the patient marked as taken (or skipped).
// Doses with no row are worked out as upcoming / due / missed from the schedule.
const doseLogSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prescriptionId: { type: String, required: true },
    medicine: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // local date, YYYY-MM-DD
    slot: { type: String, required: true }, // local time, HH:MM
    status: { type: String, enum: ["taken", "skipped"], required: true },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

doseLogSchema.index(
  { patient: 1, prescriptionId: 1, medicine: 1, date: 1, slot: 1 },
  { unique: true }
);

module.exports = mongoose.model("DoseLog", doseLogSchema);
