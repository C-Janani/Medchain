const User = require("../models/User");
const Prescription = require("../models/Prescription");
const Block = require("../models/Block");
const AuditLog = require("../models/AuditLog");
const { verifyLedger } = require("../utils/integrity");
const { computeFraud } = require("../utils/fraud");

async function getUsers(req, res) {
  try {
    const users = await User.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
}

async function getStats(req, res) {
  try {
    const [
      totalUsers,
      doctors,
      patients,
      pharmacies,
      prescriptions,
      activePrescriptions,
      dispensedPrescriptions,
      blocks,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "pharmacy" }),
      Prescription.countDocuments(),
      Prescription.countDocuments({ status: "active" }),
      Prescription.countDocuments({ status: "dispensed" }),
      Block.countDocuments(),
    ]);

    res.json({
      stats: {
        totalUsers,
        doctors,
        patients,
        pharmacies,
        prescriptions,
        activePrescriptions,
        dispensedPrescriptions,
        blockchainBlocks: blocks,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
}

async function getBlocks(req, res) {
  try {
    const blocks = await Block.find()
      .sort({ index: 1 });

    res.json({ blocks });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blockchain",
      error: error.message,
    });
  }
}

async function getAuditLogs(req, res) {
  try {
    const logs = await AuditLog.find()
      .populate(
        "actor",
        "registrationId name role"
      )
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ logs });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
}

async function runIntegrityCheck() {
  const [blocks, prescriptions] = await Promise.all([
    Block.find().sort({ index: 1 }).lean(),
    Prescription.find()
      .populate("doctor", "registrationId name")
      .populate("patient", "registrationId name")
      .lean(),
  ]);
  return verifyLedger(blocks, prescriptions);
}

// GET /api/admin/integrity - re-hash every block and cross-check every record
async function getIntegrity(req, res) {
  try {
    const report = await runIntegrityCheck();

    await AuditLog.create({
      actor: req.user.id,
      action: "INTEGRITY_CHECK",
      target: "ledger",
      details: {
        blocksChecked: report.blocksChecked,
        prescriptionsChecked: report.prescriptionsChecked,
        issues: report.issues.length,
      },
      result: report.status,
    });

    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: "Integrity check failed", error: error.message });
  }
}

// GET /api/admin/fraud - anomaly flags and risk scores
async function getFraudReport(req, res) {
  try {
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const [prescriptions, auditLogs, integrity] = await Promise.all([
      Prescription.find({ createdAt: { $gte: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } })
        .populate("doctor", "registrationId name")
        .populate("patient", "registrationId name")
        .populate("dispensedBy", "registrationId name")
        .lean(),
      AuditLog.find({
        createdAt: { $gte: since },
        action: { $in: ["VERIFY_FAILED", "DUPLICATE_DISPENSE_ATTEMPT"] },
      })
        .populate("actor", "registrationId name role")
        .lean(),
      runIntegrityCheck(),
    ]);

    res.json({ report: computeFraud({ prescriptions, auditLogs, integrity }) });
  } catch (error) {
    res.status(500).json({ message: "Fraud analysis failed", error: error.message });
  }
}

module.exports = {
  getIntegrity,
  getFraudReport,
  getUsers,
  getStats,
  getBlocks,
  getAuditLogs,
};