const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother", required: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    type: { type: String, required: true }, // "ANC — 30 weeks", "Penta 2", "Home visit"
    category: { type: String, enum: ["anc", "postnatal", "immunization", "growth", "home-visit", "scan"], default: "anc" },
    targetRole: { type: String, enum: ["nursing", "phm"], default: "phm" },
    date: { type: Date, required: true },
    place: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "upcoming", "rescheduled", "rejected", "completed", "done", "missed", "cancelled"],
      default: "pending",
    },
    phmArea: String,
    clinicAreaId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicArea", index: true },
    mohOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: "MohOffice", index: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    rescheduledNotes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ mohOfficeId: 1, clinicAreaId: 1, date: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
