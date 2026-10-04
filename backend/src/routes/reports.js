const router = require("express").Router();
const { Mother, Child, Appointment, Immunization, Visit, Alert } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function periodRange(period) {
  // "2026-09" → that month; "2026-Q3" → quarter; default → current month
  const now = new Date();
  let [y, rest] = (period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  y = Number(y);
  if (rest.startsWith("Q")) { const q = Number(rest[1]) - 1; return [new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 1)]; }
  const m = Number(rest) - 1;
  return [new Date(y, m, 1), new Date(y, m + 1, 1)];
}

router.get("/summary", authorize("reports:read"), ah(async (_req, res) => {
  const [done, missed, children, immunizedChildren, highRisk, records, openAlerts] = await Promise.all([
    Appointment.countDocuments({ status: "done" }),
    Appointment.countDocuments({ status: "missed" }),
    Child.countDocuments(),
    Immunization.distinct("child", { child: { $ne: null } }),
    Mother.countDocuments({ risk: "high", status: { $ne: "closed" } }),
    Visit.countDocuments(),
    Alert.countDocuments({ status: "open" }),
  ]);
  res.json({ compliance: pct(done, done + missed), immunization: pct(immunizedChildren.length, children), highRisk, records, openAlerts });
}));

router.get("/compliance-by-area", authorize("reports:read"), ah(async (_req, res) => {
  const rows = await Appointment.aggregate([
    { $match: { status: { $in: ["done", "missed"] } } },
    { $group: { _id: "$phmArea", done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }, total: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json(rows.map((r) => ({ area: r._id || "Unassigned", value: pct(r.done, r.total), done: r.done, total: r.total })));
}));

router.get("/missed", authorize("reports:read"), ah(async (req, res) => {
  const [from, to] = periodRange(req.query.period);
  const match = { status: "missed", date: { $gte: from, $lt: to } };
  const [byCategory, byArea] = await Promise.all([
    Appointment.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
    Appointment.aggregate([{ $match: match }, { $group: { _id: "$phmArea", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);
  res.json({ from, to, byCategory: byCategory.map((r) => ({ category: r._id, count: r.count })), byArea: byArea.map((r) => ({ area: r._id, count: r.count })) });
}));

// GET /reports/generate?type=H509&period=2026-09 — eRHMIS-style aggregate payload
router.get("/generate", authorize("reports:read"), ah(async (req, res) => {
  const type = req.query.type || "H509";
  const [from, to] = periodRange(req.query.period);
  const range = { $gte: from, $lt: to };
  const [newRegistrations, ancVisits, homeVisits, immunizations, missed, highRisk] = await Promise.all([
    Mother.countDocuments({ createdAt: range }),
    Visit.countDocuments({ type: "anc", date: range }),
    Visit.countDocuments({ type: "home-visit", date: range }),
    Immunization.aggregate([{ $match: { date: range } }, { $group: { _id: "$vaccine", count: { $sum: 1 } } }]),
    Appointment.countDocuments({ status: "missed", date: range }),
    Mother.countDocuments({ risk: "high" }),
  ]);
  if (!["H509", "H524", "Immunization", "Missed visits"].includes(type)) throw new HttpError(400, "Unknown report type");
  res.json({
    reportType: type, period: { from, to }, generatedAt: new Date(),
    data: { newRegistrations, ancVisits, homeVisits, missed, highRisk, immunizations: Object.fromEntries(immunizations.map((r) => [r._id, r.count])) },
  });
}));

// POST /reports/export — hook point for pushing to eRHMIS (DHIS2-based). Wire the real endpoint here.
router.post("/export", authorize("reports:read"), ah(async (req, res) => {
  res.status(202).json({ status: "queued", reportType: req.body.type, period: req.body.period, note: "Connect eRHMIS/DHIS2 credentials to enable live export." });
}));

module.exports = router;
