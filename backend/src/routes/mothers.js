const router = require("express").Router();
const { Mother, Visit, Appointment, Child, User } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError, pick } = require("../utils/http");

// Shape used by the app lists: `id` is the human-readable code (M-1043).
const toListItem = (m) => ({
  id: m.code,
  _id: m._id,
  name: m.name,
  village: m.village,
  phmArea: m.phmArea,
  weeks: m.weeks,
  risk: m.risk,
  phone: m.phone,
  status: m.status,
  assignedPhm: m.assignedPhm,
});
const FIELDS = ["name", "nic", "phone", "dob", "village", "phmArea", "lmp", "edd", "gravida", "risk", "riskFlags", "bloodGroup", "status", "assignedPhm"];

const findByCodeOrId = (key) =>
  Mother.findOne(/^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() });

router.get("/", authorize("mothers:read"), ah(async (req, res) => {
  const { q = "", risk, area, limit = 50 } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { code: new RegExp(q, "i") }, { phone: new RegExp(q) }, { village: new RegExp(q, "i") }];
  if (risk) filter.risk = risk;
  if (area) filter.phmArea = area;
  if (req.user.role === "phm") filter.assignedPhm = req.user._id; // PHMs only see their own division
  const list = await Mother.find(filter)
    .populate("assignedPhm", "name staffId phone badge area locations qualifications")
    .sort({ risk: 1, name: 1 })
    .limit(Number(limit));
  res.json(list.map(toListItem));
}));

router.get("/:key", authorize("mothers:read"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key).populate("assignedPhm", "name staffId phone badge area locations qualifications");
  if (!mother) throw new HttpError(404, "Mother not found");
  const [visits, appointments, children] = await Promise.all([
    Visit.find({ mother: mother._id, "deleteAudit.isDeleted": { $ne: true } }).sort({ date: -1 }).limit(20),
    Appointment.find({ mother: mother._id }).sort({ date: -1 }),
    Child.find({ mother: mother._id, "deleteAudit.isDeleted": { $ne: true } }),
  ]);
  res.json({ mother, visits, appointments, children });
}));

router.post("/", authorize("mothers:write"), ah(async (req, res) => {
  const count = await Mother.countDocuments();
  let assignedPhmId = req.body.assignedPhm;

  // If no midwife explicitly selected, intelligently auto-suggest & assign based on area / village
  if (!assignedPhmId) {
    if (req.user.role === "phm") {
      assignedPhmId = req.user._id;
    } else {
      const targetArea = req.body.phmArea || req.body.village;
      if (targetArea) {
        const matchingPhm = await User.findOne({
          role: "phm",
          $or: [
            { area: new RegExp(`^${targetArea}$`, "i") },
            { locations: { $in: [new RegExp(`^${targetArea}$`, "i")] } },
          ],
        });
        if (matchingPhm) assignedPhmId = matchingPhm._id;
      }
      if (!assignedPhmId) {
        const fallbackPhm = await User.findOne({ role: "phm", active: true });
        if (fallbackPhm) assignedPhmId = fallbackPhm._id;
      }
    }
  }

  const mother = await Mother.create({
    ...pick(req.body, FIELDS),
    code: req.body.code || `M-${1000 + count + 1}`,
    assignedPhm: assignedPhmId,
  });

  // Also create linked User account for mother login (if phone provided and not yet registered)
  if (mother.phone && !(await User.exists({ phone: mother.phone }))) {
    await User.create({
      role: "mother",
      name: mother.name,
      phone: mother.phone,
      badge: `Patient · ${mother.village || mother.phmArea || "Buttala"}`,
      mother: mother._id,
      area: mother.phmArea || mother.village,
    });
  }

  const populated = await Mother.findById(mother._id).populate("assignedPhm", "name staffId phone badge area locations qualifications");
  res.status(201).json(populated);
}));

router.patch("/:key", authorize("mothers:write"), ah(async (req, res) => {
  const mother = await findByCodeOrId(req.params.key);
  if (!mother) throw new HttpError(404, "Mother not found");
  Object.assign(mother, pick(req.body, FIELDS));
  await mother.save();
  const populated = await Mother.findById(mother._id).populate("assignedPhm", "name staffId phone badge area locations qualifications");
  res.json(populated);
}));

module.exports = router;
