const mongoose = require("mongoose");

const growthSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    date: { type: Date, default: Date.now },
    weight: Number, // kg
    height: Number, // cm
    muac: Number,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    localId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Growth", growthSchema);
