/**
 * ClinicArea Model
 * Represents local clinic areas created under an MOH Office.
 * Hierarchy: MOH Office -> Clinic Area -> Staff
 */

const mongoose = require("mongoose");

const CLINIC_TYPES = [
  "MCH_CLINIC",
  "IMMUNIZATION_CLINIC",
  "WELL_WOMAN_CLINIC",
  "OTHER",
];

const CLINIC_STATUSES = ["active", "inactive"];

const clinicAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Clinic area name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: CLINIC_TYPES,
        message: "{VALUE} is not a valid clinic area type",
      },
      default: "MCH_CLINIC",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: CLINIC_STATUSES,
        message: "{VALUE} is not a valid status",
      },
      default: "active",
    },
    mohOfficeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MohOffice",
      required: [true, "MOH office ID is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (mohOfficeId, name), compared case-insensitively
clinicAreaSchema.index(
  { mohOfficeId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);

clinicAreaSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const ClinicArea = mongoose.model("ClinicArea", clinicAreaSchema);

module.exports = {
  ClinicArea,
  CLINIC_TYPES,
  CLINIC_STATUSES,
};
