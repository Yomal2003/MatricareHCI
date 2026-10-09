/**
 * Ownership Helper Utilities
 * Centralized verification to prevent cross-office data leakage.
 */

const mongoose = require("mongoose");
const { ClinicArea } = require("../models/ClinicArea");
const { Staff } = require("../models/Staff");

/**
 * Asserts that a clinic area exists and is owned by the specified MOH Office.
 * Throws an Error with an HTTP status code if ownership or existence checks fail.
 *
 * @param {string|mongoose.Types.ObjectId} clinicAreaId
 * @param {string|mongoose.Types.ObjectId} mohOfficeId
 * @returns {Promise<import("mongoose").Document>} The verified ClinicArea document
 */
async function assertClinicAreaOwned(clinicAreaId, mohOfficeId) {
  if (!clinicAreaId || !mongoose.Types.ObjectId.isValid(clinicAreaId)) {
    const error = new Error("Invalid or missing clinic area ID");
    error.status = 400;
    throw error;
  }

  const clinicArea = await ClinicArea.findById(clinicAreaId);
  if (!clinicArea) {
    const error = new Error("Clinic area not found");
    error.status = 404;
    throw error;
  }

  if (
    !mohOfficeId ||
    !clinicArea.mohOfficeId ||
    clinicArea.mohOfficeId.toString() !== mohOfficeId.toString()
  ) {
    const error = new Error("Access denied. Clinic area belongs to a different MOH office");
    error.status = 403;
    throw error;
  }

  return clinicArea;
}

/**
 * Asserts that a staff member exists and belongs to the specified MOH Office.
 *
 * @param {string|mongoose.Types.ObjectId} staffId
 * @param {string|mongoose.Types.ObjectId} mohOfficeId
 * @returns {Promise<import("mongoose").Document>} The verified Staff document
 */
async function assertStaffOwned(staffId, mohOfficeId) {
  if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
    const error = new Error("Invalid or missing staff ID");
    error.status = 400;
    throw error;
  }

  const staff = await Staff.findById(staffId);
  if (!staff) {
    const error = new Error("Staff member not found");
    error.status = 404;
    throw error;
  }

  if (
    !mohOfficeId ||
    (staff.mohOfficeId && staff.mohOfficeId.toString() !== mohOfficeId.toString())
  ) {
    const error = new Error("Access denied. Staff member belongs to a different MOH office");
    error.status = 403;
    throw error;
  }

  return staff;
}

module.exports = {
  assertClinicAreaOwned,
  assertStaffOwned,
};
