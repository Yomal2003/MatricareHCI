const router = require("express").Router();
const { Mother, Visit, Appointment, Child } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError, pick } = require("../utils/http");

// Shape used by the app lists: `id` is the human-readable code (M-1043).
const toListItem = (m) => ({
  id: m.code,
  _id: m._id,
  name: m.name,
  village: m.village,
  weeks: m.weeks,
  risk: m.risk,
  riskFlags: m.riskFlags,
  riskPriority: m.riskPriority,
  riskNotes: m.riskNotes,
  riskFollowUpDate: m.riskFollowUpDate,
  phone: m.phone,
  status: m.status,
});
const FIELDS = [
  "name", "nic", "phone", "dob", "village", "phmArea", "lmp", "edd", "gravida",
  "risk", "riskFlags", "riskPriority", "riskNotes", "riskFollowUpDate", "bloodGroup", "status",
];
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const RISK_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

function pickMotherFields(body) {
  const fields = pick(body, FIELDS);
  if (Object.prototype.hasOwnProperty.call(fields, "risk") && !RISK_LEVELS.has(fields.risk)) {
    throw new HttpError(400, "risk must be low, medium, or high");
  }
  if (Object.prototype.hasOwnProperty.call(fields, "riskFlags") &&
      (!Array.isArray(fields.riskFlags) || fields.riskFlags.some((flag) => typeof flag !== "string"))) {
    throw new HttpError(400, "riskFlags must be an array of strings");
  }
  if (Object.prototype.hasOwnProperty.call(fields, "riskPriority") &&
      fields.riskPriority !== null && !RISK_PRIORITIES.has(fields.riskPriority)) {
    throw new HttpError(400, "riskPriority must be low, medium, high, or urgent");
  }
  if (Object.prototype.hasOwnProperty.call(fields, "riskNotes") &&
      fields.riskNotes !== null && typeof fields.riskNotes !== "string") {
    throw new HttpError(400, "riskNotes must be text");
  }
  if (Object.prototype.hasOwnProperty.call(fields, "riskFollowUpDate")) {
    if (fields.riskFollowUpDate === null || fields.riskFollowUpDate === "") {
      fields.riskFollowUpDate = null;
    } else {
      const date = new Date(fields.riskFollowUpDate);
      if (Number.isNaN(date.getTime())) throw new HttpError(400, "riskFollowUpDate must be a valid date");
      fields.riskFollowUpDate = date;
    }
  }
  return fields;
}

const findByCodeOrId = (key) => Mother.findOne(/^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() });

router.get("/", authorize("mothers:read"), ah(async (req, res) => {
  const { q = "", risk, area, limit = 50 } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { code: new RegExp(q, "i") }, { phone: new RegExp(q) }, { village: new RegExp(q, "i") }];
  if (risk) filter.risk = risk;
  if (area) filter.phmArea = area;
  if (req.query.excludeClosed === "true") filter.status = { $ne: "closed" };
  if (req.user.role === "phm") filter.assignedPhm = req.user._id; // PHMs only see their own division
  const list = await Mother.find(filter).sort({ risk: 1, name: 1 }).limit(Number(limit));
  res.json(list.map(toListItem));
}));

router.get("/:key", authorize("mothers:read"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key);
  if (!mother) throw new HttpError(404, "Mother not found");
  if (req.user.role === "phm" && String(mother.assignedPhm) !== String(req.user._id)) {
    throw new HttpError(404, "Mother not found");
  }
  const [visits, appointments, children] = await Promise.all([
    Visit.find({ mother: mother._id }).sort({ date: -1 }).limit(20),
    Appointment.find({ mother: mother._id }).sort({ date: -1 }),
    Child.find({ mother: mother._id, active: { $ne: false } }),
  ]);
  res.json({ mother, visits, appointments, children });
}));

router.post("/", authorize("mothers:write"), ah(async (req, res) => {
  if (typeof req.body.name !== "string" || !req.body.name.trim()) {
    throw new HttpError(400, "Mother name is required");
  }
  let code = req.body.code;
  if (!code) {
    let nextCode = 1001 + await Mother.countDocuments();
    while (await Mother.exists({ code: `M-${nextCode}` })) nextCode += 1;
    code = `M-${nextCode}`;
  }
  const mother = await Mother.create({
    ...pickMotherFields(req.body),
    name: req.body.name.trim(),
    code,
    assignedPhm: req.user._id,
  });
  res.status(201).json(mother);
}));

router.patch("/:key", authorize("mothers:write"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key);
  if (!mother) throw new HttpError(404, "Mother not found");
  if (String(mother.assignedPhm) !== String(req.user._id)) throw new HttpError(404, "Mother not found");
  Object.assign(mother, pickMotherFields(req.body));
  await mother.save();
  res.json(mother);
}));

router.delete("/:key", authorize("mothers:write"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key);
  if (!mother || String(mother.assignedPhm) !== String(req.user._id)) {
    throw new HttpError(404, "Mother not found");
  }
  mother.status = "closed";
  await mother.save();
  res.json({ deactivated: true, id: mother.code });
}));

module.exports = router;
