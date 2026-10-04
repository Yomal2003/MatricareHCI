const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother", required: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    type: { type: String, required: true }, // "ANC — 30 weeks", "Penta 2", "Home visit"
    category: { type: String, enum: ["anc", "postnatal", "immunization", "growth", "home-visit", "scan"], default: "anc" },
    date: { type: Date, required: true },
    place: String,
    status: { type: String, enum: ["upcoming", "done", "missed", "cancelled"], default: "upcoming" },
    phmArea: String,
  },
  { timestamps: true },
);
appointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
