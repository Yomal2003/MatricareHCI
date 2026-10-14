const mongoose = require("mongoose");

const growthSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    date: { type: Date, default: Date.now },
    weight: Number, // kg
    height: Number, // cm
    headCircumference: Number, // cm
    muac: Number,
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clinicAreaId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicArea", index: true },
    mohOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: "MohOffice", index: true },
    localId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

growthSchema.index({ mohOfficeId: 1, clinicAreaId: 1, date: -1 });

module.exports = mongoose.model("Growth", growthSchema);
