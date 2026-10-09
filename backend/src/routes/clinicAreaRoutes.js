/**
 * Clinic Area Routes
 * Endpoints for MOH doctors to manage clinic areas within their office.
 * Base path: /api/moh/clinic-areas
 */

const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const {
  createClinicArea,
  updateClinicArea,
  deactivateClinicArea,
  activateClinicArea,
  getClinicAreaStaff,
} = require("../controllers/clinicAreaController");
const {
  validateCreateClinicArea,
  validateUpdateClinicArea,
} = require("../middleware/validators/clinicAreaValidator");

// Require authentication and MOH role for all clinic area management routes
router.use(authenticate);
router.use(requireRole("MOH"));

/**
 * @route   POST /api/moh/clinic-areas
 * @desc    Create a new clinic area under the doctor's MOH office
 * @access  Protected (MOH only)
 */
router.post("/", validateCreateClinicArea, createClinicArea);

/**
 * @route   PUT /api/moh/clinic-areas/:id
 * @desc    Update a clinic area's details
 * @access  Protected (MOH only)
 */
router.put("/:id", validateUpdateClinicArea, updateClinicArea);

/**
 * @route   PATCH /api/moh/clinic-areas/:id/deactivate
 * @desc    Soft-deactivate a clinic area (requires 0 active staff)
 * @access  Protected (MOH only)
 */
router.patch("/:id/deactivate", deactivateClinicArea);

/**
 * @route   PATCH /api/moh/clinic-areas/:id/activate
 * @desc    Reactivate a previously deactivated clinic area
 * @access  Protected (MOH only)
 */
router.patch("/:id/activate", activateClinicArea);

/**
 * @route   GET /api/moh/clinic-areas/:id/staff
 * @desc    List all staff members assigned to a clinic area (optional ?status=)
 * @access  Protected (MOH only)
 */
router.get("/:id/staff", getClinicAreaStaff);

module.exports = router;
