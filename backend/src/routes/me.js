// Mother-facing endpoints: a mother can only ever see her own data.
const router = require("express").Router();
const { Mother, Appointment, Visit, Immunization, Child } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

async function myMother(req) {
  const m = await Mother.findById(req.user.mother);
  if (!m) throw new HttpError(404, "No mother profile linked to this account");
  return m;
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

router.get("/records", authorize("self:read"), ah(async (req, res) => {
  const mother = await myMother(req);
  const children = await Child.find({ mother: mother._id });
  const [visits, immunizations] = await Promise.all([
    Visit.find({ mother: mother._id }).sort({ date: -1 }).limit(50),
    Immunization.find({ $or: [{ mother: mother._id }, { child: { $in: children.map((c) => c._id) } }] }).sort({ date: -1 }),
  ]);
  res.json({ vitals: mother.vitals, visits, immunizations, children });
}));

router.get("/family", authorize("self:consent"), ah(async (req, res) => res.json((await myMother(req)).family)));

router.post("/family", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  const { name, relation, phone, consent = true } = req.body;
  if (!name) throw new HttpError(400, "name is required");
  mother.family.push({ name, relation, phone, consent });
  await mother.save();
  res.status(201).json(mother.family);
}));

router.patch("/family/:fid", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  const member = mother.family.id(req.params.fid);
  if (!member) throw new HttpError(404, "Family member not found");
  if (typeof req.body.consent === "boolean") member.consent = req.body.consent;
  await mother.save();
  res.json(mother.family);
}));

router.delete("/family/:fid", authorize("self:consent"), ah(async (req, res) => {
  const mother = await myMother(req);
  mother.family.pull(req.params.fid);
  await mother.save();
  res.json(mother.family);
}));

module.exports = router;
