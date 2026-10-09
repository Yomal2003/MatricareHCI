/**
 * MOH Office Routes
 * Endpoints for MOH doctors to view their office assignment and overview.
 * Base path: /api/moh
 */

const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { getMyOffice } = require("../controllers/mohOfficeController");

// Require authentication and MOH role for all routes
router.use(authenticate);
router.use(requireRole("MOH"));

/**
 * @route   GET /api/moh/my-office
 * @desc    Get the authenticated doctor's MOH office, clinic areas, and staff overview
 * @access  Protected (MOH only)
 */
router.get("/my-office", getMyOffice);

module.exports = router;
