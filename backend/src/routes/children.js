const router = require("express").Router();
const { Child, Mother, Immunization, Growth } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

router.get("/", authorize("children:read"), ah(async (req, res) => {
  const filter = {};
  if (req.query.mother) {
    const m = await Mother.findOne({ code: String(req.query.mother).toUpperCase() });
    filter.mother = m?._id;
  }
  res.json(await Child.find(filter).populate("mother", "code name village").sort({ dob: -1 }).limit(100));
}));

router.get("/:code", authorize("children:read"), ah(async (req, res) => {
  const child = await Child.findOne({ code: req.params.code.toUpperCase() }).populate("mother", "code name village");
  if (!child) throw new HttpError(404, "Child not found");
  const [immunizations, growth] = await Promise.all([
    Immunization.find({ child: child._id }).sort({ date: 1 }),
    Growth.find({ child: child._id }).sort({ date: 1 }),
  ]);
  res.json({ child, immunizations, growth });
}));

router.post("/", authorize("children:write"), ah(async (req, res) => {
  const mother = await Mother.findOne({ code: String(req.body.motherCode || "").toUpperCase() });
  if (!mother) throw new HttpError(400, "Valid motherCode is required");
  const count = await Child.countDocuments();
  const child = await Child.create({
    code: req.body.code || `C-${2200 + count + 1}`,
    name: req.body.name || `Baby of ${mother.name.split(" ")[0]}`,
    mother: mother._id, dob: req.body.dob, sex: req.body.sex, birthWeight: req.body.birthWeight,
  });
  if (mother.status === "pregnant") { mother.status = "postnatal"; await mother.save(); }
  res.status(201).json(child);
}));

module.exports = router;
