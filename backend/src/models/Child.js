const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // e.g. C-2201
    name: { type: String, default: "Baby" },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother", required: true },
    dob: { type: Date, required: true },
    sex: { type: String, enum: ["male", "female"] },
    birthWeight: Number,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Child", childSchema);
