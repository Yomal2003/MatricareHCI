/**
 * Clinic Area & Reassignment Validators
 * Validates request payloads and params using express-validator.
 */

const { body, param, validationResult } = require("express-validator");
const { CLINIC_TYPES } = require("../../models/ClinicArea");

/**
 * Middleware to format express-validator errors consistently:
 * { message: "Validation failed", details: [ ... ] }
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for POST /api/moh/clinic-areas
 */
const validateCreateClinicArea = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Clinic area name is required")
    .isLength({ min: 2, max: 80 })
    .withMessage("Clinic area name must be between 2 and 80 characters"),

  body("type")
    .optional()
    .trim()
    .isIn(CLINIC_TYPES)
    .withMessage(`Type must be one of: ${CLINIC_TYPES.join(", ")}`),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),

  handleValidationErrors,
];

/**
 * Validation rules for PUT /api/moh/clinic-areas/:id
 */
const validateUpdateClinicArea = [
  param("id")
    .isMongoId()
    .withMessage("Invalid clinic area ID in URL parameter"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Clinic area name must be between 2 and 80 characters"),

  body("type")
    .optional()
    .trim()
    .isIn(CLINIC_TYPES)
    .withMessage(`Type must be one of: ${CLINIC_TYPES.join(", ")}`),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),

  handleValidationErrors,
];

/**
 * Validation rules for PATCH /api/moh/staff/:id/reassign
 */
const validateReassignStaff = [
  param("id")
    .isMongoId()
    .withMessage("Invalid staff ID in URL parameter"),

  body("clinicAreaId")
    .trim()
    .notEmpty()
    .withMessage("clinicAreaId is required")
    .isMongoId()
    .withMessage("clinicAreaId must be a valid MongoDB ObjectId"),

  handleValidationErrors,
];

module.exports = {
  validateCreateClinicArea,
  validateUpdateClinicArea,
  validateReassignStaff,
};
