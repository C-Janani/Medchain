const Template = require("../models/Template");
const AuditLog = require("../models/AuditLog");
const { TEMPLATES } = require("../utils/clinicalData");
const { suggestMedicines } = require("../utils/safety");

const norm = (v) => String(v || "").trim().toLowerCase();

// GET /api/clinical/medicines?q=para  -> autocomplete names
function medicineSuggestions(req, res) {
  res.json({ medicines: suggestMedicines(req.query.q || "") });
}

// GET /api/clinical/templates?diagnosis=fever
// Built-in suggestions that match the diagnosis text + the doctor's own templates.
async function listTemplates(req, res) {
  try {
    const q = norm(req.query.diagnosis);

    const suggested = TEMPLATES.filter(
      (t) => !q || t.keywords.some((k) => q.includes(k) || k.includes(q))
    ).map((t) => ({
      id: "builtin:" + t.key,
      name: t.label,
      diagnosis: t.diagnosis,
      medicines: t.medicines,
      instructions: t.note,
      builtin: true,
    }));

    const mine = await Template.find({ doctor: req.user.id }).sort({ name: 1 });

    res.json({
      suggested: q ? suggested : [],
      mine: mine.map((t) => ({
        id: String(t._id),
        name: t.name,
        diagnosis: t.diagnosis,
        medicines: t.medicines,
        instructions: t.instructions,
        builtin: false,
      })),
      library: suggested,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load templates", error: error.message });
  }
}

// POST /api/clinical/templates  { name, diagnosis, medicines[], instructions }
async function saveTemplate(req, res) {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim().slice(0, 80);
    const medicines = Array.isArray(body.medicines) ? body.medicines : [];

    if (!name) return res.status(400).json({ message: "Give the template a name" });

    const cleaned = medicines
      .map((m) => ({
        name: String((m && m.name) || "").trim(),
        dosage: String((m && m.dosage) || "").trim(),
        frequency: String((m && m.frequency) || "").trim(),
        duration: String((m && m.duration) || "").trim(),
      }))
      .filter((m) => m.name);

    if (!cleaned.length) {
      return res.status(400).json({ message: "Add at least one medicine before saving a template" });
    }

    // saving under an existing name replaces it
    const template = await Template.findOneAndUpdate(
      { doctor: req.user.id, name },
      {
        doctor: req.user.id,
        name,
        diagnosis: String(body.diagnosis || "").trim(),
        medicines: cleaned,
        instructions: String(body.instructions || "").trim(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await AuditLog.create({
      actor: req.user.id,
      action: "TEMPLATE_SAVED",
      target: name,
      details: { medicines: cleaned.length },
      result: "success",
    });

    res.status(201).json({
      message: "Template saved",
      template: { id: String(template._id), name: template.name },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to save template", error: error.message });
  }
}

// DELETE /api/clinical/templates/:id
async function deleteTemplate(req, res) {
  try {
    const result = await Template.deleteOne({ _id: req.params.id, doctor: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template deleted" });
  } catch (error) {
    res.status(400).json({ message: "Invalid template id" });
  }
}

module.exports = { medicineSuggestions, listTemplates, saveTemplate, deleteTemplate };
