const mongoose = require("mongoose");

const immunizationSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother" }, // for TT doses given to mothers
    vaccine: { type: String, required: true }, // BCG, OPV, Penta, MMR, JE, DT, TT1...
    dose: Number,
    batch: String,
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    localId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Immunization", immunizationSchema);
