/**
 * Staff Zone Migration Script
 * Migrates existing Staff documents with legacy free-text "zone" fields
 * to have clinicAreaId: null, and logs how many staff members need reassignment.
 *
 * Usage:
 *   node scripts/migrateStaffZoneToClinicArea.js
 */

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const { Staff } = require("../src/models/Staff");

async function migrateStaffZone() {
  console.log(`\n======================================================`);
  console.log(`Starting Legacy Staff Zone -> ClinicArea Migration`);
  console.log(`======================================================\n`);

  await connectDB();

  try {
    // Find all staff documents where clinicAreaId does not exist or is null
    const legacyStaff = await Staff.find({
      $or: [
        { clinicAreaId: { $exists: false } },
        { clinicAreaId: null },
      ],
    });

    console.log(`Found ${legacyStaff.length} staff records requiring migration.`);

    if (legacyStaff.length === 0) {
      console.log(`✅ All staff records already have a valid clinicAreaId structure.`);
      return;
    }

    // Set clinicAreaId to null for all legacy staff records using updateMany to avoid schema validation blocks
    const updateResult = await Staff.updateMany(
      {
        $or: [
          { clinicAreaId: { $exists: false } },
          { clinicAreaId: null },
        ],
      },
      {
        $set: { clinicAreaId: null },
      }
    );

    console.log(`\n======================================================`);
    console.log(`Migration Summary`);
    console.log(`======================================================`);
    console.log(`Staff records updated:     ${updateResult.modifiedCount || legacyStaff.length}`);
    console.log(`Staff needing reassignment:${legacyStaff.length}`);
    console.log(`Legacy zones found:        ${[...new Set(legacyStaff.map((s) => s.zone).filter(Boolean))].join(", ") || "None"}`);
    console.log(`======================================================`);
    console.log(`⚠️  ACTION REQUIRED: MOH doctors should reassign these staff`);
    console.log(`    members to specific clinic areas via the management portal.\n`);
  } catch (error) {
    console.error("❌ Error during staff zone migration:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.\n");
  }
}

if (require.main === module) {
  migrateStaffZone();
}

module.exports = migrateStaffZone;
