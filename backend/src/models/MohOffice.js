/**
 * MohOffice Model
 * Schema definition for Ministry of Health (MOH) administrative offices.
 * Hierarchy: Province -> District -> MOH Office
 */

const mongoose = require("mongoose");

const mohOfficeSchema = new mongoose.Schema(
  {
    province: {
      type: String,
      required: [true, "Province is required"],
      trim: true,
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "MOH office name is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (district, name)
mohOfficeSchema.index({ district: 1, name: 1 }, { unique: true });

mohOfficeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const MohOffice = mongoose.model("MohOffice", mohOfficeSchema);

module.exports = MohOffice;
