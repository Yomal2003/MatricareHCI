const router = require("express").Router();
const { Child, Mother, Immunization, Growth } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const findMother = (key) => Mother.findOne(/^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() });

async function findManagedChild(key, user) {
  const child = await Child.findOne(/^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() });
  if (!child || child.active === false) throw new HttpError(404, "Child not found");
  const mother = await Mother.findById(child.mother);
  if (!mother || (user.role === "phm" && String(mother.assignedPhm) !== String(user._id))) {
    throw new HttpError(404, "Child not found");
  }
  return { child, mother };
}

router.get("/", authorize("children:read"), ah(async (req, res) => {
  const filter = { active: { $ne: false } };
  if (req.query.mother) {
    const mother = await findMother(String(req.query.mother));
    if (!mother || (req.user.role === "phm" && String(mother.assignedPhm) !== String(req.user._id))) {
      throw new HttpError(404, "Mother not found");
    }
    filter.mother = mother._id;
  } else if (req.user.role === "phm") {
    const assignedMothers = await Mother.find({ assignedPhm: req.user._id }).select("_id");
    filter.mother = { $in: assignedMothers.map((mother) => mother._id) };
  }
  res.json(await Child.find(filter).populate("mother", "code name village").sort({ dob: -1 }).limit(100));
}));

router.get("/:code", authorize("children:read"), ah(async (req, res) => {
  const { child } = await findManagedChild(req.params.code, req.user);
  await child.populate("mother", "code name village");
  const [immunizations, growth] = await Promise.all([
    Immunization.find({ child: child._id }).sort({ date: 1 }),
    Growth.find({ child: child._id }).sort({ date: 1 }),
  ]);
  res.json({ child, immunizations, growth });
}));

router.post("/", authorize("children:write"), ah(async (req, res) => {
  if (req.user.role === "phm" && (typeof req.body.name !== "string" || !req.body.name.trim())) {
    throw new HttpError(400, "Baby name is required");
  }
  if (!req.body.dob || Number.isNaN(new Date(req.body.dob).getTime())) {
    throw new HttpError(400, "A valid date of birth is required");
  }
  const mother = await findMother(String(req.body.motherCode || ""));
  if (!mother || (req.user.role === "phm" && String(mother.assignedPhm) !== String(req.user._id))) {
    throw new HttpError(400, "Valid assigned motherCode is required");
  }
  let code = req.body.code;
  if (!code) {
    let nextCode = 2201 + await Child.countDocuments();
    while (await Child.exists({ code: `C-${nextCode}` })) nextCode += 1;
    code = `C-${nextCode}`;
  }
  const child = await Child.create({
    code,
    name: typeof req.body.name === "string" && req.body.name.trim()
      ? req.body.name.trim()
      : `Baby of ${mother.name.split(" ")[0]}`,
    mother: mother._id,
    dob: req.body.dob,
    sex: req.body.sex || undefined,
    birthWeight: req.body.birthWeight === "" || req.body.birthWeight == null ? undefined : Number(req.body.birthWeight),
  });
  if (mother.status === "pregnant") { mother.status = "postnatal"; await mother.save(); }
  res.status(201).json(child);
}));

router.patch("/:code", authorize("children:write"), ah(async (req, res) => {
  const { child } = await findManagedChild(req.params.code, req.user);
  const allowed = ["name", "dob", "sex", "birthWeight"];
  const fields = Object.fromEntries(allowed
    .filter((key) => Object.prototype.hasOwnProperty.call(req.body, key))
    .map((key) => [key, req.body[key]]));
  if (!Object.keys(fields).length) throw new HttpError(400, "No supported child fields were provided");
  if (Object.prototype.hasOwnProperty.call(fields, "name")) {
    if (typeof fields.name !== "string" || !fields.name.trim()) throw new HttpError(400, "Baby name is required");
    fields.name = fields.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(fields, "dob")) {
    if (!fields.dob || Number.isNaN(new Date(fields.dob).getTime())) throw new HttpError(400, "A valid date of birth is required");
    fields.dob = new Date(fields.dob);
  }
  if (Object.prototype.hasOwnProperty.call(fields, "birthWeight")) {
    if (fields.birthWeight === "" || fields.birthWeight === null) fields.birthWeight = undefined;
    else {
      fields.birthWeight = Number(fields.birthWeight);
      if (!Number.isFinite(fields.birthWeight)) throw new HttpError(400, "Birth weight must be a valid number");
    }
  }
  if (Object.prototype.hasOwnProperty.call(fields, "sex") && !["", null, "male", "female"].includes(fields.sex)) {
    throw new HttpError(400, "Gender must be male or female");
  }
  if (fields.sex === "" || fields.sex === null) fields.sex = undefined;
  Object.assign(child, fields);
  await child.save();
  res.json(child);
}));

router.delete("/:code", authorize("children:write"), ah(async (req, res) => {
  const { child } = await findManagedChild(req.params.code, req.user);
  child.active = false;
  await child.save();
  res.json({ deactivated: true, id: child.code });
}));

module.exports = router;
