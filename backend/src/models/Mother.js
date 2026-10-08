const mongoose = require("mongoose");

const familyMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    relation: { type: String, trim: true },
    phone: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    consent: { type: Boolean, default: false },
    consentStatus: {
      type: String,
      enum: ["PENDING", "CONSENTED", "REVOKED"],
      default: function () { return this.consent ? "CONSENTED" : "PENDING"; },
    },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

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
    familyNotificationsEnabled: { type: Boolean, default: false },
    family: [familyMemberSchema],
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
