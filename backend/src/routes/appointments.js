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

// GET /appointments?due=7  → PHM follow-up list (overdue + next N days)
router.get("/", authorize("appointments:read"), ah(async (req, res) => {
  const filter = {};
  let selectedMotherId;
  if (req.query.mother) {
    if (req.user.role !== "phm") throw new HttpError(403, "Only PHMs can request an assigned mother's appointments");
    const key = String(req.query.mother);
    const mother = await Mother.findOne(
      /^[0-9a-f]{24}$/i.test(key) ? { _id: key, assignedPhm: req.user._id } : { code: key.toUpperCase(), assignedPhm: req.user._id },
    );
    if (!mother) throw new HttpError(404, "Assigned mother not found");
    selectedMotherId = mother._id;
    filter.mother = selectedMotherId;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.due) {
    filter.status = "upcoming";
    filter.date = { $lte: new Date(Date.now() + Number(req.query.due) * 864e5) };
  }
  if (req.user.role === "phm" && !selectedMotherId) {
    filter.mother = { $in: await Mother.find({ assignedPhm: req.user._id }).distinct("_id") };
  }
  const query = Appointment.find(filter).sort({ date: selectedMotherId ? -1 : 1 }).limit(200);
  if (req.user.role === "phm") {
    res.json(await query.select("_id mother type category date place status").populate("mother", "code name village").lean());
    return;
  }
  res.json(await query.populate("mother", "code name village risk"));
}));

router.post("/", authorize("appointments:write"), ah(async (req, res) => {
  const mother = await Mother.findOne({ code: String(req.body.motherCode || "").toUpperCase() });
  if (!mother) throw new HttpError(400, "Valid motherCode is required");
  const appt = await Appointment.create({ ...req.body, mother: mother._id, phmArea: mother.phmArea });
  res.status(201).json(appt);
}));

router.patch("/:id", authorize("appointments:write"), ah(async (req, res) => {
  const appt = await Appointment.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status, date: req.body.date } }, { new: true, runValidators: true, omitUndefined: true });
  if (!appt) throw new HttpError(404, "Appointment not found");
  res.json(appt);
}));

module.exports = router;
