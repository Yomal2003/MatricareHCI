const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // e.g. C-2201 or CH-2024-0088
    name: { type: String, default: "Baby" },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother", required: true },
    status: { type: String, enum: ["unborn", "born"], default: "born" },
    isUnborn: { type: Boolean, default: false },
    dob: { type: Date }, // Required once born; optional when unborn
    edd: { type: Date }, // Expected delivery date for unborn babies
    gestationalWeeks: Number,
    sex: { type: String, enum: ["male", "female", "unknown"], default: "unknown" },
    birthWeight: Number, // in kg
    birthLength: Number, // in cm
    headCircumference: Number, // in cm
    deliveryMode: { type: String, default: "Spontaneous Vaginal" },
    birthHospital: { type: String, default: "Monaragala District Base Hospital" },
    notes: String,
    deleteAudit: {
      isDeleted: { type: Boolean, default: false },
      deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      deletedAt: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Child", childSchema);

