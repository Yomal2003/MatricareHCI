const router = require("express").Router();
const { Appointment, Mother } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

// GET /appointments?due=7  → PHM follow-up list (overdue + next N days)
router.get("/", authorize("appointments:read"), ah(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.due) {
    filter.status = "upcoming";
    filter.date = { $lte: new Date(Date.now() + Number(req.query.due) * 864e5) };
  }
  if (req.user.role === "phm") filter.mother = { $in: await Mother.find({ assignedPhm: req.user._id }).distinct("_id") };
  res.json(await Appointment.find(filter).populate("mother", "code name village risk").sort({ date: 1 }).limit(200));
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
