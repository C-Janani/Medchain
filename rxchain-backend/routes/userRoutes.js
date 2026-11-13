const express = require("express");

const router = express.Router();

const {
  authenticate,
  requireRole,
} = require("../middleware/auth");

const {
  createUser,
  getPatients,
  updateAllergies,
  getProfile,
} = require("../controllers/userController");

router.get(
  "/profile",
  authenticate,
  getProfile
);

router.get(
  "/patients",
  authenticate,
  requireRole("doctor", "admin"),
  getPatients
);

router.put(
  "/patients/:registrationId/allergies",
  authenticate,
  requireRole("doctor", "admin"),
  updateAllergies
);

router.post(
  "/",
  authenticate,
  requireRole("doctor", "admin"),
  createUser
);

module.exports = router;