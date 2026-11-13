const express = require("express");

const router = express.Router();

const { authenticate, requireRole } = require("../middleware/auth");
const { getSummary, logDose } = require("../controllers/adherenceController");

router.use(authenticate, requireRole("patient"));

router.get("/summary", getSummary);
router.post("/log", logDose);

module.exports = router;
