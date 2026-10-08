const { User, FamilyNotification } = require("../models");

async function notifyFamilyAppointmentStatus(mother, appointment) {
  if (!mother.familyNotificationsEnabled) return;

  const familyMembers = mother.family.filter((member) =>
    member.consentStatus === "CONSENTED" && member.userId
  );
  const statusLabel = appointment.status === "completed" ? "completed" : "missed";
  for (const member of familyMembers) {
    const recipient = await User.findOne({ _id: member.userId, role: "family_member", active: true });
    if (!recipient) continue;
    const dedupeKey = `appointment-update:${appointment._id}:${appointment.status}:${member._id}`;
    await FamilyNotification.updateOne(
      { dedupeKey },
      {
        $setOnInsert: {
          recipient: recipient._id,
          mother: mother._id,
          familyMemberId: member._id,
          appointment: appointment._id,
          type: "APPOINTMENT_UPDATE",
          dedupeKey,
          title: "Appointment status updated",
          message: `${mother.name} marked her ${appointment.type} as ${statusLabel}.`,
          read: false,
        },
      },
      { upsert: true },
    );
  }
}

module.exports = { notifyFamilyAppointmentStatus };
