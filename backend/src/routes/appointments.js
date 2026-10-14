const router = require("express").Router();
const mongoose = require("mongoose");
const { Appointment, Mother } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");
const { notifyFamilyAppointmentStatus } = require("../utils/familyAppointmentNotifications");

router.patch("/:id/status", authorize("appointments:outcome"), ah(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Appointment not found");
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  if (Object.keys(body).length !== 1 || !Object.prototype.hasOwnProperty.call(body, "status")) {
    throw new HttpError(403, "PHMs can only change appointment status");
  }
  if (body.status !== "completed" && body.status !== "missed") {
    throw new HttpError(400, "Status must be completed or missed");
  }
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new HttpError(404, "Appointment not found");
  const mother = await Mother.findOne({ _id: appointment.mother, assignedPhm: req.user._id });
  if (!mother) throw new HttpError(404, "Assigned appointment not found");
  if (appointment.status !== "upcoming") throw new HttpError(409, "Only upcoming appointments can be finalized");

  const updated = await Appointment.findOneAndUpdate(
    { _id: appointment._id, mother: mother._id, status: "upcoming" },
    { $set: { status: body.status } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new HttpError(409, "Only upcoming appointments can be finalized");
  await notifyFamilyAppointmentStatus(mother, updated);
  res.json(updated);
}));

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const extractDivision = (u) => {
  const raw = u?.area || u?.clinic || "";
  const cleaned = raw.replace(/\b(clinic|health|moh|center|post|division|office)\b/gi, "").trim();
  return cleaned || raw || "Buttala";
};

// GET /appointments?status=pending&role=nursing etc.
router.get("/", authorize("appointments:read"), ah(async (req, res) => {
  const filter = {};
  let selectedMotherId;
  if (req.query.mother) {
    if (req.user.role !== "phm" && req.user.role !== "nursing" && req.user.role !== "moh") {
      throw new HttpError(403, "Not allowed to request an assigned mother's appointments");
    }
    const key = String(req.query.mother);
    const mother = await Mother.findOne(
      /^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() },
    );
    if (!mother) throw new HttpError(404, "Assigned mother not found");
    selectedMotherId = mother._id;
    filter.mother = selectedMotherId;
  }
  if (req.query.status) {
    if (req.query.status.includes(",")) {
      filter.status = { $in: req.query.status.split(",").map((s) => s.trim()) };
    } else {
      filter.status = req.query.status;
    }
  }
  if (req.query.targetRole) {
    filter.targetRole = req.query.targetRole;
  }

  if (req.user.role === "nursing") {
    // Nurse sees appointments targeted for nursing or clinic visits
    if (!req.query.targetRole) {
      filter.$or = [{ targetRole: "nursing" }, { place: /clinic/i }];
    }
    // Filter by division so all nurses in this division see all division clinic requests
    const division = extractDivision(req.user);
    if (division) {
      const divRegex = new RegExp(escapeRegex(division), "i");
      const divMotherIds = await Mother.find({
        $or: [{ phmArea: divRegex }, { village: divRegex }],
      }).distinct("_id");
      const divCondition = {
        $or: [{ place: divRegex }, { phmArea: divRegex }, { mother: { $in: divMotherIds } }],
      };
      if (filter.$and) filter.$and.push(divCondition);
      else filter.$and = [divCondition];
    }
  } else if (req.user.role === "phm" && !selectedMotherId) {
    // PHM sees appointments for mothers assigned to her
    const assignedMotherIds = await Mother.find({ assignedPhm: req.user._id }).distinct("_id");
    filter.mother = { $in: assignedMotherIds };
  }

  if (req.query.due) {
    filter.status = { $in: ["upcoming", "confirmed"] };
    filter.date = { $lte: new Date(Date.now() + Number(req.query.due) * 864e5) };
  }

  const query = Appointment.find(filter)
    .sort({ date: selectedMotherId ? -1 : 1 })
    .limit(200)
    .populate("mother", "code name village risk phone status weeks");

  res.json(await query);
}));

// Accept / Confirm an appointment request
router.patch("/:id/accept", authorize("appointments:write"), ah(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate("mother");
  if (!appt) throw new HttpError(404, "Appointment not found");

  appt.status = "confirmed";
  if (req.body.date) appt.date = new Date(req.body.date);
  if (req.body.notes) appt.notes = req.body.notes;
  await appt.save();

  // Auto-add to live clinic queue!
  const { QueueEntry, Child } = require("../models");
  const todayStr = new Date().toISOString().slice(0, 10);
  const clinic = req.user.area || req.user.clinic || appt.place || "Buttala Clinic";
  let queueEntry = await QueueEntry.findOne({ appointment: appt._id });

  if (!queueEntry) {
    const child = appt.child
      ? await Child.findById(appt.child)
      : await Child.findOne({ mother: appt.mother._id, "deleteAudit.isDeleted": { $ne: true } });

    const isPregnant = appt.mother.status === "pregnant";
    const childDisplayName = child?.name || (isPregnant ? `Baby of ${appt.mother.name}` : appt.mother.name);
    const ageDisplay = isPregnant
      ? (appt.mother.weeks ? `${appt.mother.weeks}w gestation` : "Pregnancy ANC")
      : (child?.dob ? `${Math.max(1, Math.floor((Date.now() - new Date(child.dob).getTime()) / (30 * 864e5)))}m` : "Under 5");

    const division = extractDivision(req.user);
    const clinicFilter = division ? { clinic: new RegExp(escapeRegex(division), "i") } : { clinic };
    const last = await QueueEntry.findOne({ day: todayStr, ...clinicFilter }).sort({ token: -1 });

    queueEntry = await QueueEntry.create({
      day: todayStr,
      clinic,
      token: (last?.token || 0) + 1,
      name: childDisplayName,
      childName: childDisplayName,
      motherName: appt.mother.name,
      age: ageDisplay,
      type: appt.category === "growth" ? "Growth" : appt.category === "immunization" ? "Vaccination" : "Both",
      reason: appt.type || "Confirmed Clinic Appointment",
      mother: appt.mother._id,
      child: child?._id,
      appointment: appt._id,
      status: "waiting",
    });
  }

  await notifyFamilyAppointmentStatus(appt.mother, appt);
  res.json({ ...appt.toObject(), queueEntry });
}));

// Reject an appointment request with reason
router.patch("/:id/reject", authorize("appointments:write"), ah(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate("mother");
  if (!appt) throw new HttpError(404, "Appointment not found");

  appt.status = "rejected";
  appt.rejectionReason = req.body.reason || "Staff unavailable on requested schedule";
  await appt.save();

  await notifyFamilyAppointmentStatus(appt.mother, appt);
  res.json(appt);
}));

// Reschedule / Set other time for an appointment request
router.patch("/:id/reschedule", authorize("appointments:write"), ah(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate("mother");
  if (!appt) throw new HttpError(404, "Appointment not found");
  if (!req.body.date) throw new HttpError(400, "New appointment date is required");

  appt.date = new Date(req.body.date);
  appt.status = "rescheduled";
  appt.rescheduledNotes = req.body.notes || `Rescheduled by ${req.user.role.toUpperCase()} staff`;
  await appt.save();

  await notifyFamilyAppointmentStatus(appt.mother, appt);
  res.json(appt);
}));

router.post("/", authorize("appointments:write"), ah(async (req, res) => {
  const motherKey = String(req.body.motherCode || req.body.motherId || req.body.mother || "").toUpperCase();
  const mother = await Mother.findOne(/^[0-9a-f]{24}$/i.test(motherKey) ? { _id: motherKey } : { code: motherKey });
  if (!mother) throw new HttpError(400, "Valid motherCode or motherId is required");
  if (req.user.role === "phm" && String(mother.assignedPhm) !== String(req.user._id)) {
    throw new HttpError(403, "You can only schedule appointments for mothers assigned to you");
  }
  const targetRole = req.body.targetRole || (req.user.role === "nursing" ? "nursing" : "phm");
  const isClinicTarget = targetRole === "nursing" || String(req.body.place || "").toLowerCase().includes("clinic");
  const initialStatus = req.body.status || (targetRole === "nursing" && req.user.role !== "nursing" ? "pending" : "confirmed");
  const apptDate = req.body.date ? new Date(req.body.date) : new Date();

  const appt = await Appointment.create({
    type: req.body.type || "Clinic Visit",
    category: req.body.category || "anc",
    targetRole,
    date: apptDate,
    place: req.body.place || "Buttala MOH Clinic",
    notes: req.body.notes || "",
    status: initialStatus,
    mother: mother._id,
    phmArea: mother.phmArea || mother.village,
    clinicAreaId: mother.clinicAreaId || req.user?.clinicAreaId,
    mohOfficeId: mother.mohOfficeId || req.user?.mohOfficeId,
    child: req.body.childId || undefined,
  });

  // If appointment is confirmed for today and at clinic, auto-register in QueueEntry
  const todayStr = new Date().toISOString().slice(0, 10);
  const apptDayStr = apptDate.toISOString().slice(0, 10);
  if (initialStatus === "confirmed" && todayStr === apptDayStr && isClinicTarget) {
    const { QueueEntry, Child } = require("../models");
    const child = req.body.childId
      ? await Child.findOne({ _id: req.body.childId, mother: mother._id })
      : await Child.findOne({ mother: mother._id, "deleteAudit.isDeleted": { $ne: true } });
    const clinic = req.body.place || req.user.area || req.user.clinic || "Buttala Clinic";
    const existingQueueEntry = await QueueEntry.findOne({ appointment: appt._id });
    if (!existingQueueEntry) {
      const division = extractDivision(req.user);
      const clinicFilter = division ? { clinic: new RegExp(escapeRegex(division), "i") } : { clinic };
      const last = await QueueEntry.findOne({ day: todayStr, ...clinicFilter }).sort({ token: -1 });

      const isPregnant = mother.status === "pregnant";
      const childDisplayName = child?.name || (isPregnant ? `Baby of ${mother.name}` : mother.name);
      const ageDisplay = isPregnant
        ? (mother.weeks ? `${mother.weeks}w gestation` : "Pregnancy ANC")
        : (child?.dob ? `${Math.max(1, Math.floor((Date.now() - new Date(child.dob).getTime()) / (30 * 864e5)))}m` : "Under 5");

      await QueueEntry.create({
        day: todayStr,
        clinic,
        token: (last?.token || 0) + 1,
        name: childDisplayName,
        childName: childDisplayName,
        motherName: mother.name,
        age: ageDisplay,
        type: req.body.category === "growth" ? "Growth" : req.body.category === "immunization" ? "Vaccination" : "Both",
        reason: req.body.type || "Scheduled Clinic Visit",
        mother: mother._id,
        child: child?._id,
        appointment: appt._id,
        status: "waiting",
      });
    }
  }

  res.status(201).json(appt);
}));

router.patch("/:id/status", authorize("appointments:write"), ah(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate("mother");
  if (!appt) throw new HttpError(404, "Appointment not found");
  if (req.body.status) appt.status = req.body.status;
  if (req.body.notes) appt.notes = req.body.notes;
  await appt.save();

  // If status is completed and clinical vitals are provided, auto-record visit and update mother vitals
  if (req.body.status === "completed" && (req.body.weight || req.body.bp || req.body.hb || req.body.clinicalNotes || req.body.riskFlags)) {
    const { Visit, Alert } = require("../models");
    const flags = req.body.riskFlags || [];
    await Visit.create({
      type: appt.type || "Clinic Visit",
      mother: appt.mother._id,
      date: new Date(),
      weight: req.body.weight ? Number(req.body.weight) : undefined,
      bp: req.body.bp || undefined,
      hb: req.body.hb ? Number(req.body.hb) : undefined,
      riskFlags: flags,
      notes: req.body.clinicalNotes || req.body.notes || "",
      recordedBy: req.user._id,
    });
    const mother = appt.mother;
    mother.vitals = {
      weight: req.body.weight ? Number(req.body.weight) : mother.vitals?.weight,
      bp: req.body.bp || mother.vitals?.bp,
      hb: req.body.hb ? Number(req.body.hb) : mother.vitals?.hb,
      updatedAt: new Date(),
    };
    if (flags.length) {
      mother.riskFlags = [...new Set([...(mother.riskFlags || []), ...flags])];
      mother.risk = flags.some((f) => ["High BP", "Bleeding", "Reduced movements"].includes(f)) ? "high" : "medium";
      await Alert.create({ mother: mother._id, level: mother.risk === "high" ? "danger" : "warn", reason: flags.join(", "), area: mother.village });
    }
    await mother.save();
  }

  res.json(appt);
}));

router.patch("/:id", authorize("appointments:write"), ah(async (req, res) => {
  const appt = await Appointment.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status, date: req.body.date, notes: req.body.notes } }, { new: true, runValidators: true, omitUndefined: true });
  if (!appt) throw new HttpError(404, "Appointment not found");
  res.json(appt);
}));

module.exports = router;
