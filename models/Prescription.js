const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    dosage: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    frequency: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    diagnosis: {
      type: String,
      default: "",
      trim: true,
    },

    medicines: {
      type: [medicineSchema],
      required: true,
      validate: {
        validator: (value) => value.length > 0,
        message: "At least one medicine is required",
      },
    },

    instructions: {
      type: String,
      default: "",
      trim: true,
    },

    aiAnalysis: {
      summary: {
        type: String,
        default: "",
      },

      warnings: {
        type: [
          {
            severity: String,
            category: String,
            medicines: [String],
            reason: String,
          },
        ],
        default: [],
      },
    },

    // true when the doctor chose to issue despite serious (high) warnings
    warningsAcknowledged: {
      type: Boolean,
      default: false,
    },

    previousMedicinesSnapshot: {
      type: [String],
      default: [],
    },

    qrToken: {
      type: String,
      unique: true,
      sparse: true,
    },

    blockchain: {
      blockIndex: Number,
      blockHash: String,
    },

    status: {
      type: String,
      enum: ["active", "dispensed", "cancelled"],
      default: "active",
    },

    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    dispensedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);