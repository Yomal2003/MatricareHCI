// Mother-facing endpoints: a mother can only ever see her own data.
const router = require("express").Router();
const mongoose = require("mongoose");
const { Mother, Appointment, Visit, Immunization, Child, User, FamilyNotification } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const FAMILY_RELATIONS = ["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister", "Guardian", "Other"];

async function myMother(req) {
  const m = await Mother.findById(req.user.mother);
  if (!m) throw new HttpError(404, "No mother profile linked to this account");
  return m;
}

function normalizePhone(value) {
  const phone = String(value ?? "").trim().replace(/[\s().-]/g, "");
  if (/^\+947\d{8}$/.test(phone)) return phone;
  if (/^947\d{8}$/.test(phone)) return `+${phone}`;
  if (/^07\d{8}$/.test(phone)) return `+94${phone.slice(1)}`;
  if (/^7\d{8}$/.test(phone)) return `+94${phone}`;
  return null;
}

function phoneAliases(phone) {
  const national = phone.slice(3);
  return [phone, `0${national}`, phone.slice(1), national];
}

function serializeFamily(family) {
  return family.map((member) => {
    const result = member.toObject();
    delete result.userId;
    result.consentStatus = member.consentStatus || (member.consent ? "CONSENTED" : "PENDING");
    result.phone = normalizePhone(member.phone) || member.phone;
    return result;
  });
}

function ensureUniquePhone(family, phone, excludeId) {
  const duplicate = family.some((member) =>
    String(member._id) !== String(excludeId || "") && normalizePhone(member.phone) === phone
  );
  if (duplicate) throw new HttpError(409, "A family member with this phone number already exists");
}

function validateFamilyInput(body, { partial = false } = {}) {
  body = body && typeof body === "object" ? body : {};
  const fields = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) throw new HttpError(400, "Name cannot be empty");
    fields.name = body.name.trim();
  }
  if (!partial || body.relation !== undefined) {
    if (!FAMILY_RELATIONS.includes(body.relation)) throw new HttpError(400, "Select a valid family relationship");
    fields.relation = body.relation;
  }
  if (!partial || body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new HttpError(400, "Enter a valid Sri Lankan mobile number");
    fields.phone = phone;
  }
  return fields;
}

router.get("/summary", authorize("self:read"), ah(async (req, res) => {
  const mother = await myMother(req);
  const next = await Appointment.findOne({ mother: mother._id, status: "upcoming", date: { $gte: new Date() } }).sort({ date: 1 });
  res.json({
    mother,
    weeks: mother.weeks,
    nextAppt: next && { date: next.date.toISOString().slice(0, 10), place: next.place, type: next.type },
  });
}));

router.get("/appointments", authorize("self:read"), ah(async (req, res) => {
  const mother = await myMother(req);
  res.json(await Appointment.find({ mother: mother._id }).sort({ date: -1 }));
}));

router.post("/appointments", authorize("self:appointments"), ah(async (req, res) => {
  const mother = await myMother(req);
  const { type, date, place, notes, category } = req.body || {};
  const appointmentDate = new Date(date);
  if (typeof type !== "string" || !type.trim() || type.trim().length > 120) throw new HttpError(400, "Appointment type must be 1 to 120 characters");
  if (typeof date !== "string" || !date.trim() || Number.isNaN(appointmentDate.getTime())) throw new HttpError(400, "A valid appointment date and time are required");
  if (place !== undefined && typeof place !== "string") throw new HttpError(400, "Clinic must be text");
  if (notes !== undefined && typeof notes !== "string") throw new HttpError(400, "Notes must be text");
  if (typeof place === "string" && place.trim().length > 240) throw new HttpError(400, "Clinic must be 240 characters or fewer");
  if (typeof notes === "string" && notes.trim().length > 1000) throw new HttpError(400, "Notes must be 1000 characters or fewer");

  const appointment = await Appointment.create({
    mother: mother._id,
    type: type.trim(),
    category: ["anc", "postnatal", "immunization", "growth", "home-visit", "scan"].includes(category) ? category : "anc",
    date: appointmentDate,
    place: typeof place === "string" ? place.trim() : "",
    notes: typeof notes === "string" ? notes.trim() : "",
    phmArea: mother.phmArea,
    status: "upcoming",
  });
  res.status(201).json(appointment);
}));

router.patch("/appointments/:id", authorize("self:appointments"), ah(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Appointment not found");
  const mother = await myMother(req);
  const appointment = await Appointment.findOne({ _id: req.params.id, mother: mother._id });
  if (!appointment) throw new HttpError(404, "Appointment not found");
  if (appointment.status !== "upcoming") throw new HttpError(409, "Only upcoming appointments can be changed");

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (body.status !== undefined) {
    if (!["completed", "missed", "cancelled"].includes(body.status)) {
      throw new HttpError(400, "Status must be completed, missed, or cancelled");
    }
    appointment.status = body.status;
  } else {
    if (body.type !== undefined) {
      if (typeof body.type !== "string" || !body.type.trim() || body.type.trim().length > 120) throw new HttpError(400, "Appointment type must be 1 to 120 characters");
      appointment.type = body.type.trim();
    }
    if (body.date !== undefined) {
      const date = new Date(body.date);
      if (typeof body.date !== "string" || !body.date.trim() || Number.isNaN(date.getTime())) throw new HttpError(400, "A valid appointment date and time is required");
      appointment.date = date;
    }
    if (body.place !== undefined) {
      if (typeof body.place !== "string") throw new HttpError(400, "Clinic must be text");
      if (body.place.trim().length > 240) throw new HttpError(400, "Clinic must be 240 characters or fewer");
      appointment.place = body.place.trim();
    }
    if (body.notes !== undefined) {
      if (typeof body.notes !== "string") throw new HttpError(400, "Notes must be text");
      if (body.notes.trim().length > 1000) throw new HttpError(400, "Notes must be 1000 characters or fewer");
      appointment.notes = body.notes.trim();
    }
    if (!["type", "date", "place", "notes"].some((field) => body[field] !== undefined)) {
      throw new HttpError(400, "Appointment changes are required");
    }
  }
  await appointment.save();

  if (["completed", "missed"].includes(appointment.status) && mother.familyNotificationsEnabled) {
    const familyMembers = mother.family.filter((member) =>
      member.consentStatus === "CONSENTED" && member.userId
    );
    for (const member of familyMembers) {
      const recipient = await User.findOne({ _id: member.userId, role: "family_member", active: true });
      if (!recipient) continue;
      const statusLabel = appointment.status === "completed" ? "completed" : "missed";
      await FamilyNotification.updateOne(
        { dedupeKey: `appointment-update:${appointment._id}:${appointment.status}:${member._id}` },
        {
          $setOnInsert: {
            recipient: recipient._id,
            mother: mother._id,
            familyMemberId: member._id,
            appointment: appointment._id,
            type: "APPOINTMENT_UPDATE",
            dedupeKey: `appointment-update:${appointment._id}:${appointment.status}:${member._id}`,
            title: "Appointment status updated",
            message: `${mother.name} marked her ${appointment.type} as ${statusLabel}.`,
            read: false,
          },
        },
        { upsert: true },
      );
    }
  }
  res.json(appointment);
}));

router.get("/records", authorize("self:read"), ah(async (req, res) => {
  const mother = await myMother(req);
  const children = await Child.find({ mother: mother._id });
  const [visits, immunizations] = await Promise.all([
    Visit.find({ mother: mother._id }).sort({ date: -1 }).limit(50),
    Immunization.find({ $or: [{ mother: mother._id }, { child: { $in: children.map((c) => c._id) } }] }).sort({ date: -1 }),
  ]);
  res.json({ vitals: mother.vitals, visits, immunizations, children });
}));

router.get("/family", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  res.json(serializeFamily(mother.family));
}));

router.post("/family", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  const fields = validateFamilyInput(req.body);
  ensureUniquePhone(mother.family, fields.phone);
  if (!fields.name) throw new HttpError(400, "Name is required");
  if (await User.exists({ phone: { $in: phoneAliases(fields.phone) } })) {
    throw new HttpError(409, "This phone number is already linked to an account");
  }

  const member = mother.family.create({ ...fields, consent: false, consentStatus: "PENDING" });
  let account;
  try {
    account = await User.create({
      role: "family_member",
      name: fields.name,
      phone: fields.phone,
      mother: mother._id,
      familyMemberId: member._id,
    });
    member.userId = account._id;
    mother.family.push(member);
    await FamilyNotification.create({
      recipient: account._id,
      mother: mother._id,
      familyMemberId: member._id,
      type: "CONSENT_REQUEST",
      dedupeKey: `consent:${member._id}`,
      title: "Family consent request",
      message: `${mother.name} added you as ${member.relation} to receive permitted appointment reminders.`,
    });
    await mother.save();
  } catch (error) {
    if (account) await User.deleteOne({ _id: account._id });
    await FamilyNotification.deleteOne({ dedupeKey: `consent:${member._id}` });
    throw error;
  }
  res.status(201).json(serializeFamily(mother.family));
}));

router.get("/family/preferences", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  res.json({ notificationsEnabled: mother.familyNotificationsEnabled });
}));

router.patch("/family/preferences", authorize("self:consent"), ah(async (req, res) => {
  const notificationsEnabled = req.body && req.body.notificationsEnabled;
  if (typeof notificationsEnabled !== "boolean") {
    throw new HttpError(400, "notificationsEnabled must be a boolean");
  }
  const mother = await myMother(req);
  mother.familyNotificationsEnabled = notificationsEnabled;
  await mother.save();
  res.json({ notificationsEnabled: mother.familyNotificationsEnabled });
}));

router.patch("/family/:fid", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  if (!mongoose.isValidObjectId(req.params.fid)) throw new HttpError(404, "Family member not found");
  const member = mother.family.id(req.params.fid);
  if (!member) throw new HttpError(404, "Family member not found");
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const fields = validateFamilyInput(body, { partial: true });
  if (fields.phone !== undefined) ensureUniquePhone(mother.family, fields.phone, member._id);
  if (Object.keys(fields).length === 0 && body.consentStatus === undefined && typeof body.consent !== "boolean") {
    throw new HttpError(400, "At least one family member field is required");
  }
  Object.assign(member, fields);
  const account = member.userId ? await User.findById(member.userId) : null;
  if (account && fields.phone) {
    const conflictingAccount = await User.exists({
      _id: { $ne: account._id },
      phone: { $in: phoneAliases(fields.phone) },
    });
    if (conflictingAccount) throw new HttpError(409, "This phone number is already linked to an account");
  }

  if (body.consentStatus !== undefined) {
    if (body.consentStatus !== "REVOKED") throw new HttpError(403, "Only the family member can accept or decline consent");
    member.consentStatus = "REVOKED";
    member.consent = false;
  } else if (typeof body.consent === "boolean") {
    if (body.consent) throw new HttpError(403, "Only the family member can accept consent");
    member.consent = false;
    member.consentStatus = "REVOKED";
  }
  member.updatedAt = new Date();
  await mother.save();
  if (account) {
    if (fields.name) account.name = fields.name;
    if (fields.phone) account.phone = fields.phone;
    await account.save();
  }
  if (member.userId) {
    await FamilyNotification.deleteMany({
      recipient: member.userId,
      familyMemberId: member._id,
      type: "APPOINTMENT_REMINDER",
    });
  }
  res.json(serializeFamily(mother.family));
}));

router.delete("/family/:fid", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  if (!mongoose.isValidObjectId(req.params.fid)) throw new HttpError(404, "Family member not found");
  const member = mother.family.id(req.params.fid);
  if (!member) throw new HttpError(404, "Family member not found");
  const removedUserId = member.userId;
  const removedMemberId = member._id;
  mother.family.pull(req.params.fid);
  await mother.save();
  if (removedUserId) {
    await User.deleteOne({ _id: removedUserId, role: "family_member" });
    await FamilyNotification.deleteMany({ recipient: removedUserId, familyMemberId: removedMemberId });
  }
  res.json(serializeFamily(mother.family));
}));

module.exports = router;
