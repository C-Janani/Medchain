const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

// "Penicillin, NSAIDs" or ["Penicillin", "NSAIDs"] -> ["Penicillin", "NSAIDs"]
function parseAllergies(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(/[,;\n]/);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const text = String(item || "").trim().slice(0, 60);
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length >= 20) break;
  }
  return out;
}

const PREFIX = { doctor: "DOC", patient: "PAT", pharmacy: "PHR", admin: "ADM" };

async function uniqueRegistrationId(role) {
  for (let i = 0; i < 30; i++) {
    const id = `${PREFIX[role]}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!(await User.exists({ registrationId: id }))) return id;
  }
  throw new Error("Could not generate a unique registration ID");
}

// Doctors can register patients; admins can register any role.
async function createUser(req, res) {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role = req.user.role === "doctor" ? "patient" : body.role;

    if (!PREFIX[role]) {
      return res.status(400).json({ message: "Role must be doctor, patient, pharmacy or admin" });
    }
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if ((role === "doctor" || role === "pharmacy") && !String(body.licenseNumber || "").trim()) {
      return res.status(400).json({ message: "Licence number is required for doctors and pharmacies" });
    }

    let registrationId = "";
    if (req.user.role === "admin" && String(body.registrationId || "").trim()) {
      registrationId = String(body.registrationId).trim().toUpperCase();
      if (await User.exists({ registrationId })) {
        return res.status(409).json({ message: "That registration ID already exists" });
      }
    } else {
      registrationId = await uniqueRegistrationId(role);
    }

    const user = await User.create({
      registrationId,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      specialization: String(body.specialization || "").trim(),
      licenseNumber: String(body.licenseNumber || "").trim(),
      dateOfBirth: String(body.dateOfBirth || "").trim(),
      allergies: role === "patient" ? parseAllergies(body.allergies) : [],
    });

    await AuditLog.create({
      actor: req.user.id,
      action: "USER_CREATED",
      target: user.registrationId,
      details: { role: user.role },
      result: "success",
    });

    res.status(201).json({
      message: "User created",
      user: {
        id: user._id,
        registrationId: user.registrationId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
}

async function getPatients(req, res) {
  try {
    const search = req.query.search || "";

    const filter = {
      role: "patient",
    };

    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          registrationId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const patients = await User.find(filter)
      .select(
        "registrationId name dateOfBirth allergies createdAt"
      )
      .sort({ name: 1 });

    res.json({ patients });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch patients",
      error: error.message,
    });
  }
}

// Doctors / admins record a patient's drug allergies for the safety checks.
async function updateAllergies(req, res) {
  try {
    const patient = await User.findOne({
      registrationId: req.params.registrationId,
      role: "patient",
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    patient.allergies = parseAllergies(req.body && req.body.allergies);
    await patient.save();

    await AuditLog.create({
      actor: req.user.id,
      action: "PATIENT_ALLERGIES_UPDATED",
      target: patient.registrationId,
      details: { count: patient.allergies.length },
      result: "success",
    });

    res.json({
      message: "Allergies updated",
      patient: {
        registrationId: patient.registrationId,
        name: patient.name,
        allergies: patient.allergies,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update allergies", error: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
}

module.exports = {
  createUser,
  getPatients,
  updateAllergies,
  getProfile,
};