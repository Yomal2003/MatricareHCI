const mongoose = require("mongoose");

const immunizationSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother" }, // for TT doses given to mothers
    vaccine: { type: String, required: true }, // BCG, OPV, Penta, MMR, JE, DT, TT1...
    dose: Number,
    batch: String,
    expiryDate: String,
    notes: String,
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clinicAreaId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicArea", index: true },
    mohOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: "MohOffice", index: true },
    localId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

immunizationSchema.index({ mohOfficeId: 1, clinicAreaId: 1, date: -1 });

module.exports = mongoose.model("Immunization", immunizationSchema);
