const express = require("express");

const router = express.Router();

const { authenticate, requireRole } = require("../middleware/auth");

const {
  medicineSuggestions,
  listTemplates,
  saveTemplate,
  deleteTemplate,
} = require("../controllers/clinicalController");

router.use(authenticate, requireRole("doctor"));

router.get("/medicines", medicineSuggestions);
router.get("/templates", listTemplates);
router.post("/templates", saveTemplate);
router.delete("/templates/:id", deleteTemplate);

module.exports = router;
