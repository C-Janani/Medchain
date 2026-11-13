require("dotenv").config();

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Block = require("../models/Block");
const { createGenesisBlock } = require("../utils/blockchain");

const users = [
  { registrationId: "DOC-1024", name: "Dr. Kavitha Raman", role: "doctor", password: "doctor123", specialization: "General Medicine", licenseNumber: "TN-MED-4471" },
  { registrationId: "PAT-2048", name: "A. Meiyarasi", role: "patient", password: "patient123", dateOfBirth: "1998-03-14" },
  { registrationId: "PHR-3072", name: "City Care Pharmacy", role: "pharmacy", password: "pharmacy123", licenseNumber: "PY-PH-1187" },
  { registrationId: "ADM-4096", name: "System Admin", role: "admin", password: "admin123" },
];

// Well-known passwords (printed in the README) are fine on a laptop but NOT on a public host.
// Default users are therefore created only outside production, or when SEED_DEFAULT_USERS=true.
// In production, an admin can be created from ADMIN_REGISTRATION_ID / ADMIN_PASSWORD / ADMIN_NAME.
function usersToSeed() {
  const isProd = process.env.NODE_ENV === "production";
  const forced = process.env.SEED_DEFAULT_USERS;
  const seedDefaults = forced === "true" || (forced !== "false" && !isProd);
  const list = seedDefaults ? users.slice() : [];

  const { ADMIN_REGISTRATION_ID, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_REGISTRATION_ID && ADMIN_PASSWORD) {
    list.push({ registrationId: ADMIN_REGISTRATION_ID.trim().toUpperCase(), name: ADMIN_NAME || "Administrator", role: "admin", password: ADMIN_PASSWORD });
  }
  return list;
}

// Idempotent: safe to call on every server start.
async function seedData() {
  for (const item of usersToSeed()) {
    if (await User.findOne({ registrationId: item.registrationId })) continue;
    const { password, ...rest } = item;
    await User.create({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
    console.log(`[seed] created ${item.role}: ${item.registrationId}`);
  }
  if (!(await Block.findOne({ index: 0 }))) {
    await Block.create(createGenesisBlock());
    console.log("[seed] genesis block created");
  }
}

module.exports = { seedData };

if (require.main === module) {
  const connectDB = require("../config/db");
  connectDB()
    .then((ok) => { if (!ok) throw new Error("MongoDB not connected"); return seedData(); })
    .then(() => { console.log("[seed] complete"); process.exit(0); })
    .catch((e) => { console.error("[seed] failed:", e); process.exit(1); });
}
