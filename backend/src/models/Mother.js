const mongoose = require("mongoose");

const motherSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // e.g. M-1042
    name: { type: String, required: true, trim: true },
    nic: String,
    phone: String,
    dob: Date,
    village: String,
    phmArea: String,
    lmp: Date, // last menstrual period
    edd: Date, // expected delivery date
    gravida: { type: Number, default: 1 },
    risk: { type: String, enum: ["low", "medium", "high"], default: "low" },
    riskFlags: [String],
    bloodGroup: String,
    assignedPhm: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pregnant", "postnatal", "closed"], default: "pregnant" },
    family: [
      {
        name: String,
        relation: String,
        phone: String,
        consent: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    vitals: { weight: Number, bp: String, hb: Number, updatedAt: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

motherSchema.virtual("weeks").get(function () {
  if (!this.lmp) return null;
  return Math.max(0, Math.floor((Date.now() - this.lmp.getTime()) / (7 * 864e5)));
});
motherSchema.index({ name: "text", code: "text", village: "text" });

module.exports = mongoose.model("Mother", motherSchema);
