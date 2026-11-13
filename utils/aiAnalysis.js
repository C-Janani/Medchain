/* ==========================================================================
   aiAnalysis.js - prescription analysis used when a prescription is created
   and by the "AI analysis" page.

   Combines:
     - history overlap (same / similar medicine seen in previous records)
     - safety screening (allergies, interactions, duplicates, dosage, age)
   See safety.js. This is a rule-based screening aid, NOT a clinical diagnosis.
   ========================================================================== */

const { screenPrescription, riskFromWarnings } = require("./safety");

function normalizeMedicineName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function historyWarnings(newMedicines, previousMedicines) {
  const warnings = [];
  const seen = new Set();
  const previousNames = previousMedicines.map(normalizeMedicineName);

  function push(w) {
    const key = w.severity + "|" + w.medicines.join("|").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    warnings.push(w);
  }

  for (const medicine of newMedicines) {
    const newName = normalizeMedicineName(medicine.name);
    if (!newName) continue;

    if (previousNames.includes(newName)) {
      push({
        severity: "low",
        category: "history",
        medicines: [medicine.name],
        reason:
          "This medicine appears in the patient's previous prescription history. Review the previous prescription before continuing.",
      });
    }
  }
  return warnings;
}

function analyzePrescription({
  diagnosis = "",
  newMedicines = [],
  previousMedicines = [],
  previousDiagnoses = [],
  activeMedicines = [],
  allergies = [],
  age = null,
}) {
  const screening = screenPrescription({
    medicines: newMedicines,
    activeMedicines,
    allergies,
    age,
  });

  const warnings = [...screening.warnings, ...historyWarnings(newMedicines, previousMedicines)];
  const risk = riskFromWarnings(warnings);

  const high = warnings.filter((w) => w.severity === "high").length;
  const medium = warnings.filter((w) => w.severity === "medium").length;

  let summary = "No safety concerns were found from the allergies, active medicines and history on record.";
  if (high) {
    summary = `${high} serious safety concern${high === 1 ? "" : "s"} found. Review before issuing.`;
  } else if (medium) {
    summary = `${medium} item${medium === 1 ? "" : "s"} should be reviewed before issuing.`;
  } else if (warnings.length) {
    summary = "Minor items were found. Review them against the patient's history.";
  }

  return {
    warnings,
    summary,
    risk,
    blocking: screening.blocking,
    unrecognised: screening.unrecognised,
    context: {
      diagnosis,
      previousDiagnoses,
      medicinesReviewed: newMedicines.map((m) => m.name),
      previousMedicinesReviewed: previousMedicines,
      activeMedicinesReviewed: activeMedicines.map((m) => m.name),
      allergiesOnRecord: allergies,
      patientAge: age,
    },
  };
}

module.exports = {
  analyzePrescription,
};
