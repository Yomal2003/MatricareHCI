const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother" },
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    level: { type: String, enum: ["danger", "warn"], default: "warn" },
    reason: { type: String, required: true },
    area: String,
    status: { type: String, enum: ["open", "acknowledged", "resolved"], default: "open" },
    clinicAreaId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicArea", index: true },
    mohOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: "MohOffice", index: true },
    flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

alertSchema.index({ mohOfficeId: 1, status: 1, level: 1, createdAt: -1 });
alertSchema.index({ mohOfficeId: 1, clinicAreaId: 1, status: 1 });

module.exports = mongoose.model("Alert", alertSchema);
