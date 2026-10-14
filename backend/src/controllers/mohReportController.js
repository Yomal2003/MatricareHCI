/**
 * MOH Report Controller
 * Handles report data preview, PDF/XLSX download generation, and history tracking.
 * Uses shared utils/metrics.js to ensure consistency between dashboard and reports.
 */

const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { query, validationResult } = require("express-validator");
const MohOffice = require("../models/MohOffice");
const ReportHistory = require("../models/ReportHistory");
const { ClinicArea } = require("../models/ClinicArea");
const { Alert, Appointment, Mother } = require("../models");
const {
  TARGET_VISIT_COMPLIANCE,
  TARGET_IMMUNIZATION_COVERAGE,
  resolveReportDateRange,
  computeVisitCompliance,
  computeImmunizationCoverage,
  computeHighRiskCases,
  computeMissedVisits,
  computeZoneCompliance,
} = require("../utils/metrics");

/**
 * Validation rules for report endpoints
 */
const validateReportQuery = [
  query("type")
    .optional()
    .isIn(["weekly", "monthly", "area", "Weekly", "Monthly", "Area-wise"])
    .withMessage("Invalid report type. Allowed: weekly, monthly, area"),
  query("format")
    .optional()
    .isIn(["pdf", "xlsx", "excel"])
    .withMessage("Invalid format. Allowed: pdf, xlsx"),
  query("from")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid from date. Expected ISO 8601 format"),
  query("to")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid to date. Expected ISO 8601 format"),
  query("month")
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("Invalid month. Expected YYYY-MM format"),
];

/**
 * Shared report data builder using utils/metrics.js
 */
async function buildReportPayload(req) {
  const mohOfficeId = req.user?.mohOfficeId;
  const officeObjectId = new mongoose.Types.ObjectId(mohOfficeId);
  const office = await MohOffice.findById(officeObjectId).lean();

  const normalizedType = String(req.query.type || "monthly").toLowerCase();
  const typeKey = normalizedType.includes("week")
    ? "weekly"
    : normalizedType.includes("area")
    ? "area"
    : "monthly";

  const { start, end, label } = resolveReportDateRange({
    type: typeKey,
    month: req.query.month,
    from: req.query.from,
    to: req.query.to,
  });

  const clinicAreaId = req.query.clinicAreaId || null;
  let targetArea = null;
  if (clinicAreaId && mongoose.isValidObjectId(clinicAreaId)) {
    targetArea = await ClinicArea.findById(clinicAreaId).lean();
  }

  // 1. Compute summary indicators using shared metric calculations
  const [visitStats, immStats, highRiskStats, missedCount] = await Promise.all([
    computeVisitCompliance(mohOfficeId, start, end, clinicAreaId),
    computeImmunizationCoverage(mohOfficeId, end, clinicAreaId),
    computeHighRiskCases(mohOfficeId, end, null, clinicAreaId),
    computeMissedVisits(mohOfficeId, end, clinicAreaId),
  ]);

  // 2. Breakdown per clinic area
  let clinicAreaList = [];
  if (clinicAreaId && targetArea) {
    clinicAreaList = [
      {
        clinicAreaId: targetArea._id.toString(),
        name: targetArea.name,
        compliance: visitStats.value,
        immunization: immStats.value,
        highRisk: highRiskStats.value,
        missed: missedCount,
        visits: { done: visitStats.done, scheduled: visitStats.scheduled },
      },
    ];
  } else {
    const rawZones = await computeZoneCompliance(mohOfficeId, start, end);
    const areaStatsPromises = rawZones.map(async (zone) => {
      const [areaImm, areaHr, areaMissed] = await Promise.all([
        computeImmunizationCoverage(mohOfficeId, end, zone.clinicAreaId),
        computeHighRiskCases(mohOfficeId, end, null, zone.clinicAreaId),
        computeMissedVisits(mohOfficeId, end, zone.clinicAreaId),
      ]);
      return {
        clinicAreaId: zone.clinicAreaId,
        name: zone.name,
        compliance: zone.value,
        immunization: areaImm.value,
        highRisk: areaHr.value,
        missed: areaMissed,
        visits: zone.visits,
      };
    });
    clinicAreaList = await Promise.all(areaStatsPromises);
  }

  // 3. Chart Series
  const chartSeries = clinicAreaList.map((ca) => ({
    name: ca.name,
    compliance: ca.compliance,
    target: TARGET_VISIT_COMPLIANCE,
  }));

  // 4. Detailed Missed & High-Risk Case List
  const [openAlerts, missedAppts] = await Promise.all([
    Alert.find({
      mohOfficeId: officeObjectId,
      status: { $in: ["open", "acknowledged"] },
      ...(clinicAreaId ? { clinicAreaId: new mongoose.Types.ObjectId(clinicAreaId) } : {}),
    })
      .populate("mother", "name code village")
      .populate("child", "name")
      .populate("clinicAreaId", "name")
      .limit(50)
      .lean(),

    Appointment.find({
      mohOfficeId: officeObjectId,
      status: "missed",
      date: { $gte: start, $lte: end },
      ...(clinicAreaId ? { clinicAreaId: new mongoose.Types.ObjectId(clinicAreaId) } : {}),
    })
      .populate("mother", "name code village")
      .populate("clinicAreaId", "name")
      .limit(50)
      .lean(),
  ]);

  const missedAndHighRiskList = [
    ...openAlerts.map((a) => ({
      id: a._id.toString(),
      type: "high_risk",
      name: a.mother?.name || a.child?.name || "Patient",
      area: a.clinicAreaId?.name || a.area || "General Area",
      reason: a.reason || "High Risk Flag",
      severity: a.level || "danger",
      date: a.createdAt,
    })),
    ...missedAppts.map((m) => ({
      id: m._id.toString(),
      type: "missed",
      name: m.mother?.name || "Patient",
      area: m.clinicAreaId?.name || m.phmArea || "Clinic Area",
      reason: `Missed ${m.type || "Scheduled Visit"}`,
      severity: "warn",
      date: m.date,
    })),
  ];

  const reportTitle = `${office?.name || "MOH"} ${label} Maternal & Child Health Return`;

  return {
    title: reportTitle,
    period: label,
    periodLabel: label,
    reportType: typeKey,
    generatedAt: new Date().toISOString(),
    mohOffice: {
      name: office?.name || "MOH Office",
      district: office?.district || "District",
      province: office?.province || "Province",
    },
    doctor: {
      fullName: req.user?.name || "MOH Doctor",
    },
    summary: {
      visitCompliance: { value: visitStats.value, target: TARGET_VISIT_COMPLIANCE },
      immunizationCoverage: { value: immStats.value, target: TARGET_IMMUNIZATION_COVERAGE },
      highRiskCases: { value: highRiskStats.value },
      missedVisits: { value: missedCount },
    },
    clinicAreas: clinicAreaList,
    chartSeries,
    missedAndHighRiskList,
  };
}

/**
 * GET /api/moh/reports/data
 * Preview report data in JSON format
 */
async function getReportData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation Error",
      details: errors.array().map((e) => e.msg).join(", "),
    });
  }

  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(403).json({ message: "No MOH office assigned to this account" });
    }

    const payload = await buildReportPayload(req);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("❌ Error in getReportData:", error);
    return res.status(500).json({
      message: "Failed to generate report data",
      details: error.message,
    });
  }
}

/**
 * GET /api/moh/reports/download
 * Generates and downloads PDF or Excel report file
 */
async function downloadReport(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation Error",
      details: errors.array().map((e) => e.msg).join(", "),
    });
  }

  const mohOfficeId = req.user?.mohOfficeId;
  if (!mohOfficeId) {
    return res.status(403).json({ message: "No MOH office assigned to this account" });
  }

  const rawFormat = String(req.query.format || "pdf").toLowerCase();
  const format = rawFormat === "xlsx" || rawFormat === "excel" ? "xlsx" : rawFormat === "pdf" ? "pdf" : null;

  if (!format) {
    return res.status(400).json({
      message: "Unsupported format. Expected 'pdf' or 'xlsx'",
    });
  }

  try {
    const reportData = await buildReportPayload(req);
    const officeNameClean = (reportData.mohOffice.name || "Office").replace(/[^a-zA-Z0-9]/g, "");
    const periodClean = (reportData.period || "Current").replace(/[^a-zA-Z0-9]/g, "-");
    const fileName = `MatriCare_${reportData.reportType}_${periodClean}_${officeNameClean}.${format}`;

    // Record generation history in MongoDB
    await ReportHistory.create({
      mohOfficeId,
      generatedBy: req.user._id,
      type: reportData.reportType,
      period: reportData.period,
      format,
      fileName,
      parameters: {
        type: req.query.type,
        from: req.query.from,
        to: req.query.to,
        month: req.query.month,
        clinicAreaId: req.query.clinicAreaId,
      },
    });

    if (format === "xlsx") {
      // ─────────────────────────────────────────────────────────────
      // EXCEL GENERATION (ExcelJS)
      // ─────────────────────────────────────────────────────────────
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "MatriCare Digital Health";
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Indicator", key: "indicator", width: 35 },
        { header: "Value", key: "value", width: 20 },
        { header: "Target / Benchmark", key: "target", width: 25 },
        { header: "Status", key: "status", width: 20 },
      ];

      summarySheet.addRow({
        indicator: "Visit Compliance Rate",
        value: reportData.summary.visitCompliance.value !== null ? `${reportData.summary.visitCompliance.value}%` : "No data",
        target: `${reportData.summary.visitCompliance.target}%`,
        status: (reportData.summary.visitCompliance.value || 0) >= reportData.summary.visitCompliance.target ? "Achieved" : "Needs Attention",
      });

      summarySheet.addRow({
        indicator: "Immunization Coverage",
        value: reportData.summary.immunizationCoverage.value !== null ? `${reportData.summary.immunizationCoverage.value}%` : "No data",
        target: `${reportData.summary.immunizationCoverage.target}%`,
        status: (reportData.summary.immunizationCoverage.value || 0) >= reportData.summary.immunizationCoverage.target ? "Achieved" : "Needs Attention",
      });

      summarySheet.addRow({
        indicator: "High-Risk Cases (Active)",
        value: reportData.summary.highRiskCases.value,
        target: "0 (Target Minimum)",
        status: reportData.summary.highRiskCases.value > 0 ? "Under Watch" : "Clean",
      });

      summarySheet.addRow({
        indicator: "Missed Scheduled Visits",
        value: reportData.summary.missedVisits.value,
        target: "0",
        status: reportData.summary.missedVisits.value > 0 ? "Action Required" : "On Track",
      });

      // Sheet 2: By Clinic Area
      const areaSheet = workbook.addWorksheet("By Clinic Area");
      areaSheet.columns = [
        { header: "Clinic Area", key: "name", width: 25 },
        { header: "Visit Compliance (%)", key: "compliance", width: 25 },
        { header: "Immunization (%)", key: "immunization", width: 25 },
        { header: "High-Risk Cases", key: "highRisk", width: 20 },
        { header: "Missed Visits", key: "missed", width: 20 },
      ];

      for (const ca of reportData.clinicAreas) {
        areaSheet.addRow({
          name: ca.name,
          compliance: ca.compliance !== null ? `${ca.compliance}%` : "No data",
          immunization: ca.immunization !== null ? `${ca.immunization}%` : "No data",
          highRisk: ca.highRisk ?? 0,
          missed: ca.missed ?? 0,
        });
      }

      // Sheet 3: Missed & High-Risk List
      const listSheet = workbook.addWorksheet("Missed and High-Risk");
      listSheet.columns = [
        { header: "Type", key: "type", width: 15 },
        { header: "Patient Name", key: "name", width: 25 },
        { header: "Clinic Area", key: "area", width: 20 },
        { header: "Clinical Reason / Detail", key: "reason", width: 40 },
        { header: "Severity", key: "severity", width: 15 },
      ];

      for (const item of reportData.missedAndHighRiskList) {
        listSheet.addRow({
          type: item.type === "high_risk" ? "High Risk" : "Missed Visit",
          name: item.name,
          area: item.area,
          reason: item.reason,
          severity: String(item.severity).toUpperCase(),
        });
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      return res.end();
    } else {
      // ─────────────────────────────────────────────────────────────
      // PDF GENERATION (PDFKit)
      // ─────────────────────────────────────────────────────────────
      const doc = new PDFDocument({ margin: 40, size: "A4" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      doc.pipe(res);

      // Title & Header Header Bar
      doc.rect(0, 0, doc.page.width, 70).fill("#7B4FE0");
      doc.fontSize(18).fillColor("#FFFFFF").text("MatriCare Health Platform", 40, 20, { bold: true });
      doc.fontSize(11).fillColor("#E9D5FF").text(`Official Return • ${reportData.mohOffice.name} MOH Office`, 40, 44);

      doc.moveDown(3);
      doc.fillColor("#1E293B");

      // Report Metadata
      doc.fontSize(16).text(reportData.title, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#64748B").text(`Reporting Period: ${reportData.period}`);
      doc.text(`District / Province: ${reportData.mohOffice.district}, ${reportData.mohOffice.province}`);
      doc.text(`Generated by: ${reportData.doctor.fullName} on ${new Date().toLocaleDateString()}`);
      doc.moveDown(1.5);

      // Summary Indicators Section
      doc.fontSize(12).fillColor("#7B4FE0").text("EXECUTIVE PERFORMANCE SUMMARY", { bold: true });
      doc.moveDown(0.5);

      const summaryRows = [
        ["Visit Compliance", reportData.summary.visitCompliance.value !== null ? `${reportData.summary.visitCompliance.value}%` : "No data", `Target: ${reportData.summary.visitCompliance.target}%`],
        ["Immunization Coverage", reportData.summary.immunizationCoverage.value !== null ? `${reportData.summary.immunizationCoverage.value}%` : "No data", `Target: ${reportData.summary.immunizationCoverage.target}%`],
        ["Active High-Risk Cases", String(reportData.summary.highRiskCases.value), "Clinical Surveillance"],
        ["Missed Scheduled Visits", String(reportData.summary.missedVisits.value), "Follow-up Required"],
      ];

      doc.fontSize(10).fillColor("#1E293B");
      for (const [metric, val, note] of summaryRows) {
        doc.text(`• ${metric}: `, { continued: true, bold: true }).text(`${val}  (${note})`, { bold: false });
        doc.moveDown(0.2);
      }

      doc.moveDown(1.5);

      // Clinic Area Table Section
      doc.fontSize(12).fillColor("#7B4FE0").text("CLINIC AREA BREAKDOWN", { bold: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(9).fillColor("#475569");
      doc.text("Clinic Area", 40, tableTop, { bold: true, width: 140 });
      doc.text("Compliance", 190, tableTop, { bold: true, width: 80 });
      doc.text("Immunization", 280, tableTop, { bold: true, width: 80 });
      doc.text("High-Risk", 370, tableTop, { bold: true, width: 70 });
      doc.text("Missed", 450, tableTop, { bold: true, width: 60 });

      let currentY = tableTop + 16;
      doc.rect(40, currentY - 2, 480, 1).fill("#CBD5E1");

      for (const ca of reportData.clinicAreas) {
        doc.fontSize(9).fillColor("#1E293B");
        doc.text(ca.name, 40, currentY, { width: 140 });
        doc.text(ca.compliance !== null ? `${ca.compliance}%` : "No data", 190, currentY, { width: 80 });
        doc.text(ca.immunization !== null ? `${ca.immunization}%` : "No data", 280, currentY, { width: 80 });
        doc.text(String(ca.highRisk ?? 0), 370, currentY, { width: 70 });
        doc.text(String(ca.missed ?? 0), 450, currentY, { width: 60 });
        currentY += 18;
      }

      doc.moveDown(2);
      doc.y = currentY + 15;
      doc.fontSize(8).fillColor("#94A3B8").text("Generated automatically by MatriCare Healthcare Information System. Verified for official Sri Lankan Ministry of Health field returns.", { align: "center" });

      doc.end();
    }
  } catch (error) {
    console.error("❌ Error in downloadReport:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate report download",
        details: error.message,
      });
    }
  }
}

/**
 * GET /api/moh/reports/history
 * Latest 50 report generation events, filterable by type
 */
async function getReportHistory(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(403).json({ message: "No MOH office assigned to this account" });
    }

    const { type } = req.query;
    const filter = {
      mohOfficeId: new mongoose.Types.ObjectId(mohOfficeId),
    };

    if (type && type !== "All") {
      filter.type = String(type).toLowerCase();
    }

    const history = await ReportHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("generatedBy", "name role")
      .lean();

    return res.status(200).json({
      count: history.length,
      history: history.map((h) => ({
        id: h._id.toString(),
        name: h.fileName,
        period: h.period,
        type: h.type === "weekly" ? "Weekly" : h.type === "area" ? "Area-wise" : "Monthly",
        format: h.format === "xlsx" ? "excel" : h.format,
        fileName: h.fileName,
        date: new Date(h.createdAt).toLocaleDateString(),
        createdAt: h.createdAt,
        generatedBy: h.generatedBy?.name || "MOH Doctor",
        parameters: h.parameters,
      })),
    });
  } catch (error) {
    console.error("❌ Error in getReportHistory:", error);
    return res.status(500).json({
      message: "Failed to fetch report history",
      details: error.message,
    });
  }
}

module.exports = {
  validateReportQuery,
  getReportData,
  downloadReport,
  getReportHistory,
};
