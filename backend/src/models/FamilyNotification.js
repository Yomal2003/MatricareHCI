const mongoose = require("mongoose");

const familyNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother", required: true },
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    type: { type: String, enum: ["CONSENT_REQUEST", "APPOINTMENT_REMINDER", "APPOINTMENT_UPDATE"], required: true },
    dedupeKey: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

familyNotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("FamilyNotification", familyNotificationSchema);
