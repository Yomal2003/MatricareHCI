/**
 * Staff Controller
 * Handles staff creation, credential emailing, credential resending,
 * first-login password reset enforcement, and staff listing.
 */

const { body, validationResult } = require("express-validator");
const { Staff, STAFF_ROLES } = require("../models/Staff");
const { ClinicArea } = require("../models/ClinicArea");
const { assertClinicAreaOwned } = require("../utils/ownership");
const { generateUsername } = require("../utils/generateUsername");
const {
  generateTemporaryPassword,
  hashPassword,
  comparePassword,
} = require("../utils/generatePassword");
const { buildStaffCredentialsEmail } = require("../utils/emailTemplates");
const { sendEmail } = require("../config/mailer");
const { signToken } = require("../middleware/auth");

/**
 * Validation rules for creating a staff member.
 */
const validateStaffInput = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .customSanitizer((val) => {
      if (!val) return val;
      const upper = String(val).trim().toUpperCase();
      if (upper === "NURSING OFFICER" || upper === "NURSING_OFFICER") return "NURSING_OFFICER";
      if (upper === "CLINIC STAFF" || upper === "CLINIC_STAFF") return "CLINIC_STAFF";
      return upper;
    })
    .isIn(STAFF_ROLES)
    .withMessage(`Role must be one of: ${STAFF_ROLES.join(", ")}`),

  body("clinicAreaId")
    .trim()
    .notEmpty()
    .withMessage("Clinic area ID is required")
    .isMongoId()
    .withMessage("Invalid clinic area ID format"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[0-9\s\-()]{7,20}$/)
    .withMessage("Please provide a valid phone number (e.g. +94 77 123 4567)"),

  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

/**
 * Validation rules for password reset.
 */
const validateResetPasswordInput = [
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/[A-Za-z]/)
    .withMessage("New password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one number"),
];

/**
 * POST /api/moh/staff
 * Creates a new staff member, auto-generates sequential username,
 * generates and hashes temporary password, and emails credentials.
 */
async function createStaff(req, res) {
  // 1. Verify input validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "ValidationError",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { fullName, role, clinicAreaId, phone, email } = req.body;
  const mohOfficeId = req.user?.mohOfficeId;

  if (!mohOfficeId) {
    return res.status(409).json({
      message: "No MOH office assigned to this account",
    });
  }

  try {
    // 2. Verify clinic area: must exist, be active, and belong to req.user.mohOfficeId (otherwise 403)
    const clinicArea = await ClinicArea.findById(clinicAreaId);
    if (
      !clinicArea ||
      clinicArea.status !== "active" ||
      !clinicArea.mohOfficeId ||
      clinicArea.mohOfficeId.toString() !== mohOfficeId.toString()
    ) {
      return res.status(403).json({
        message: "Clinic area does not exist, is inactive, or belongs to a different MOH office.",
      });
    }

    // 3. Atomically generate unique username based on role prefix
    const username = await generateUsername(role);

    // Fallback email if omitted
    const targetEmail = email && email.trim() ? email.trim().toLowerCase() : `${username.toLowerCase()}@matricare.health.gov.lk`;

    // Multiple staff accounts can share the same notification email.
    // Unique identification is strictly enforced by the auto-generated username.

    // 4. Generate random 8-10 char temporary password
    const temporaryPassword = generateTemporaryPassword(10);

    // 5. Hash temporary password with bcrypt (10 rounds)
    // NEVER store or log the plain-text password
    const passwordHash = await hashPassword(temporaryPassword, 10);

    // 6. Save staff record to database (mohOfficeId set strictly from req.user, never from req.body)
    const staff = new Staff({
      fullName,
      role,
      clinicAreaId: clinicArea._id,
      mohOfficeId,
      zone: clinicArea.name,
      phone,
      email: targetEmail,
      username,
      passwordHash,
      mustResetPassword: true,
      status: "active",
      emailStatus: "sent", // default, will update if mail fails
      createdBy: req.user?.id || req.user?._id,
    });

    await staff.save();

    // 7. Prepare and dispatch credentials email
    const emailContent = buildStaffCredentialsEmail({
      fullName,
      username,
      temporaryPassword,
      role,
      zone: clinicArea.name,
    });

    const emailResult = await sendEmail({
      to: targetEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // 8. Handle email sending failure without rolling back the saved staff
    if (!emailResult.success) {
      staff.emailStatus = "failed";
      await staff.save();

      return res.status(201).json({
        id: staff.id,
        username: staff.username,
        status: staff.status,
        emailStatus: "failed",
        message:
          "Staff member created successfully, but credentials email delivery failed. You can resend credentials using the resend endpoint.",
      });
    }

    // 9. Success response (NEVER return password or passwordHash)
    return res.status(201).json({
      id: staff.id,
      username: staff.username,
      status: staff.status,
      emailStatus: "sent",
      message: "Staff member created successfully and credentials have been emailed.",
    });
  } catch (error) {
    console.error("❌ Error in createStaff controller:", error);

    // Check for MongoDB duplicate key error code
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(409).json({
        error: "Conflict",
        message: `A record with this ${field} already exists.`,
      });
    }

    return res.status(500).json({
      error: "InternalServerError",
      message: "An unexpected error occurred while creating staff member.",
    });
  }
}

/**
 * POST /api/moh/staff/:id/resend-credentials
 * Generates a new temporary password, updates passwordHash, resets
 * mustResetPassword to true, and resends the email.
 */
async function resendCredentials(req, res) {
  const { id } = req.params;

  try {
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        error: "NotFound",
        message: `No staff member found with ID: ${id}`,
      });
    }

    // 1. Generate NEW temporary password (invalidates previous one)
    const newTemporaryPassword = generateTemporaryPassword(10);
    const newPasswordHash = await hashPassword(newTemporaryPassword, 10);

    staff.passwordHash = newPasswordHash;
    staff.mustResetPassword = true;

    // 2. Prepare email
    const emailContent = buildStaffCredentialsEmail({
      fullName: staff.fullName,
      username: staff.username,
      temporaryPassword: newTemporaryPassword,
      role: staff.role,
      zone: staff.zone,
    });

    // 3. Send email
    const emailResult = await sendEmail({
      to: staff.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    staff.emailStatus = emailResult.success ? "sent" : "failed";
    await staff.save();

    if (!emailResult.success) {
      return res.status(200).json({
        id: staff.id,
        username: staff.username,
        emailStatus: "failed",
        emailError: emailResult.error,
        message: `Temporary password generated, but email delivery failed: ${emailResult.error || "SMTP error"}. Check BREVO_USER in .env.`,
      });
    }

    return res.status(200).json({
      id: staff.id,
      username: staff.username,
      emailStatus: "sent",
      message: "New temporary password generated and emailed to the staff member successfully.",
    });
  } catch (error) {
    console.error("❌ Error in resendCredentials controller:", error);
    return res.status(500).json({
      error: "InternalServerError",
      message: "An error occurred while resending staff credentials.",
    });
  }
}

/**
 * POST /api/auth/staff-login
 * Staff authentication with first-login password reset check.
 */
async function loginStaff(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "BadRequest",
      message: "Username and password are required.",
    });
  }

  try {
    // Explicitly select passwordHash which is excluded by default
    const staff = await Staff.findOne({
      username: String(username).trim().toUpperCase(),
    }).select("+passwordHash");

    if (!staff) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid username or password.",
      });
    }

    if (staff.status !== "active") {
      return res.status(403).json({
        error: "Forbidden",
        message: "This staff account has been deactivated. Please contact your MOH.",
      });
    }

    const isMatch = await comparePassword(password, staff.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid username or password.",
      });
    }

    // Sign authentication token
    const token = signToken({
      id: staff.id,
      role: staff.role,
      fullName: staff.fullName,
    });

    // PASSWORD RESET ENFORCEMENT ON FIRST LOGIN
    if (staff.mustResetPassword) {
      return res.status(200).json({
        mustResetPassword: true,
        token,
        user: {
          id: staff.id,
          username: staff.username,
          fullName: staff.fullName,
          role: staff.role,
          email: staff.email,
        },
        message: "First-time login detected. You must change your temporary password before accessing the system.",
      });
    }

    return res.status(200).json({
      mustResetPassword: false,
      token,
      user: {
        id: staff.id,
        username: staff.username,
        fullName: staff.fullName,
        role: staff.role,
        zone: staff.zone,
        email: staff.email,
      },
      message: "Login successful.",
    });
  } catch (error) {
    console.error("❌ Error in loginStaff controller:", error);
    return res.status(500).json({
      error: "InternalServerError",
      message: "An error occurred during authentication.",
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Allows a staff member to set a new password, clearing mustResetPassword flag.
 */
async function resetPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "ValidationError",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  // Accepts user id from authenticated token or explicit body
  const userId = req.user?.id || req.body.userId;
  const { newPassword } = req.body;

  if (!userId) {
    return res.status(401).json({
      error: "Unauthenticated",
      message: "User ID is required to reset password.",
    });
  }

  try {
    const staff = await Staff.findById(userId).select("+passwordHash");
    if (!staff) {
      return res.status(404).json({
        error: "NotFound",
        message: "Staff member not found.",
      });
    }

    // Hash the new password
    const hashed = await hashPassword(newPassword, 10);
    staff.passwordHash = hashed;
    staff.mustResetPassword = false;

    await staff.save();

    return res.status(200).json({
      message: "Password updated successfully. You may now continue using MatriCare with your new password.",
      mustResetPassword: false,
    });
  } catch (error) {
    console.error("❌ Error in resetPassword controller:", error);
    return res.status(500).json({
      error: "InternalServerError",
      message: "An error occurred while resetting the password.",
    });
  }
}

/**
 * GET /api/moh/staff
 * Lists all registered staff members (for the MOH dashboard).
 */
async function getAllStaff(req, res) {
  try {
    const { role, zone, clinicAreaId, status } = req.query;
    const filter = {};

    if (req.user?.mohOfficeId) {
      filter.mohOfficeId = req.user.mohOfficeId;
    }
    if (role) filter.role = role;
    if (clinicAreaId) filter.clinicAreaId = clinicAreaId;
    if (zone) filter.zone = zone;
    if (status) filter.status = status;

    const list = await Staff.find(filter)
      .populate("clinicAreaId", "name type address")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: list.length,
      staff: list,
    });
  } catch (error) {
    console.error("❌ Error in getAllStaff controller:", error);
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to fetch staff list.",
    });
  }
}

/**
 * PATCH /api/moh/staff/:id/reassign
 * Reassigns a staff member to a target clinic area.
 * Enforces that both the staff member and target clinic area belong to req.user.mohOfficeId.
 */
async function reassignStaff(req, res) {
  try {
    const { id } = req.params;
    const { clinicAreaId } = req.body;
    const mohOfficeId = req.user?.mohOfficeId;

    if (!mohOfficeId) {
      return res.status(409).json({
        message: "No MOH office assigned to this account",
      });
    }

    // 1. Verify staff exists and belongs to doctor's office
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        message: `No staff member found with ID: ${id}`,
      });
    }

    if (staff.mohOfficeId && staff.mohOfficeId.toString() !== mohOfficeId.toString()) {
      return res.status(403).json({
        message: "Access denied. Staff member belongs to a different MOH office",
      });
    }

    // 2. Validate target clinic area using assertClinicAreaOwned (returns 404/403)
    let targetClinicArea;
    try {
      targetClinicArea = await assertClinicAreaOwned(clinicAreaId, mohOfficeId);
    } catch (err) {
      return res.status(err.status || 500).json({
        message: err.message,
      });
    }

    if (targetClinicArea.status !== "active") {
      return res.status(400).json({
        message: "Cannot reassign staff to an inactive clinic area",
      });
    }

    // 3. Update staff assignment
    staff.clinicAreaId = targetClinicArea._id;
    staff.mohOfficeId = mohOfficeId;
    staff.zone = targetClinicArea.name;
    await staff.save();

    return res.status(200).json({
      message: `Staff member '${staff.fullName}' successfully reassigned to '${targetClinicArea.name}'`,
      staff,
    });
  } catch (error) {
    console.error("❌ Error in reassignStaff controller:", error);
    return res.status(500).json({
      message: "An error occurred while reassigning staff member",
    });
  }
}

/**
 * GET /api/moh/staff/:id
 * Retrieves details for a specific staff member.
 */
async function getStaffById(req, res) {
  try {
    const staff = await Staff.findById(req.params.id).populate("clinicAreaId", "name type address");
    if (!staff) {
      return res.status(404).json({
        error: "NotFound",
        message: "Staff member not found.",
      });
    }

    return res.status(200).json(staff);
  } catch (error) {
    console.error("❌ Error in getStaffById controller:", error);
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to retrieve staff details.",
    });
  }
}

/**
 * DELETE /api/moh/staff/:id
 * Permanently removes a staff member from the database.
 */
async function deleteStaff(req, res) {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);

    if (!staff) {
      return res.status(404).json({
        error: "NotFound",
        message: "Staff member not found in database.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Staff member '${staff.fullName}' (${staff.username}) was permanently deleted from the database.`,
      id: staff._id,
    });
  } catch (error) {
    console.error("❌ Error in deleteStaff controller:", error);
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to delete staff member from database.",
    });
  }
}

module.exports = {
  validateStaffInput,
  validateResetPasswordInput,
  createStaff,
  reassignStaff,
  resendCredentials,
  deleteStaff,
  loginStaff,
  resetPassword,
  getAllStaff,
  getStaffById,
};

