// Clinical data entry + offline batch sync.
const router = require("express").Router();
const { Mother, Child, Visit, Immunization, Growth, Alert } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const DANGER = ["High BP", "Bleeding", "Reduced movements"];

async function saveVisit(item, user) {
  const mId = String(item.motherId || item.mother || "").trim();
  let mother = await Mother.findOne(
    /^[0-9a-f]{24}$/i.test(mId) ? { _id: mId } : { code: mId.toUpperCase() }
  );
  if (!mother && item.motherName) {
    mother = await Mother.findOne({ name: new RegExp(item.motherName.trim(), "i") });
  }
  if (!mother) throw new HttpError(400, `Unknown mother ${item.motherId || item.mother || item.motherName}`);
  const flags = item.risk || item.riskFlags || [];
  const visit = await Visit.create({
    type: item.type === "home-visit" ? "home-visit" : item.visitType || item.type || "clinic",
    mother: mother._id, date: item.date || item.createdAt || Date.now(),
    weight: num(item.weight), bp: item.bp, hb: num(item.hb), riskFlags: flags, notes: item.notes,
    recordedBy: user._id, localId: item.localId,
  });
  mother.vitals = { weight: num(item.weight) ?? mother.vitals?.weight, bp: item.bp || mother.vitals?.bp, hb: num(item.hb) ?? mother.vitals?.hb, updatedAt: new Date() };
  if (flags.length) {
    mother.riskFlags = [...new Set([...(mother.riskFlags || []), ...flags])];
    mother.risk = flags.some((f) => DANGER.includes(f)) ? "high" : mother.risk === "high" ? "high" : "medium";
    await Alert.create({ mother: mother._id, level: mother.risk === "high" ? "danger" : "warn", reason: flags.join(", "), area: mother.village });
  }
  await mother.save();
  return visit;
}

async function saveGrowth(item, user) {
  const code = String(item.childId || item.childCode || "").toUpperCase();
  let child = await Child.findOne(/^[0-9a-f]{24}$/i.test(code) ? { _id: code } : { code });
  if (!child && item.childName) {
    child = await Child.findOne({ name: new RegExp(item.childName.trim(), "i") });
  }
  if (!child && item.motherName) {
    const mother = await Mother.findOne({ name: new RegExp(item.motherName.trim(), "i") });
    if (mother) child = await Child.findOne({ mother: mother._id, "deleteAudit.isDeleted": { $ne: true } });
  }
  if (!child) throw new HttpError(400, `Unknown child ${code || item.childName}`);
  const growth = await Growth.create({
    child: child._id,
    weight: num(item.weight),
    height: num(item.height || item.length),
    headCircumference: num(item.headCircumference),
    muac: num(item.muac),
    notes: item.notes || item.clinicalNotes,
    date: item.date || item.createdAt || Date.now(),
    recordedBy: user._id,
    localId: item.localId,
  });
  return growth;
}

async function saveImmunization(item, user) {
  const code = String(item.childId || item.motherId || item.childCode || "").toUpperCase();
  let child = await Child.findOne(/^[0-9a-f]{24}$/i.test(code) ? { _id: code } : { code });
  let mother = child ? await Mother.findById(child.mother) : await Mother.findOne(/^[0-9a-f]{24}$/i.test(code) ? { _id: code } : { code });
  if (!mother && item.motherName) {
    mother = await Mother.findOne({ name: new RegExp(item.motherName.trim(), "i") });
  }
  if (!child && item.childName) {
    child = await Child.findOne({ name: new RegExp(item.childName.trim(), "i") });
  }
  if (!child && !mother) throw new HttpError(400, `Unknown child/mother ${code || item.motherName}`);
  const out = [];

  const vaccineList = Array.isArray(item.vaccines) && item.vaccines.length > 0
    ? item.vaccines
    : item.vaccine ? [item.vaccine] : [];

  for (const v of vaccineList) {
    out.push(await Immunization.create({
      child: child?._id,
      mother: mother?._id || (child ? child.mother : undefined),
      vaccine: String(v).trim(),
      batch: item.batch || item.lotNumber,
      expiryDate: item.expiryDate,
      notes: item.notes || item.clinicalNotes,
      date: item.date || item.createdAt || Date.now(),
      recordedBy: user._id,
      localId: item.localId,
    }));
  }

  if (child && (item.weight || item.height)) {
    out.push(await Growth.create({
      child: child._id,
      weight: num(item.weight),
      height: num(item.height || item.length),
      headCircumference: num(item.headCircumference),
      muac: num(item.muac),
      notes: item.notes || item.clinicalNotes,
      date: item.date || item.createdAt || Date.now(),
      recordedBy: user._id,
      localId: item.localId,
    }));
  }
  return out;
}

const num = (v) => (v === undefined || v === "" || v === null ? undefined : Number(v));

// POST /records/batch  { items: [...] } — used by the app's offline queue.
router.post("/batch", authorize("visits:write"), ah(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const results = [];
  for (const item of items) {
    try {
      if (item.localId && ((await Visit.exists({ localId: item.localId })) || (await Immunization.exists({ localId: item.localId })) || (await Growth.exists({ localId: item.localId })))) {
        results.push({ localId: item.localId, status: "duplicate" });
        continue;
      }
      if (item.type === "immunization") await saveImmunization(item, req.user);
      else if (item.type === "growth") await saveGrowth(item, req.user);
      else await saveVisit(item, req.user);
      results.push({ localId: item.localId, status: "ok" });
    } catch (e) {
      results.push({ localId: item.localId, status: "error", error: e.message });
    }
  }
  res.json({ accepted: results.filter((r) => r.status !== "error").length, results });
}));

router.get("/visits", authorize("mothers:read"), ah(async (req, res) => {
  const filter = {};
  if (req.query.mother) {
    const key = String(req.query.mother).trim();
    const mother = await Mother.findOne(/^[0-9a-f]{24}$/i.test(key) ? { _id: key } : { code: key.toUpperCase() });
    if (mother) filter.mother = mother._id;
  }
  const records = await Visit.find(filter)
    .populate("mother", "name code village phmArea vitals risk")
    .populate("recordedBy", "name badge role")
    .sort({ date: -1 })
    .limit(50);
  res.json(records);
}));

router.post("/visits", authorize("visits:write"), ah(async (req, res) => res.status(201).json(await saveVisit(req.body, req.user))));

router.patch("/visits/:id", authorize("visits:write"), ah(async (req, res) => {
  const updated = await Visit.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new HttpError(404, "Visit record not found");
  if (req.body.weight || req.body.bp || req.body.hb) {
    await Mother.findByIdAndUpdate(updated.mother, {
      $set: {
        "vitals.weight": req.body.weight !== undefined ? Number(req.body.weight) : undefined,
        "vitals.bp": req.body.bp,
        "vitals.hb": req.body.hb !== undefined ? Number(req.body.hb) : undefined,
        "vitals.updatedAt": new Date(),
      },
    });
  }
  res.json(updated);
}));

router.delete("/visits/:id", authorize("visits:write"), ah(async (req, res) => {
  const deleted = await Visit.findByIdAndDelete(req.params.id);
  if (!deleted) throw new HttpError(404, "Visit record not found");
  res.json({ success: true, message: "Visit record deleted", id: req.params.id });
}));

// Immunization CRUD
router.get("/immunizations", authorize("children:read"), ah(async (req, res) => {
  const filter = {};
  if (req.query.child) {
    const child = await Child.findOne(/^[0-9a-f]{24}$/i.test(req.query.child) ? { _id: req.query.child } : { code: req.query.child.toUpperCase() });
    if (child) filter.child = child._id;
  }
  if (req.query.mother) {
    const mother = await Mother.findOne(/^[0-9a-f]{24}$/i.test(req.query.mother) ? { _id: req.query.mother } : { code: req.query.mother.toUpperCase() });
    if (mother) filter.mother = mother._id;
  }
  const records = await Immunization.find(filter)
    .populate("child", "name code dob isUnborn status")
    .populate("mother", "name code village")
    .populate("recordedBy", "name badge")
    .sort({ date: -1 })
    .limit(100);
  res.json(records);
}));

router.post("/immunizations", authorize("immunizations:write"), ah(async (req, res) => {
  const result = await saveImmunization({ ...req.body, type: "immunization" }, req.user);
  res.status(201).json(result);
}));

router.patch("/immunizations/:id", authorize("immunizations:write"), ah(async (req, res) => {
  const updated = await Immunization.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new HttpError(404, "Immunization record not found");
  res.json(updated);
}));

router.delete("/immunizations/:id", authorize("immunizations:write"), ah(async (req, res) => {
  const deleted = await Immunization.findByIdAndDelete(req.params.id);
  if (!deleted) throw new HttpError(404, "Immunization record not found");
  res.json({ success: true, message: "Immunization record deleted", id: req.params.id });
}));

// Growth CRUD
router.get("/growth", authorize("children:read"), ah(async (req, res) => {
  const filter = {};
  if (req.query.child) {
    const child = await Child.findOne(/^[0-9a-f]{24}$/i.test(req.query.child) ? { _id: req.query.child } : { code: req.query.child.toUpperCase() });
    if (child) filter.child = child._id;
  }
  const records = await Growth.find(filter)
    .populate("child", "name code dob isUnborn status")
    .populate("recordedBy", "name badge")
    .sort({ date: -1 })
    .limit(100);
  res.json(records);
}));

router.post("/growth", authorize("growth:write"), ah(async (req, res) => {
  const growth = await saveGrowth(req.body, req.user);
  res.status(201).json(growth);
}));

router.patch("/growth/:id", authorize("growth:write"), ah(async (req, res) => {
  const updated = await Growth.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new HttpError(404, "Growth record not found");
  res.json(updated);
}));

router.delete("/growth/:id", authorize("growth:write"), ah(async (req, res) => {
  const deleted = await Growth.findByIdAndDelete(req.params.id);
  if (!deleted) throw new HttpError(404, "Growth record not found");
  res.json({ success: true, message: "Growth record deleted", id: req.params.id });
}));

module.exports = router;
