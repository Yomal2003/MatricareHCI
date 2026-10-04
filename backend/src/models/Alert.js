const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother" },
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    level: { type: String, enum: ["danger", "warn"], default: "warn" },
    reason: { type: String, required: true },
    area: String,
    status: { type: String, enum: ["open", "acknowledged", "resolved"], default: "open" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Alert", alertSchema);
