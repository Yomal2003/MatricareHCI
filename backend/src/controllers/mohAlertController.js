/**
 * MOH Alert Controller
 * Handles live triage of high-risk cases, overdue visits, and missed appointments.
 * Strictly enforces req.user.mohOfficeId ownership.
 */

const mongoose = require("mongoose");
const { Alert, Appointment, Mother, Child, ClinicArea } = require("../models");

/**
 * GET /api/moh/alerts
 * Paginated list of alerts and action items
 * Query params: ?type=high_risk|overdue|missed&clinicAreaId=&status=open|resolved&page=1&limit=20
 */
async function getAlerts(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(403).json({ message: "No MOH office assigned to this account" });
    }

    const officeObjectId = new mongoose.Types.ObjectId(mohOfficeId);
    const { type, clinicAreaId, status = "open", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    // Calculate real counts for filter badges
    const [highRiskCount, overdueCount, missedCount] = await Promise.all([
      // High-Risk: open alerts with danger/warn level OR high-risk mothers
      Alert.countDocuments({
        mohOfficeId: officeObjectId,
        status: status === "resolved" ? "resolved" : { $in: ["open", "acknowledged"] },
        level: { $in: ["danger", "warn"] },
      }),
      // Overdue: appointments past due date with status upcoming/pending/confirmed
      Appointment.countDocuments({
        mohOfficeId: officeObjectId,
        date: { $lt: new Date() },
        status: status === "resolved" ? { $in: ["completed", "done"] } : { $in: ["upcoming", "pending", "confirmed"] },
      }),
      // Missed: appointments marked missed
      Appointment.countDocuments({
        mohOfficeId: officeObjectId,
        status: "missed",
      }),
    ]);

    const counts = {
      highRisk: highRiskCount,
      overdue: overdueCount,
      missed: missedCount,
    };

    const items = [];

    // 1. Fetch Alert documents (High Risk)
    if (!type || type === "high_risk") {
      const alertQuery = {
        mohOfficeId: officeObjectId,
        status: status === "resolved" ? "resolved" : { $in: ["open", "acknowledged"] },
      };
      if (clinicAreaId) alertQuery.clinicAreaId = new mongoose.Types.ObjectId(clinicAreaId);

      const alertDocs = await Alert.find(alertQuery)
        .populate("mother", "name code village risk")
        .populate("child", "name code")
        .populate("clinicAreaId", "name")
        .populate("flaggedBy", "name role badge")
        .lean();

      for (const a of alertDocs) {
        items.push({
          id: a._id.toString(),
          type: "high_risk",
          severity: a.level === "danger" ? "danger" : "warn",
          patientName: a.mother?.name || a.child?.name || "Anonymous Patient",
          patientType: a.child ? "child" : "mother",
          clinicAreaName: a.clinicAreaId?.name || a.area || "General Area",
          clinicAreaId: a.clinicAreaId?._id?.toString() || a.clinicAreaId?.toString() || null,
          reason: a.reason || "High risk maternal flag",
          dueDate: null,
          flaggedBy: {
            name: a.flaggedBy?.name || "Field Officer",
            role: a.flaggedBy?.role ? String(a.flaggedBy.role).toUpperCase() : "PHM",
          },
          flaggedAt: a.createdAt || new Date(),
          status: a.status || "open",
        });
      }
    }

    // 2. Fetch Overdue & Missed Appointments
    if (!type || type === "overdue" || type === "missed") {
      const apptQuery = {
        mohOfficeId: officeObjectId,
      };
      if (clinicAreaId) apptQuery.clinicAreaId = new mongoose.Types.ObjectId(clinicAreaId);

      if (type === "overdue") {
        apptQuery.date = { $lt: new Date() };
        apptQuery.status = status === "resolved" ? { $in: ["completed", "done"] } : { $in: ["upcoming", "pending", "confirmed"] };
      } else if (type === "missed") {
        apptQuery.status = "missed";
      } else {
        // Both overdue and missed
        apptQuery.$or = [
          { date: { $lt: new Date() }, status: { $in: ["upcoming", "pending", "confirmed"] } },
          { status: "missed" },
        ];
      }

      const apptDocs = await Appointment.find(apptQuery)
        .populate("mother", "name code village phmArea assignedPhm")
        .populate("child", "name code")
        .populate("clinicAreaId", "name")
        .lean();

      for (const appt of apptDocs) {
        const isMissed = appt.status === "missed";
        items.push({
          id: appt._id.toString(),
          type: isMissed ? "missed" : "overdue",
          severity: isMissed ? "warn" : "warn",
          patientName: appt.mother?.name || appt.child?.name || "Patient",
          patientType: appt.child ? "child" : "mother",
          clinicAreaName: appt.clinicAreaId?.name || appt.phmArea || "Clinic Area",
          clinicAreaId: appt.clinicAreaId?._id?.toString() || appt.clinicAreaId?.toString() || null,
          reason: `${appt.type || "Routine Visit"} (${appt.status})`,
          dueDate: appt.date,
          flaggedBy: {
            name: "Automated Surveillance",
            role: "SYSTEM",
          },
          flaggedAt: appt.createdAt || appt.date,
          status: isMissed ? "open" : appt.status,
        });
      }
    }

    // Default sort: high-risk first (severity: danger > warn), then oldest overdue first (dueDate asc, flaggedAt asc)
    items.sort((a, b) => {
      if (a.severity === "danger" && b.severity !== "danger") return -1;
      if (b.severity === "danger" && a.severity !== "danger") return 1;

      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.flaggedAt).getTime();
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.flaggedAt).getTime();
      return dateA - dateB;
    });

    const total = items.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      items: paginatedItems,
      total,
      page: pageNum,
      limit: limitNum,
      counts,
    });
  } catch (error) {
    console.error("❌ Error in getAlerts:", error);
    return res.status(500).json({
      message: "Internal server error fetching alerts",
      details: error.message,
    });
  }
}

/**
 * GET /api/moh/alerts/:id
 * Case detail with strict MOH office ownership check.
 * Returns 403 if belonging to another office, 404 if missing.
 */
async function getAlertDetail(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(403).json({ message: "No MOH office assigned to this account" });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Alert or case not found" });
    }

    // Check if it's an Alert record
    let alert = await Alert.findById(id)
      .populate("mother")
      .populate("child")
      .populate("clinicAreaId", "name type address")
      .populate("flaggedBy", "name role badge phone")
      .populate("handledBy", "name role")
      .lean();

    if (alert) {
      // Ownership check: 403 if another office
      if (alert.mohOfficeId && alert.mohOfficeId.toString() !== mohOfficeId.toString()) {
        return res.status(403).json({
          message: "Access forbidden. Alert belongs to a different MOH office",
        });
      }

      return res.status(200).json({
        id: alert._id.toString(),
        type: "high_risk",
        severity: alert.level,
        status: alert.status,
        reason: alert.reason,
        area: alert.clinicAreaId?.name || alert.area,
        clinicArea: alert.clinicAreaId,
        patient: alert.mother || alert.child,
        patientType: alert.child ? "child" : "mother",
        flaggedBy: alert.flaggedBy,
        handledBy: alert.handledBy,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
      });
    }

    // Check if it's an Appointment / Overdue case
    const appt = await Appointment.findById(id)
      .populate("mother")
      .populate("child")
      .populate("clinicAreaId", "name type address")
      .lean();

    if (appt) {
      // Ownership check: 403 if another office
      if (appt.mohOfficeId && appt.mohOfficeId.toString() !== mohOfficeId.toString()) {
        return res.status(403).json({
          message: "Access forbidden. Case belongs to a different MOH office",
        });
      }

      return res.status(200).json({
        id: appt._id.toString(),
        type: appt.status === "missed" ? "missed" : "overdue",
        severity: "warn",
        status: appt.status,
        reason: `${appt.type} (${appt.category || "General Visit"})`,
        dueDate: appt.date,
        place: appt.place,
        notes: appt.notes,
        area: appt.clinicAreaId?.name || appt.phmArea,
        clinicArea: appt.clinicAreaId,
        patient: appt.mother || appt.child,
        patientType: appt.child ? "child" : "mother",
        createdAt: appt.createdAt,
        updatedAt: appt.updatedAt,
      });
    }

    return res.status(404).json({ message: "Alert or case not found" });
  } catch (error) {
    console.error("❌ Error in getAlertDetail:", error);
    return res.status(500).json({
      message: "Internal server error fetching alert detail",
      details: error.message,
    });
  }
}

module.exports = {
  getAlerts,
  getAlertDetail,
};
