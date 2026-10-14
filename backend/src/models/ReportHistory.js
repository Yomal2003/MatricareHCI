/**
 * ReportHistory Model
 * Tracks generated MOH reports for download and history inspection.
 */

const mongoose = require("mongoose");

const reportHistorySchema = new mongoose.Schema(
  {
    mohOfficeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MohOffice",
      required: true,
      index: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["weekly", "monthly", "area"],
      required: true,
      index: true,
    },
    period: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ["pdf", "xlsx"],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

reportHistorySchema.index({ mohOfficeId: 1, createdAt: -1 });

reportHistorySchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("ReportHistory", reportHistorySchema);
