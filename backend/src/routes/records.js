// Clinical data entry + offline batch sync.
const router = require("express").Router();
const { Mother, Child, Visit, Immunization, Growth, Alert } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const DANGER = ["High BP", "Bleeding", "Reduced movements"];

async function saveVisit(item, user) {
  const mother = await Mother.findOne({ code: String(item.motherId || "").toUpperCase() });
  if (!mother) throw new HttpError(400, `Unknown mother ${item.motherId}`);
  const flags = item.risk || item.riskFlags || [];
  const visit = await Visit.create({
    type: item.type === "home-visit" ? "home-visit" : item.visitType || "clinic",
    mother: mother._id, date: item.createdAt || Date.now(),
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

async function saveImmunization(item, user) {
  if (user.role !== "nursing") throw new HttpError(403, "Only nursing officers record immunizations");
  const code = String(item.childId || item.motherId || "").toUpperCase();
  const child = await Child.findOne({ code });
  const mother = child ? null : await Mother.findOne({ code });
  if (!child && !mother) throw new HttpError(400, `Unknown child/mother ${code}`);
  const out = [];
  if (item.vaccine) {
    out.push(await Immunization.create({ child: child?._id, mother: mother?._id, vaccine: item.vaccine, batch: item.batch, date: item.createdAt || Date.now(), recordedBy: user._id, localId: item.localId }));
  }
  if (child && (item.weight || item.height)) {
    out.push(await Growth.create({ child: child._id, weight: num(item.weight), height: num(item.height), date: item.createdAt || Date.now(), recordedBy: user._id, localId: item.localId }));
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
      // Dedupe: skip anything already synced from this device.
      if (item.localId && ((await Visit.exists({ localId: item.localId })) || (await Immunization.exists({ localId: item.localId })))) {
        results.push({ localId: item.localId, status: "duplicate" });
        continue;
      }
      if (item.type === "immunization") await saveImmunization(item, req.user);
      else await saveVisit(item, req.user);
      results.push({ localId: item.localId, status: "ok" });
    } catch (e) {
      results.push({ localId: item.localId, status: "error", error: e.message });
    }
  }
  res.json({ accepted: results.filter((r) => r.status !== "error").length, results });
}));

router.post("/visits", authorize("visits:write"), ah(async (req, res) => res.status(201).json(await saveVisit(req.body, req.user))));
router.post("/immunizations", authorize("immunizations:write"), ah(async (req, res) => res.status(201).json(await saveImmunization({ ...req.body, type: "immunization" }, req.user))));

module.exports = router;
