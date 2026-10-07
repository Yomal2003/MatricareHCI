const router = require("express").Router();
const mongoose = require("mongoose");
const { Appointment, FamilyNotification, Mother } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

async function familyContext(user) {
  if (!user.mother || !user.familyMemberId) throw new HttpError(403, "Family member account is not linked");
  const mother = await Mother.findById(user.mother);
  const member = mother?.family.id(user.familyMemberId);
  if (!member || String(member.userId) !== String(user._id)) throw new HttpError(403, "Family member link is no longer active");
  return { mother, member };
}

function appointmentTitle(appointment) {
  if (appointment.category === "anc") return "ANC appointment";
  if (appointment.category === "postnatal") return "Postnatal appointment";
  return "Upcoming appointment";
}

async function syncNotifications(mother, member, user) {
  if (member.consentStatus === "PENDING") {
    await FamilyNotification.updateOne(
      { dedupeKey: `consent:${member._id}` },
      {
        $setOnInsert: {
          recipient: user._id,
          mother: mother._id,
          familyMemberId: member._id,
          type: "CONSENT_REQUEST",
          dedupeKey: `consent:${member._id}`,
          title: "Family consent request",
          message: `${mother.name} added you as ${member.relation} to receive permitted appointment reminders.`,
          read: false,
        },
      },
      { upsert: true },
    );
    return;
  }

  if (member.consentStatus !== "CONSENTED" || !mother.familyNotificationsEnabled) return;

  const appointments = await Appointment.find({
    mother: mother._id,
    status: "upcoming",
    date: { $gte: new Date() },
  }).sort({ date: 1 }).limit(30);

  for (const appointment of appointments) {
    const dedupeKey = `appointment:${member._id}:${appointment._id}`;
    const title = appointmentTitle(appointment);
    const when = appointment.date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const place = appointment.place ? ` Location: ${appointment.place}.` : "";
    await FamilyNotification.updateOne(
      { dedupeKey },
      {
        $set: {
          recipient: user._id,
          mother: mother._id,
          familyMemberId: member._id,
          appointment: appointment._id,
          type: "APPOINTMENT_REMINDER",
          title,
          message: `${mother.name} has an appointment on ${when}.${place}`,
        },
        $setOnInsert: { dedupeKey, read: false },
      },
      { upsert: true },
    );
  }
}

async function permittedNotifications(mother, member, user) {
  let notifications;
  if (member.consentStatus === "PENDING") {
    notifications = await FamilyNotification.find({
      recipient: user._id,
      familyMemberId: member._id,
      type: "CONSENT_REQUEST",
    }).sort({ createdAt: -1 }).limit(10).lean();
  } else {
    if (member.consentStatus !== "CONSENTED" || !mother.familyNotificationsEnabled) return [];
    const permittedAppointments = await Appointment.find({
      mother: mother._id,
      status: { $in: ["upcoming", "completed", "done", "missed"] },
    }).select("_id");
    notifications = await FamilyNotification.find({
      recipient: user._id,
      familyMemberId: member._id,
      type: { $in: ["APPOINTMENT_REMINDER", "APPOINTMENT_UPDATE"] },
      appointment: { $in: permittedAppointments.map((appointment) => appointment._id) },
    }).sort({ createdAt: -1 }).limit(30).lean();
  }
  return notifications.map((notification) => ({
    _id: String(notification._id),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    read: notification.read,
    createdAt: notification.createdAt,
  }));
}

router.get("/summary", authorize("family:self"), ah(async (req, res) => {
  const { mother, member } = await familyContext(req.user);
  await syncNotifications(mother, member, req.user);

  let nextAppointment = null;
  if (member.consentStatus === "CONSENTED" && mother.familyNotificationsEnabled) {
    const appointment = await Appointment.findOne({
      mother: mother._id,
      status: "upcoming",
      date: { $gte: new Date() },
    }).sort({ date: 1 });
    if (appointment) {
      nextAppointment = {
        title: appointmentTitle(appointment),
        date: appointment.date,
        place: appointment.place || "",
      };
    }
  }

  const notifications = await permittedNotifications(mother, member, req.user);
  res.json({
    familyMember: {
      name: member.name || req.user.name,
      relationship: member.relation,
      consentStatus: member.consentStatus || (member.consent ? "CONSENTED" : "PENDING"),
    },
    mother: { name: mother.name },
    nextAppointment,
    notifications,
  });
}));

router.patch("/consent", authorize("family:self"), ah(async (req, res) => {
  const { mother, member } = await familyContext(req.user);
  if (member.consentStatus !== "PENDING") throw new HttpError(409, "This consent request is no longer pending");
  const decision = req.body?.decision;
  if (decision !== "accept" && decision !== "decline") throw new HttpError(400, "Decision must be accept or decline");

  member.consentStatus = decision === "accept" ? "CONSENTED" : "REVOKED";
  member.consent = decision === "accept";
  await mother.save();
  await FamilyNotification.updateOne(
    { dedupeKey: `consent:${member._id}`, recipient: req.user._id },
    { $set: { read: true } },
  );
  res.json({ consentStatus: member.consentStatus });
}));

router.patch("/notifications/:id/read", authorize("family:self"), ah(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Notification not found");
  const notification = await FamilyNotification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { read: true } },
    { new: true },
  );
  if (!notification) throw new HttpError(404, "Notification not found");
  res.json({ id: notification.id, read: notification.read });
}));

module.exports = router;
