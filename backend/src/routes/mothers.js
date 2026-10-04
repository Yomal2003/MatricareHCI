const router = require("express").Router();
const { Mother, Visit, Appointment, Child } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError, pick } = require("../utils/http");

// Shape used by the app lists: `id` is the human-readable code (M-1043).
const toListItem = (m) => ({ id: m.code, _id: m._id, name: m.name, village: m.village, weeks: m.weeks, risk: m.risk, phone: m.phone, status: m.status });
const FIELDS = ["name", "nic", "phone", "dob", "village", "phmArea", "lmp", "edd", "gravida", "risk", "riskFlags", "bloodGroup", "status"];

const findByCodeOrId = (key) => Mother.findOne(/^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() });

router.get("/", authorize("mothers:read"), ah(async (req, res) => {
  const { q = "", risk, area, limit = 50 } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { code: new RegExp(q, "i") }, { phone: new RegExp(q) }, { village: new RegExp(q, "i") }];
  if (risk) filter.risk = risk;
  if (area) filter.phmArea = area;
  if (req.user.role === "phm") filter.assignedPhm = req.user._id; // PHMs only see their own division
  const list = await Mother.find(filter).sort({ risk: 1, name: 1 }).limit(Number(limit));
  res.json(list.map(toListItem));
}));

router.get("/:key", authorize("mothers:read"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key);
  if (!mother) throw new HttpError(404, "Mother not found");
  const [visits, appointments, children] = await Promise.all([
    Visit.find({ mother: mother._id }).sort({ date: -1 }).limit(20),
    Appointment.find({ mother: mother._id }).sort({ date: -1 }),
    Child.find({ mother: mother._id }),
  ]);
  res.json({ mother, visits, appointments, children });
}));

router.post("/", authorize("mothers:write"), ah(async (req, res) => {
  const count = await Mother.countDocuments();
  const mother = await Mother.create({ ...pick(req.body, FIELDS), code: req.body.code || `M-${1000 + count + 1}`, assignedPhm: req.user._id });
  res.status(201).json(mother);
}));

router.patch("/:key", authorize("mothers:write"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key);
  if (!mother) throw new HttpError(404, "Mother not found");
  Object.assign(mother, pick(req.body, FIELDS));
  await mother.save();
  res.json(mother);
}));

module.exports = router;
