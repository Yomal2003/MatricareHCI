/**
 * Staff Routes
 * Endpoints for MOH doctors to manage field healthcare workers.
 * Base path: /api/moh/staff
 */

const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const {
  staffCreationLimiter,
  resendCredentialsLimiter,
} = require("../middleware/rateLimiter");
const {
  validateStaffInput,
  createStaff,
  resendCredentials,
  getAllStaff,
  getStaffById,
} = require("../controllers/staffController");

/**
 * Apply global authentication & role checks to all routes in this router.
 * All staff management routes are strictly reserved for MOH doctors.
 */
router.use(authenticate);
router.use(requireRole("MOH"));

/**
 * @route   POST /api/moh/staff
 * @desc    Add a new staff member (PHM, Nursing Officer, Clinic Staff)
 *          Auto-generates sequential username, temporary password,
 *          saves to database, and sends email credentials.
 * @access  Protected (MOH only)
 */
router.post("/", staffCreationLimiter, validateStaffInput, createStaff);

/**
 * @route   POST /api/moh/staff/:id/resend-credentials
 * @desc    Regenerate temporary password and resend onboarding credentials email
 * @access  Protected (MOH only)
 */
router.post("/:id/resend-credentials", resendCredentialsLimiter, resendCredentials);

/**
 * @route   GET /api/moh/staff
 * @desc    List all registered staff members with optional filters (role, zone, status)
 * @access  Protected (MOH only)
 */
router.get("/", getAllStaff);

/**
 * @route   GET /api/moh/staff/:id
 * @desc    Get details of a single staff member
 * @access  Protected (MOH only)
 */
router.get("/:id", getStaffById);

module.exports = router;
