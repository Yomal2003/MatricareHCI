const mongoose = require("mongoose");

// Home visits (PHM) and clinic visits (Nursing).
const visitSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["home-visit", "anc", "postnatal", "clinic"], required: true },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother", required: true },
    date: { type: Date, default: Date.now },
    weight: Number,
    bp: String,
    hb: Number,
    riskFlags: [String],
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clinicAreaId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicArea", index: true },
    mohOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: "MohOffice", index: true },
    localId: { type: String, index: true, sparse: true }, // offline client id, used to dedupe sync
  },
  { timestamps: true },
);

visitSchema.index({ mohOfficeId: 1, clinicAreaId: 1, date: -1 });

module.exports = mongoose.model("Visit", visitSchema);
