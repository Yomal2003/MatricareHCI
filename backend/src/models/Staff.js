/**
 * Staff Model
 * Schema definition for healthcare field workers registered by MOH doctors.
 */

const mongoose = require("mongoose");

const STAFF_ROLES = ["PHM", "NURSING_OFFICER", "CLINIC_STAFF"];
const STAFF_STATUSES = ["active", "inactive"];
const EMAIL_STATUSES = ["sent", "failed"];

const staffSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      set: (val) => {
        if (!val) return val;
        const upper = String(val).trim().toUpperCase();
        if (upper === "NURSING OFFICER") return "NURSING_OFFICER";
        if (upper === "CLINIC STAFF") return "CLINIC_STAFF";
        return upper;
      },
      enum: {
        values: STAFF_ROLES,
        message: "{VALUE} is not a valid staff role",
      },
    },
    zone: {
      type: String,
      required: [true, "Zone is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false, // Excluded by default in queries for security
    },
    mustResetPassword: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: STAFF_STATUSES,
      default: "active",
    },
    emailStatus: {
      type: String,
      enum: EMAIL_STATUSES,
      default: "sent",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // MOH user ID
    },
  },
  {
    timestamps: true,
  }
);

// Secondary index on role for fast filtering
staffSchema.index({ role: 1 });

/**
 * toJSON Transform
 * Strips passwordHash, __v, and formats _id to id.
 * NEVER returns passwordHash in any serialized output.
 */
staffSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

/**
 * Sequence Counter Schema for Atomic Username Generation
 * Tracks the highest sequence number per role prefix (e.g. PHM, NO, CS)
 */
const staffCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Prefix: 'PHM' | 'NO' | 'CS'
  seq: { type: Number, default: 0 },
});

const Staff = mongoose.model("Staff", staffSchema);
const StaffCounter = mongoose.model("StaffCounter", staffCounterSchema);

module.exports = {
  Staff,
  StaffCounter,
  STAFF_ROLES,
  STAFF_STATUSES,
  EMAIL_STATUSES,
};
