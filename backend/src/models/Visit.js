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
    localId: { type: String, index: true, sparse: true }, // offline client id, used to dedupe sync
  },
  { timestamps: true },
);

module.exports = mongoose.model("Visit", visitSchema);
