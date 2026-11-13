const express = require("express");

const router = express.Router();

const {
  authenticate,
  requireRole,
} = require("../middleware/auth");

const {
  checkPrescription,
  getAnalysis,
  explainPrescription,
  createPrescription,
  getDoctorPrescriptions,
  getPatientHistory,
  getMyPrescriptions,
  getPrescriptionById,
  verifyPrescription,
  dispensePrescription,
  getAllPrescriptions,
  getLedger,
} = require("../controllers/prescriptionController");

router.post(
  "/",
  authenticate,
  requireRole("doctor"),
  createPrescription
);

// Dry-run safety check while the doctor is still typing (nothing is saved).
router.post(
  "/check",
  authenticate,
  requireRole("doctor"),
  checkPrescription
);

router.get(
  "/doctor",
  authenticate,
  requireRole("doctor"),
  getDoctorPrescriptions
);

router.get(
  "/patient/:patientId",
  authenticate,
  requireRole("doctor", "admin"),
  getPatientHistory
);

router.get(
  "/mine",
  authenticate,
  requireRole("patient"),
  getMyPrescriptions
);

router.get(
  "/all",
  authenticate,
  requireRole("admin", "pharmacy"),
  getAllPrescriptions
);

router.get("/ledger", authenticate, getLedger);

router.get(
  "/:prescriptionId/analysis",
  authenticate,
  requireRole("doctor", "admin"),
  getAnalysis
);

router.get(
  "/:prescriptionId/explain",
  authenticate,
  requireRole("doctor", "patient", "pharmacy", "admin"),
  explainPrescription
);

router.get(
  "/:prescriptionId",
  authenticate,
  requireRole("doctor", "patient", "pharmacy", "admin"),
  getPrescriptionById
);

router.post(
  "/verify",
  authenticate,
  requireRole("pharmacy", "admin"),
  verifyPrescription
);

router.patch(
  "/:prescriptionId/dispense",
  authenticate,
  requireRole("pharmacy"),
  dispensePrescription
);

module.exports = router;