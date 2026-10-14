const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, index: true }, // YYYY-MM-DD
    clinic: { type: String, default: "Buttala Clinic" },
    token: { type: Number, required: true },
    name: { type: String, required: true },
    childName: String,
    motherName: String,
    age: String,
    type: String, // "Vaccination" | "Growth" | "Both"
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother" },
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", index: true },
    reason: String,
    status: { type: String, enum: ["waiting", "in-room", "now-serving", "calling", "done", "skipped"], default: "waiting" },
  },
  { timestamps: true },
);
queueSchema.index({ day: 1, clinic: 1, token: 1 }, { unique: true });

module.exports = mongoose.model("QueueEntry", queueSchema);
