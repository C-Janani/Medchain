const mongoose = require("mongoose");

// A doctor's own saved prescription template (medicines + note) for a diagnosis.
const templateSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    diagnosis: { type: String, default: "", trim: true },
    medicines: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          dosage: { type: String, default: "", trim: true },
          frequency: { type: String, default: "", trim: true },
          duration: { type: String, default: "", trim: true },
          _id: false,
        },
      ],
      validate: { validator: (v) => v.length > 0, message: "At least one medicine is required" },
    },
    instructions: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

templateSchema.index({ doctor: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Template", templateSchema);
