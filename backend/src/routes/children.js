const router = require("express").Router();
const { Child, Mother, Immunization, Growth } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError, pick } = require("../utils/http");

const findChildByCode = (code) =>
  Child.findOne({ code: String(code).toUpperCase(), "deleteAudit.isDeleted": { $ne: true } })
    .populate({
      path: "mother",
      populate: { path: "assignedPhm", select: "name staffId phone badge area locations qualifications" },
    });

router.get("/", authorize("children:read"), ah(async (req, res) => {
  const filter = { "deleteAudit.isDeleted": { $ne: true } };
  if (req.query.mother) {
    const m = await Mother.findOne({ code: String(req.query.mother).toUpperCase() });
    filter.mother = m?._id;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const children = await Child.find(filter)
    .populate({
      path: "mother",
      populate: { path: "assignedPhm", select: "name staffId phone badge area locations qualifications" },
    })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(children);
}));

router.get("/:code", authorize("children:read"), ah(async (req, res) => {
  const child = await findChildByCode(req.params.code);
  if (!child) throw new HttpError(404, "Child record not found");
  const [immunizations, growth] = await Promise.all([
    Immunization.find({ child: child._id }).sort({ date: 1 }),
    Growth.find({ child: child._id }).sort({ date: 1 }),
  ]);
  res.json({ child, immunizations, growth });
}));

// Register Child (Supports both Born and Unborn/Pregnancy stage)
router.post("/", authorize("children:write"), ah(async (req, res) => {
  const mother = await Mother.findOne({ code: String(req.body.motherCode || "").toUpperCase() });
  if (!mother) throw new HttpError(400, "Valid motherCode is required");

  const isUnborn = req.body.isUnborn === true || req.body.status === "unborn";
  const count = await Child.countDocuments();
  const code = req.body.code || `CH-2024-${String(count + 1).padStart(4, "0")}`;

  const child = await Child.create({
    code,
    name: req.body.name || `Baby of ${mother.name}`,
    mother: mother._id,
    status: isUnborn ? "unborn" : "born",
    isUnborn,
    dob: isUnborn ? undefined : (req.body.dob || new Date()),
    edd: isUnborn ? (req.body.edd || mother.edd) : undefined,
    gestationalWeeks: isUnborn ? (req.body.gestationalWeeks || mother.weeks) : undefined,
    sex: req.body.sex || "unknown",
    birthWeight: req.body.birthWeight ? Number(req.body.birthWeight) : undefined,
    birthLength: req.body.birthLength ? Number(req.body.birthLength) : undefined,
    headCircumference: req.body.headCircumference ? Number(req.body.headCircumference) : undefined,
    deliveryMode: req.body.deliveryMode || "Spontaneous Vaginal",
    birthHospital: req.body.birthHospital || "Monaragala District Base Hospital",
    notes: req.body.notes,
  });

  // If born, transition mother to postnatal; if unborn, keep pregnant
  if (!isUnborn && mother.status === "pregnant") {
    mother.status = "postnatal";
    await mother.save();
  }

  // Create initial birth growth measurement if born and metrics provided
  if (!isUnborn && child.birthWeight) {
    await Growth.create({
      child: child._id,
      weight: child.birthWeight,
      height: child.birthLength,
      date: child.dob || new Date(),
      recordedBy: req.user._id,
    });
  }

  const populated = await findChildByCode(child.code);
  res.status(201).json(populated);
}));

// Record Birth Event (Transitions an unborn pregnancy record to an officially born child)
router.post("/:code/birth", authorize("children:write"), ah(async (req, res) => {
  const child = await findChildByCode(req.params.code);
  if (!child) throw new HttpError(404, "Child record not found");

  const { name, dob, sex, birthWeight, birthLength, headCircumference, deliveryMode, birthHospital, notes } = req.body;
  if (!name || !name.trim()) throw new HttpError(400, "Child's official name is required upon birth");

  child.name = name.trim();
  child.dob = dob ? new Date(dob) : new Date();
  child.sex = sex || "male";
  child.birthWeight = birthWeight ? Number(birthWeight) : child.birthWeight;
  child.birthLength = birthLength ? Number(birthLength) : child.birthLength;
  child.headCircumference = headCircumference ? Number(headCircumference) : child.headCircumference;
  child.deliveryMode = deliveryMode || "Spontaneous Vaginal";
  child.birthHospital = birthHospital || "Monaragala District Base Hospital";
  child.status = "born";
  child.isUnborn = false;
  if (notes) child.notes = notes;
  await child.save();

  // Transition mother from pregnant to postnatal
  const mother = await Mother.findById(child.mother);
  if (mother && mother.status === "pregnant") {
    mother.status = "postnatal";
    await mother.save();
  }

  // Record initial birth growth record
  if (child.birthWeight) {
    await Growth.create({
      child: child._id,
      weight: child.birthWeight,
      height: child.birthLength,
      date: child.dob,
      recordedBy: req.user._id,
    });
  }

  // Record birth BCG & OPV-0 vaccination as per Sri Lankan immunization schedule
  await Immunization.create({
    child: child._id,
    vaccine: "BCG",
    date: child.dob,
    recordedBy: req.user._id,
  });
  await Immunization.create({
    child: child._id,
    vaccine: "OPV-0",
    date: child.dob,
    recordedBy: req.user._id,
  });

  const updated = await findChildByCode(child.code);
  res.json({ message: "Birth recorded successfully. Child record activated.", child: updated });
}));

// Update / Edit Child Details
router.patch("/:code", authorize("children:write"), ah(async (req, res) => {
  const child = await findChildByCode(req.params.code);
  if (!child) throw new HttpError(404, "Child record not found");

  const fields = ["name", "dob", "edd", "sex", "birthWeight", "birthLength", "headCircumference", "deliveryMode", "birthHospital", "notes"];
  Object.assign(child, pick(req.body, fields));
  await child.save();

  const updated = await findChildByCode(child.code);
  res.json(updated);
}));

// Delete Child Record with MANDATORY Reason / Comment
router.delete("/:code", authorize("children:write"), ah(async (req, res) => {
  const reason = (req.body?.reason || req.query?.reason || "").trim();
  if (!reason) {
    throw new HttpError(400, "A mandatory comment/reason is required to delete a clinical child record.");
  }

  const child = await findChildByCode(req.params.code);
  if (!child) throw new HttpError(404, "Child record not found");

  child.deleteAudit = {
    isDeleted: true,
    deletedBy: req.user._id,
    reason,
    deletedAt: new Date(),
  };
  await child.save();

  res.json({
    success: true,
    message: `Record for child ${child.name} (${child.code}) deleted successfully.`,
    reason,
  });
}));

module.exports = router;
