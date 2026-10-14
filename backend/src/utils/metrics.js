/**
 * Metric Definitions and Calculations for MOH Dashboard & Reports
 * All date boundaries follow Asia/Colombo (UTC+05:30), week = Monday to Sunday.
 */

const mongoose = require("mongoose");
const { Mother, Child, Visit, Immunization, Growth, Appointment, Alert, ClinicArea } = require("../models");

// Metric targets & constants
const TARGET_VISIT_COMPLIANCE = 85;
const TARGET_IMMUNIZATION_COVERAGE = 95;
const COLOMBO_OFFSET_MINUTES = 330; // +05:30

/**
 * Standard National Immunization Schedule (Sri Lanka EPI)
 * Age thresholds in days -> vaccines expected by that age
 */
const VACCINE_SCHEDULE = [
  { minDays: 0, vaccines: ["BCG"] },
  { minDays: 60, vaccines: ["Penta 1", "OPV 1"] },
  { minDays: 120, vaccines: ["Penta 2", "OPV 2"] },
  { minDays: 180, vaccines: ["Penta 3", "OPV 3"] },
  { minDays: 270, vaccines: ["MMR 1", "MMR"] },
  { minDays: 365, vaccines: ["JE"] },
];

/**
 * Parse an ISO date or Date object into year, month (1-12), day, etc. in Asia/Colombo time.
 */
function getColomboParts(date = new Date()) {
  const d = new Date(date);
  const colomboTime = new Date(d.getTime() + COLOMBO_OFFSET_MINUTES * 60 * 1000);
  return {
    year: colomboTime.getUTCFullYear(),
    month: colomboTime.getUTCMonth() + 1, // 1-12
    date: colomboTime.getUTCDate(),
    day: colomboTime.getUTCDay(), // 0 = Sunday, 1 = Monday
    hours: colomboTime.getUTCHours(),
    minutes: colomboTime.getUTCMinutes(),
  };
}

/**
 * Construct UTC Date from Colombo local date components
 */
function createDateFromColombo(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
  // Construct UTC time matching Colombo local time minus 330 minutes
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second, ms) - (COLOMBO_OFFSET_MINUTES * 60 * 1000);
  return new Date(utcMillis);
}

/**
 * Returns [startOfToday, endOfToday, now] in Asia/Colombo
 */
function getColomboToday() {
  const parts = getColomboParts();
  const start = createDateFromColombo(parts.year, parts.month, parts.date, 0, 0, 0, 0);
  const end = createDateFromColombo(parts.year, parts.month, parts.date, 23, 59, 59, 999);
  return { start, end, now: new Date() };
}

/**
 * Get date range for a given month in YYYY-MM format in Asia/Colombo.
 * Also returns previous month's range for trend comparison.
 */
function getMonthRange(yearMonth) {
  let y, m;
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    const parts = yearMonth.split("-");
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else {
    const todayParts = getColomboParts();
    y = todayParts.year;
    m = todayParts.month;
  }

  // Current month boundaries
  const start = createDateFromColombo(y, m, 1, 0, 0, 0, 0);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = createDateFromColombo(y, m, daysInMonth, 23, 59, 59, 999);

  // Previous month boundaries
  let prevY = y;
  let prevM = m - 1;
  if (prevM < 1) {
    prevM = 12;
    prevY -= 1;
  }
  const prevStart = createDateFromColombo(prevY, prevM, 1, 0, 0, 0, 0);
  const prevDays = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const prevEnd = createDateFromColombo(prevY, prevM, prevDays, 23, 59, 59, 999);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const label = `${monthNames[m - 1]} ${y}`;

  return {
    start,
    end,
    prevStart,
    prevEnd,
    yearMonth: `${y}-${String(m).padStart(2, "0")}`,
    label,
  };
}

/**
 * Get date range for a given week (Monday to Sunday) in Asia/Colombo.
 */
function getWeekRange(dateOrIso) {
  const d = dateOrIso ? new Date(dateOrIso) : new Date();
  const parts = getColomboParts(d);

  // Day of week in Colombo: 0=Sun, 1=Mon, ..., 6=Sat
  // We want Monday as start of week
  const colomboDay = parts.day === 0 ? 7 : parts.day; // 1 (Mon) to 7 (Sun)
  const daysSinceMonday = colomboDay - 1;

  // Monday in Colombo
  const mondayUtc = createDateFromColombo(parts.year, parts.month, parts.date - daysSinceMonday, 0, 0, 0, 0);
  const sundayUtc = createDateFromColombo(parts.year, parts.month, parts.date - daysSinceMonday + 6, 23, 59, 59, 999);

  // Previous week
  const prevMondayUtc = createDateFromColombo(parts.year, parts.month, parts.date - daysSinceMonday - 7, 0, 0, 0, 0);
  const prevSundayUtc = createDateFromColombo(parts.year, parts.month, parts.date - daysSinceMonday - 1, 23, 59, 59, 999);

  const monParts = getColomboParts(mondayUtc);
  const sunParts = getColomboParts(sundayUtc);
  const label = `${monParts.year}-${String(monParts.month).padStart(2, "0")}-${String(monParts.date).padStart(2, "0")} to ${sunParts.year}-${String(sunParts.month).padStart(2, "0")}-${String(sunParts.date).padStart(2, "0")}`;

  return {
    start: mondayUtc,
    end: sundayUtc,
    prevStart: prevMondayUtc,
    prevEnd: prevSundayUtc,
    label,
  };
}

/**
 * Resolves date boundaries based on report query options
 */
function resolveReportDateRange(query = {}) {
  const { type = "monthly", month, from, to, date } = query;

  if (type === "weekly") {
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      const days = Math.round((end - start) / 864e5);
      const prevStart = new Date(start.getTime() - days * 864e5);
      const prevEnd = new Date(start.getTime() - 1);
      return { start, end, prevStart, prevEnd, label: `${from} to ${to}` };
    }
    return getWeekRange(date || from);
  }

  if (from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    const days = Math.round((end - start) / 864e5);
    const prevStart = new Date(start.getTime() - days * 864e5);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: `${from} to ${to}` };
  }

  return getMonthRange(month);
}

// -------------------------------------------------------------
// METRIC CALCULATIONS
// -------------------------------------------------------------

/**
 * 1. Visit Compliance %
 * Formula: completed visits / scheduled visits whose due date falls in the period * 100
 * If denominator is zero, return null.
 */
async function computeVisitCompliance(mohOfficeId, startDate, endDate, clinicAreaId = null) {
  const matchFilter = {
    mohOfficeId: new mongoose.Types.ObjectId(mohOfficeId),
    date: { $gte: startDate, $lte: endDate },
  };

  if (clinicAreaId) {
    matchFilter.clinicAreaId = new mongoose.Types.ObjectId(clinicAreaId);
  }

  const results = await Appointment.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        scheduled: { $sum: 1 },
        done: {
          $sum: {
            $cond: [{ $in: ["$status", ["completed", "done"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (!results.length || results[0].scheduled === 0) {
    return { value: null, scheduled: 0, done: 0 };
  }

  const { scheduled, done } = results[0];
  const value = Math.round((done / scheduled) * 100);
  return { value, scheduled, done };
}

/**
 * 2. Immunization Coverage %
 * Formula: children with all doses due by today recorded / registered children in the office * 100
 * Target: 95%
 * If registered children is zero, return null.
 */
async function computeImmunizationCoverage(mohOfficeId, asOfDate = new Date(), clinicAreaId = null) {
  const childFilter = {
    mohOfficeId: new mongoose.Types.ObjectId(mohOfficeId),
    "deleteAudit.isDeleted": { $ne: true },
    status: { $ne: "unborn" },
    dob: { $exists: true, $ne: null, $lte: asOfDate },
  };

  if (clinicAreaId) {
    childFilter.clinicAreaId = new mongoose.Types.ObjectId(clinicAreaId);
  }

  const children = await Child.find(childFilter).select("_id dob").lean();
  const totalChildren = children.length;

  if (totalChildren === 0) {
    return { value: null, total: 0, fullyImmunized: 0 };
  }

  const childIds = children.map((c) => c._id);
  const immunizations = await Immunization.find({
    child: { $in: childIds },
    date: { $lte: asOfDate },
  }).select("child vaccine dose").lean();

  // Map childId -> Set of recorded vaccines
  const dosesByChild = new Map();
  for (const imm of immunizations) {
    const key = imm.child.toString();
    if (!dosesByChild.has(key)) dosesByChild.set(key, new Set());
    const vName = String(imm.vaccine).trim().toLowerCase();
    dosesByChild.get(key).add(vName);
    if (imm.dose) dosesByChild.get(key).add(`${vName} ${imm.dose}`.toLowerCase());
  }

  let fullyImmunizedCount = 0;
  const nowMs = asOfDate.getTime();

  for (const child of children) {
    const ageDays = Math.floor((nowMs - new Date(child.dob).getTime()) / 864e5);
    const recordedSet = dosesByChild.get(child._id.toString()) || new Set();

    // Check all vaccines due for age
    let allDosesGiven = true;
    for (const rule of VACCINE_SCHEDULE) {
      if (ageDays >= rule.minDays) {
        // At least one of the matching vaccines in this rule category must be present
        const hasDose = rule.vaccines.some((v) => {
          const lower = v.toLowerCase();
          return (
            recordedSet.has(lower) ||
            Array.from(recordedSet).some((r) => r.startsWith(lower.split(" ")[0]))
          );
        });
        if (!hasDose) {
          allDosesGiven = false;
          break;
        }
      }
    }

    if (allDosesGiven) fullyImmunizedCount += 1;
  }

  const value = Math.round((fullyImmunizedCount / totalChildren) * 100);
  return { value, total: totalChildren, fullyImmunized: fullyImmunizedCount };
}

/**
 * 3. High-Risk Cases
 * Formula: count of distinct mothers/children currently flagged high-risk and not resolved.
 * Also returns change versus previous period.
 */
async function computeHighRiskCases(mohOfficeId, asOfDate = new Date(), prevDate = null, clinicAreaId = null) {
  const baseFilter = {
    mohOfficeId: new mongoose.Types.ObjectId(mohOfficeId),
  };
  if (clinicAreaId) {
    baseFilter.clinicAreaId = new mongoose.Types.ObjectId(clinicAreaId);
  }

  // Mothers currently flagged high-risk
  const highRiskMothers = await Mother.find({
    ...baseFilter,
    risk: "high",
    status: { $ne: "closed" },
    "deleteAudit.isDeleted": { $ne: true },
  }).distinct("_id");

  // Unresolved high-risk / danger alerts
  const openAlerts = await Alert.find({
    ...baseFilter,
    status: { $in: ["open", "acknowledged"] },
    level: { $in: ["danger", "warn"] },
  }).select("mother child").lean();

  const distinctCases = new Set();
  for (const id of highRiskMothers) {
    distinctCases.add(`mother:${id.toString()}`);
  }
  for (const a of openAlerts) {
    if (a.mother) distinctCases.add(`mother:${a.mother.toString()}`);
    if (a.child) distinctCases.add(`child:${a.child.toString()}`);
  }

  const currentValue = distinctCases.size;

  // Compute change versus previous period if prevDate is provided
  let change = 0;
  if (prevDate) {
    const prevAlerts = await Alert.countDocuments({
      ...baseFilter,
      createdAt: { $lte: prevDate },
      status: { $in: ["open", "acknowledged"] },
      level: { $in: ["danger", "warn"] },
    });
    change = currentValue - prevAlerts;
  }

  return { value: currentValue, change };
}

/**
 * 4. Active Clinic Areas
 * Formula: count of active ClinicArea in the office.
 */
async function computeActiveClinicAreas(mohOfficeId) {
  return ClinicArea.countDocuments({
    mohOfficeId: new mongoose.Types.ObjectId(mohOfficeId),
    status: "active",
  });
}

/**
 * 5. Missed / Overdue
 * Formula: scheduled visits past their due date with no completed record.
 */
async function computeMissedVisits(mohOfficeId, asOfDate = new Date(), clinicAreaId = null) {
  const filter = {
    mohOfficeId: new mongoose.Types.ObjectId(mohOfficeId),
    date: { $lt: asOfDate },
    status: { $in: ["missed", "upcoming", "pending", "confirmed"] },
  };

  if (clinicAreaId) {
    filter.clinicAreaId = new mongoose.Types.ObjectId(clinicAreaId);
  }

  return Appointment.countDocuments(filter);
}

/**
 * 6. Zone (Clinic Area) Compliance
 * Aggregates visit compliance per clinic area inside the MOH office.
 * Uses a single aggregation query for efficiency.
 */
async function computeZoneCompliance(mohOfficeId, startDate, endDate) {
  const officeObjectId = new mongoose.Types.ObjectId(mohOfficeId);

  // 1. Get all active clinic areas in the office
  const clinicAreas = await ClinicArea.find({
    mohOfficeId: officeObjectId,
    status: "active",
  }).select("_id name").sort({ name: 1 }).lean();

  if (!clinicAreas.length) return [];

  // 2. Aggregate appointments by clinicAreaId in date range
  const apptStats = await Appointment.aggregate([
    {
      $match: {
        mohOfficeId: officeObjectId,
        date: { $gte: startDate, $lte: endDate },
        clinicAreaId: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$clinicAreaId",
        scheduled: { $sum: 1 },
        done: {
          $sum: {
            $cond: [{ $in: ["$status", ["completed", "done"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  const statsMap = new Map();
  for (const st of apptStats) {
    statsMap.set(st._id.toString(), st);
  }

  // 3. Map into response structure
  return clinicAreas.map((ca) => {
    const st = statsMap.get(ca._id.toString());
    const scheduled = st?.scheduled || 0;
    const done = st?.done || 0;
    const value = scheduled > 0 ? Math.round((done / scheduled) * 100) : null;

    return {
      clinicAreaId: ca._id.toString(),
      name: ca.name,
      value,
      visits: {
        done,
        scheduled,
      },
    };
  });
}

/**
 * 7. District Average
 * Average compliance across all MOH offices in the same district.
 */
async function computeDistrictAverage(district, startDate, endDate) {
  if (!district) return null;

  const MohOffice = require("../models/MohOffice");
  const districtOffices = await MohOffice.find({
    district: new RegExp(`^${district}$`, "i"),
  }).distinct("_id");

  if (!districtOffices.length) return null;

  const results = await Appointment.aggregate([
    {
      $match: {
        mohOfficeId: { $in: districtOffices },
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        scheduled: { $sum: 1 },
        done: {
          $sum: {
            $cond: [{ $in: ["$status", ["completed", "done"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (!results.length || results[0].scheduled === 0) return null;
  return Math.round((results[0].done / results[0].scheduled) * 100);
}

/**
 * 8. Recent Activity Feed
 * Derived from real events:
 * - newly flagged high-risk cases
 * - overdue mothers grouped by clinic area
 * - recent record uploads by staff
 * Latest 10, newest first.
 */
async function getRecentActivity(mohOfficeId, limit = 10) {
  const officeObjectId = new mongoose.Types.ObjectId(mohOfficeId);
  const events = [];

  // A. High-risk alerts or mothers flagged
  const recentAlerts = await Alert.find({ mohOfficeId: officeObjectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("mother", "name village")
    .populate("child", "name")
    .lean();

  for (const a of recentAlerts) {
    const patientName = a.mother?.name || a.child?.name || "Patient";
    events.push({
      type: "high_risk",
      message: `${patientName} flagged high-risk: ${a.reason || "Clinical risk indicator"}`,
      createdAt: a.createdAt || new Date(),
      refId: a._id.toString(),
    });
  }

  // B. Recent visits uploaded by staff
  const recentVisits = await Visit.find({ mohOfficeId: officeObjectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("mother", "name")
    .populate("recordedBy", "name badge role")
    .lean();

  for (const v of recentVisits) {
    const patientName = v.mother?.name || "Mother";
    const staffName = v.recordedBy?.name || "Staff";
    const typeLabel = v.type === "home-visit" ? "Home Visit" : "Clinic Visit";
    events.push({
      type: "record",
      message: `${staffName} recorded ${typeLabel} for ${patientName}`,
      createdAt: v.createdAt || v.date || new Date(),
      refId: v._id.toString(),
    });
  }

  // C. Recent immunizations uploaded
  const recentImmunizations = await Immunization.find({ mohOfficeId: officeObjectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("child", "name")
    .populate("mother", "name")
    .populate("recordedBy", "name")
    .lean();

  for (const imm of recentImmunizations) {
    const name = imm.child?.name || imm.mother?.name || "Child";
    const staffName = imm.recordedBy?.name || "Staff";
    events.push({
      type: "record",
      message: `${staffName} recorded ${imm.vaccine || "Immunization"} for ${name}`,
      createdAt: imm.createdAt || imm.date || new Date(),
      refId: imm._id.toString(),
    });
  }

  // D. Overdue / Missed appointments grouped by clinic area
  const now = new Date();
  const overdueVisits = await Appointment.find({
    mohOfficeId: officeObjectId,
    date: { $lt: now },
    status: { $in: ["missed", "upcoming", "pending", "confirmed"] },
  })
    .sort({ date: -1 })
    .limit(5)
    .populate("clinicAreaId", "name")
    .populate("mother", "name")
    .lean();

  for (const ov of overdueVisits) {
    const areaName = ov.clinicAreaId?.name || ov.phmArea || "Clinic Area";
    const patientName = ov.mother?.name || "Patient";
    events.push({
      type: "overdue",
      message: `${patientName} (${areaName}): visit overdue since ${new Date(ov.date).toLocaleDateString()}`,
      createdAt: ov.updatedAt || ov.date || new Date(),
      refId: ov._id.toString(),
    });
  }

  // Sort all events by createdAt descending and take top N
  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return events.slice(0, limit);
}

module.exports = {
  TARGET_VISIT_COMPLIANCE,
  TARGET_IMMUNIZATION_COVERAGE,
  getColomboParts,
  createDateFromColombo,
  getColomboToday,
  getMonthRange,
  getWeekRange,
  resolveReportDateRange,
  computeVisitCompliance,
  computeImmunizationCoverage,
  computeHighRiskCases,
  computeActiveClinicAreas,
  computeMissedVisits,
  computeZoneCompliance,
  computeDistrictAverage,
  getRecentActivity,
};
