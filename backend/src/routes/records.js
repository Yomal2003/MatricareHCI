// Clinical data entry + offline batch sync.
const router = require("express").Router();
const { Mother, Child, Visit, Immunization, Growth, Alert } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const DANGER = ["High BP", "Bleeding", "Reduced movements"];
const RECORD_MODELS = { visit: Visit, immunization: Immunization, growth: Growth };
const RECORD_FIELDS = {
  visit: ["type", "date", "gestationWeeks", "weight", "bp", "hb", "fetalPosition", "riskFlags", "notes"],
  immunization: ["vaccine", "dose", "batch", "date"],
  growth: ["date", "weight", "height", "muac"],
};
const NUMERIC_FIELDS = new Set(["gestationWeeks", "weight", "hb", "dose", "height", "muac"]);
const STRING_FIELDS = new Set(["type", "bp", "fetalPosition", "notes", "vaccine", "batch"]);

const motherSummary = (mother) => ({
  _id: mother._id,
  code: mother.code,
  name: mother.name,
  village: mother.village,
});

function pickRecordFields(recordType, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "A record update object is required");
  }
  const fields = {};
  for (const key of RECORD_FIELDS[recordType]) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const value = body[key];
    if (NUMERIC_FIELDS.has(key)) {
      if (value === null || value === "") {
        fields[key] = null;
      } else {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new HttpError(400, `${key} must be a valid number`);
        fields[key] = number;
      }
    } else if (key === "date") {
      const date = new Date(value);
      if (value === null || value === "" || Number.isNaN(date.getTime())) {
        throw new HttpError(400, "date must be a valid date");
      }
      fields[key] = date;
    } else if (key === "riskFlags") {
      if (!Array.isArray(value) || value.some((flag) => typeof flag !== "string")) {
        throw new HttpError(400, "riskFlags must be an array of strings");
      }
      fields[key] = value;
    } else if (STRING_FIELDS.has(key)) {
      if (value !== null && typeof value !== "string") throw new HttpError(400, `${key} must be text`);
      fields[key] = value;
    }
  }
  if (!Object.keys(fields).length) throw new HttpError(400, "No supported record fields were provided");
  return fields;
}

async function findRecordContext(recordType, id, user) {
  const Model = RECORD_MODELS[recordType];
  if (!Model) throw new HttpError(400, "Unsupported record type");
  if (!/^[0-9a-f]{24}$/i.test(id)) throw new HttpError(400, "Invalid record ID");
  const record = await Model.findById(id);
  if (!record) throw new HttpError(404, "Record not found");

  let motherId = record.mother;
  let child = null;
  if (recordType === "growth" || (recordType === "immunization" && !motherId)) {
    child = await Child.findById(record.child);
    if (!child) throw new HttpError(404, "Record not found");
    motherId = child.mother;
  }
  const mother = await Mother.findById(motherId);
  if (!mother || (user.role === "phm" && String(mother.assignedPhm) !== String(user._id))) {
    throw new HttpError(404, "Record not found");
  }
  return { record, mother, child };
}

function serializeRecord(recordType, record, mother, child = null) {
  const value = record.toObject ? record.toObject() : record;
  return {
    ...value,
    recordType,
    mother: motherSummary(mother),
    ...(child ? { child: { _id: child._id, code: child.code, name: child.name } } : {}),
  };
}

async function saveVisit(item, user) {
  const mother = await Mother.findOne({ code: String(item.motherId || "").toUpperCase() });
  if (!mother) throw new HttpError(400, `Unknown mother ${item.motherId}`);
  const flags = item.risk || item.riskFlags || [];
  const visit = await Visit.create({
    type: item.type === "home-visit" ? "home-visit" : item.visitType || "clinic",
    mother: mother._id, date: item.createdAt || Date.now(),
    gestationWeeks: num(item.gestationWeeks), weight: num(item.weight), bp: item.bp, hb: num(item.hb),
    fetalPosition: item.fetalPosition, riskFlags: flags, notes: item.notes,
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

// GET /records?motherId=M-1043 — persisted clinical history for a mother.
router.get("/", authorize("records:read"), ah(async (req, res) => {
  const code = String(req.query.motherId || "").trim().toUpperCase();
  if (!code) throw new HttpError(400, "motherId is required");
  const motherFilter = { code };
  if (req.user.role === "phm") motherFilter.assignedPhm = req.user._id;
  const mother = await Mother.findOne(motherFilter);
  if (!mother) throw new HttpError(404, "Mother not found");

  const children = await Child.find({ mother: mother._id }).select("_id code name");
  const childIds = children.map((child) => child._id);
  const [visits, immunizations, growthRecords] = await Promise.all([
    Visit.find({ mother: mother._id }).sort({ date: -1, createdAt: -1 }),
    Immunization.find({
      $or: [{ mother: mother._id }, { child: { $in: childIds } }],
    }).sort({ date: -1, createdAt: -1 }),
    Growth.find({ child: { $in: childIds } }).sort({ date: -1, createdAt: -1 }),
  ]);
  const childrenById = new Map(children.map((child) => [String(child._id), child]));
  const records = [
    ...visits.map((record) => serializeRecord("visit", record, mother)),
    ...immunizations.map((record) => serializeRecord(
      "immunization",
      record,
      mother,
      record.child ? childrenById.get(String(record.child)) : null,
    )),
    ...growthRecords.map((record) => serializeRecord(
      "growth",
      record,
      mother,
      childrenById.get(String(record.child)),
    )),
  ];
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(records);
}));

router.get("/:recordType/:id", authorize("records:read"), ah(async (req, res) => {
  const { record, mother, child } = await findRecordContext(req.params.recordType, req.params.id, req.user);
  res.json(serializeRecord(req.params.recordType, record, mother, child));
}));

router.put("/:recordType/:id", authorize("records:write"), ah(async (req, res) => {
  const { record, mother, child } = await findRecordContext(req.params.recordType, req.params.id, req.user);
  const fields = pickRecordFields(req.params.recordType, req.body);
  for (const [key, value] of Object.entries(fields)) record.set(key, value);
  await record.save();
  res.json(serializeRecord(req.params.recordType, record, mother, child));
}));

router.delete("/:recordType/:id", authorize("records:write"), ah(async (req, res) => {
  const { record } = await findRecordContext(req.params.recordType, req.params.id, req.user);
  await record.deleteOne();
  res.json({ deleted: true, id: record.id, recordType: req.params.recordType });
}));

module.exports = router;
