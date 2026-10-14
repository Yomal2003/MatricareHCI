/**
 * MOH Doctor Dashboard, Alerts, and Reports Routes
 * All endpoints require authentication and MOH role ('MOH').
 * Filtered by req.user.mohOfficeId.
 */

const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const { getDashboard } = require("../controllers/mohDashboardController");
const { getAlerts, getAlertDetail } = require("../controllers/mohAlertController");
const {
  validateReportQuery,
  getReportData,
  downloadReport,
  getReportHistory,
} = require("../controllers/mohReportController");

// Enforce authentication & requireRole('MOH') on all routes
router.use(authenticate);
router.use(requireRole("MOH"));

/**
 * @route   GET /api/moh/dashboard
 * @desc    Get live indicators, clinic area compliance, and recent activity
 */
router.get("/dashboard", getDashboard);

/**
 * @route   GET /api/moh/alerts
 * @desc    Get paginated triage list of high-risk cases, overdue visits, and missed visits
 */
router.get("/alerts", getAlerts);

/**
 * @route   GET /api/moh/alerts/:id
 * @desc    Get alert or case details with ownership verification
 */
router.get("/alerts/:id", getAlertDetail);

/**
 * @route   GET /api/moh/reports/data
 * @desc    Get report preview data as JSON
 */
router.get("/reports/data", validateReportQuery, getReportData);

/**
 * @route   GET /api/moh/reports/download
 * @desc    Download report as PDF or XLSX and record generation in history
 */
router.get("/reports/download", validateReportQuery, downloadReport);

/**
 * @route   GET /api/moh/reports/history
 * @desc    Get past generated reports history (latest 50)
 */
router.get("/reports/history", getReportHistory);

module.exports = router;
