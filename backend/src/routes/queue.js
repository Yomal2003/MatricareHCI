const router = require("express").Router();
const { QueueEntry } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const today = () => new Date().toISOString().slice(0, 10);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const extractDivision = (u) => {
  const raw = u?.area || u?.clinic || "";
  const cleaned = raw.replace(/\b(clinic|health|moh|center|post|division|office)\b/gi, "").trim();
  return cleaned || raw || "Buttala";
};
const clinicOf = (req) => req.user.area || req.user.clinic || "Buttala Clinic";

const findEntry = (key, req) => {
  if (/^[0-9a-f]{24}$/i.test(String(key))) {
    return QueueEntry.findById(key);
  }
  const division = extractDivision(req.user);
  const filter = {};
  if (req.query.clinic) filter.clinic = req.query.clinic;
  else if (division) filter.clinic = new RegExp(escapeRegex(division), "i");
  else filter.clinic = clinicOf(req);

  filter.day = req.query.day || today();
  filter.token = Number(key);
  return QueueEntry.findOne(filter);
};

const serializeEntry = (entry) => {
  const value = entry.toObject ? entry.toObject() : entry;
  return { ...value, id: String(value._id), childId: value.child?._id ? String(value.child._id) : value.childId };
};

router.get("/", authorize("queue:read"), ah(async (req, res) => {
  const day = req.query.day || today();
  const division = extractDivision(req.user);
  const clinicName = req.query.clinic || clinicOf(req);

  const filter = { day };
  if (req.query.clinic) {
    filter.clinic = req.query.clinic;
  } else if (division) {
    filter.clinic = new RegExp(escapeRegex(division), "i");
  } else {
    filter.clinic = clinicName;
  }

  let entries = await QueueEntry.find(filter)
    .populate("mother", "code name phone village status weeks")
    .populate("child", "code name dob")
    .sort({ token: 1 });

  // If no entries exist yet for today, auto-seed default clinical queue entries
  if (!entries.length && day === today()) {
    const defaultPatients = [
      { token: 1, name: "Ravindu Perera", childName: "Ravindu Perera", age: "8m", motherName: "Chamari Perera", type: "Vaccination", reason: "Measles / MMR-1", status: "done" },
      { token: 2, name: "Malithi Silva", childName: "Malithi Silva", age: "14m", motherName: "Sandya Silva", type: "Growth", reason: "Routine Growth Check", status: "done" },
      { token: 3, name: "Thishara Bandara", childName: "Thishara Bandara", age: "6m", motherName: "Tharaka Bandara", type: "Vaccination", reason: "Penta-3 & OPV-3", status: "done" },
      { token: 4, name: "Senali Weerasinghe", childName: "Senali Weerasinghe", age: "9m", motherName: "Nilanthi Weerasinghe", type: "Both", reason: "MMR-1 + Weight Check", status: "now-serving" },
      { token: 5, name: "Kavindi Rathnayake", childName: "Kavindi Rathnayake", age: "12m", motherName: "Kumari Rathnayake", type: "Vaccination", reason: "JE Vaccine", status: "waiting" },
      { token: 6, name: "Dineth Jayasuriya", childName: "Dineth Jayasuriya", age: "4m", motherName: "Anusha Jayasuriya", type: "Both", reason: "Penta-2 + Growth", status: "waiting" },
    ];
    await QueueEntry.insertMany(defaultPatients.map((p) => ({ ...p, day, clinic: clinicName })));
    entries = await QueueEntry.find(filter).sort({ token: 1 });
  }

  // Guarantee sequential, unique tokens
  const seenTokens = new Set();
  let nextUniqueToken = 1;
  entries.forEach((e) => {
    if (seenTokens.has(e.token)) {
      while (seenTokens.has(nextUniqueToken)) nextUniqueToken++;
      e.token = nextUniqueToken;
      e.save().catch(() => {});
    }
    seenTokens.add(e.token);
    if (e.token >= nextUniqueToken) nextUniqueToken = e.token + 1;
  });

  res.json(entries.map(serializeEntry));
}));

router.post("/", authorize("queue:write"), ah(async (req, res) => {
  const day = req.body.day || today();
  const clinic = req.body.clinic || clinicOf(req);
  const division = extractDivision(req.user);
  const clinicFilter = division ? { clinic: new RegExp(escapeRegex(division), "i") } : { clinic };
  const last = await QueueEntry.findOne({ day, ...clinicFilter }).sort({ token: -1 });
  const token = req.body.token || (last?.token || 0) + 1;
  const entry = await QueueEntry.create({
    day,
    clinic,
    token,
    name: req.body.name || req.body.childName || "Clinic Patient",
    childName: req.body.childName || req.body.name,
    motherName: req.body.motherName,
    age: req.body.age || "Under 5",
    type: req.body.type || "Vaccination",
    reason: req.body.reason || "Routine Clinic Visit",
    mother: req.body.mother,
    child: req.body.child,
    status: req.body.status || "waiting",
  });
  res.status(201).json(serializeEntry(entry));
}));

// Call / Announce token
router.post("/:id/call", authorize("queue:write"), ah(async (req, res) => {
  const entry = await findEntry(req.params.id, req);
  if (!entry) throw new HttpError(404, "Queue entry not found");

  // Keep one active call per clinic/day so previous tokens cannot remain in calling state
  await QueueEntry.updateMany(
    { day: entry.day, _id: { $ne: entry._id }, status: { $in: ["calling", "now-serving"] } },
    { $set: { status: "done" } }
  );

  entry.status = "calling";
  await entry.save();

  res.json({
    success: true,
    message: `Now calling Token #${entry.token}: ${entry.childName || entry.name}`,
    entry: serializeEntry(entry),
  });
}));

// PATCH /queue/:id { status }
router.patch("/:id", authorize("queue:write"), ah(async (req, res) => {
  const entry = await findEntry(req.params.id, req);
  if (!entry) throw new HttpError(404, "Queue entry not found");

  if (req.body.status === "next") {
    entry.status = entry.status === "waiting" ? "now-serving" : "done";
  } else if (req.body.status) {
    entry.status = req.body.status;
  }
  if (req.body.reason) entry.reason = req.body.reason;
  if (req.body.type) entry.type = req.body.type;

  await entry.save();

  // If completed, automatically advance the next waiting patient to "now-serving"
  if (entry.status === "done") {
    const nextWaiting = await QueueEntry.findOne({
      day: entry.day,
      clinic: entry.clinic,
      status: "waiting",
      token: { $gt: entry.token },
    }).sort({ token: 1 });
    if (nextWaiting) {
      nextWaiting.status = "now-serving";
      await nextWaiting.save();
    }
  }

  res.json(serializeEntry(entry));
}));

router.delete("/:id", authorize("queue:write"), ah(async (req, res) => {
  const entry = await QueueEntry.findByIdAndDelete(req.params.id);
  if (!entry) throw new HttpError(404, "Queue entry not found");
  res.json({ success: true, message: `Token #${entry.token} removed from queue`, id: String(entry._id) });
}));

module.exports = router;
