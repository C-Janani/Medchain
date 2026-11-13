const express = require("express");

const router = express.Router();

const {
  authenticate,
  requireRole,
} = require("../middleware/auth");

const {
  getUsers,
  getStats,
  getBlocks,
  getAuditLogs,
  getIntegrity,
  getFraudReport,
} = require("../controllers/adminController");

router.get(
  "/users",
  authenticate,
  requireRole("admin"),
  getUsers
);

router.get(
  "/stats",
  authenticate,
  requireRole("admin"),
  getStats
);

router.get(
  "/blocks",
  authenticate,
  requireRole("admin"),
  getBlocks
);

router.get(
  "/integrity",
  authenticate,
  requireRole("admin"),
  getIntegrity
);

router.get(
  "/fraud",
  authenticate,
  requireRole("admin"),
  getFraudReport
);

router.get(
  "/audit-logs",
  authenticate,
  requireRole("admin"),
  getAuditLogs
);

module.exports = router;