const router = require("express").Router();
const { QueueEntry } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const today = () => new Date().toISOString().slice(0, 10);
const clinicOf = (req) => req.user.area || "Buttala Clinic";

router.get("/", authorize("queue:read"), ah(async (req, res) => {
  res.json(await QueueEntry.find({ day: req.query.day || today(), clinic: clinicOf(req) }).sort({ token: 1 }));
}));

router.post("/", authorize("queue:write"), ah(async (req, res) => {
  const last = await QueueEntry.findOne({ day: today(), clinic: clinicOf(req) }).sort({ token: -1 });
  const entry = await QueueEntry.create({ day: today(), clinic: clinicOf(req), token: (last?.token || 0) + 1, name: req.body.name, reason: req.body.reason, mother: req.body.mother, child: req.body.child });
  res.status(201).json(entry);
}));

// PATCH /queue/:id { status } — or { status: "next" } to advance waiting → in-room → done
router.patch("/:id", authorize("queue:write"), ah(async (req, res) => {
  const entry = await QueueEntry.findById(req.params.id);
  if (!entry) throw new HttpError(404, "Queue entry not found");
  entry.status = req.body.status === "next" ? (entry.status === "waiting" ? "in-room" : "done") : req.body.status;
  await entry.save();
  res.json(entry);
}));

module.exports = router;
