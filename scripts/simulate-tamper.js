/* ==========================================================================
   simulate-tamper.js - DEMO ONLY. Shows the Admin "Ledger integrity" alert.

     node scripts/simulate-tamper.js            change the dosage of the newest
                                                prescription directly in MongoDB
     node scripts/simulate-tamper.js --restore  put the original value back

   Then open the Admin dashboard and press "Verify now".
   The app itself never edits a prescription after it is sealed on the chain,
   so this is exactly what an attacker with database access would do.
   ========================================================================== */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const connectDB = require("../config/db");
const Prescription = require("../models/Prescription");

const BACKUP = path.join(__dirname, ".tamper-backup.json");

async function main() {
  if (!(await connectDB())) { console.error("MongoDB not connected"); process.exit(1); }

  if (process.argv.includes("--restore")) {
    if (!fs.existsSync(BACKUP)) {
      console.log("[tamper] nothing to restore.");
      return;
    }
    const { prescriptionId, dosage } = JSON.parse(fs.readFileSync(BACKUP, "utf8"));
    await Prescription.collection.updateOne({ prescriptionId }, { $set: { "medicines.0.dosage": dosage } });
    fs.unlinkSync(BACKUP);
    console.log(`[tamper] restored ${prescriptionId} (dosage back to "${dosage}").`);
    return;
  }

  if (fs.existsSync(BACKUP)) {
    console.log("[tamper] a change is already in place. Run with --restore first.");
    return;
  }

  const rx = await Prescription.findOne().sort({ createdAt: -1 });
  if (!rx) {
    console.log("[tamper] no prescriptions yet. Issue one first.");
    return;
  }

  fs.writeFileSync(BACKUP, JSON.stringify({ prescriptionId: rx.prescriptionId, dosage: rx.medicines[0].dosage }));
  await Prescription.collection.updateOne({ prescriptionId: rx.prescriptionId }, { $set: { "medicines.0.dosage": "9999mg" } });
  console.log(`[tamper] changed ${rx.prescriptionId} dosage "${rx.medicines[0].dosage}" -> "9999mg" directly in the database.`);
  console.log("[tamper] open the Admin dashboard and press 'Verify now'. Undo with: node scripts/simulate-tamper.js --restore");
}

main()
  .catch((e) => { console.error("[tamper] failed:", e.message); process.exitCode = 1; })
  .finally(() => process.exit());
