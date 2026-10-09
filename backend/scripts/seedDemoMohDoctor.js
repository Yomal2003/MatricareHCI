/**
 * Demo MOH Doctor Seeding Script
 * Creates one demo MOH doctor user ("Dr. Pradeep Silva") linked to the
 * MohOffice named "Buttala" in district "Monaragala".
 *
 * Password source: env.DEMO_MOH_PASSWORD (fallback: "password123")
 *
 * Usage:
 *   node scripts/seedDemoMohDoctor.js
 */

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const MohOffice = require("../src/models/MohOffice");

async function seedDemoMohDoctor() {
  console.log(`\n======================================================`);
  console.log(`Seeding Demo MOH Doctor User`);
  console.log(`======================================================\n`);

  await connectDB();

  try {
    // 1. Locate the "Buttala" MOH Office in district "Monaragala"
    const buttalaOffice = await MohOffice.findOne({
      district: { $regex: /^monaragala$/i },
      name: { $regex: /^buttala$/i },
    });

    if (!buttalaOffice) {
      console.error(
        `❌ Error: Buttala MOH Office in Monaragala district was not found.\nPlease run 'npm run seed:moh' first to seed MOH offices.`
      );
      process.exit(1);
    }

    console.log(`📍 Found MOH Office: '${buttalaOffice.name}' in '${buttalaOffice.district}' (${buttalaOffice._id})`);

    // 2. Check if the demo doctor already exists
    const existingDoctor = await User.findOne({
      $or: [
        { staffId: "MOH001" },
        { name: "Dr. Pradeep Silva", role: "moh" },
      ],
    });

    if (existingDoctor) {
      console.log(`ℹ️  Demo MOH Doctor 'Dr. Pradeep Silva' already exists. Skipping creation.`);
      if (!existingDoctor.mohOfficeId || existingDoctor.mohOfficeId.toString() !== buttalaOffice._id.toString()) {
        existingDoctor.mohOfficeId = buttalaOffice._id;
        await existingDoctor.save();
        console.log(`🔗 Updated existing doctor's mohOfficeId to '${buttalaOffice.name}' (${buttalaOffice._id}).`);
      }
      return;
    }

    // 3. Create demo doctor
    const rawPassword = process.env.DEMO_MOH_PASSWORD || "password123";

    const doctor = new User({
      name: "Dr. Pradeep Silva",
      role: "moh",
      staffId: "MOH001",
      password: rawPassword, // Model pre-save hook will hash with bcrypt 10 rounds
      badge: "MOH · Monaragala District",
      area: "Monaragala",
      mohOfficeId: buttalaOffice._id,
      active: true,
      language: "en",
    });

    await doctor.save();

    console.log(`\n✅ Demo MOH Doctor created successfully:`);
    console.log(`   Name:         ${doctor.name}`);
    console.log(`   Staff ID:     ${doctor.staffId}`);
    console.log(`   Role:         ${doctor.role}`);
    console.log(`   Office:       ${buttalaOffice.name} (${buttalaOffice.district})`);
    console.log(`   MOH Office ID:${buttalaOffice._id}`);
  } catch (error) {
    console.error("❌ Fatal error seeding demo MOH doctor:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.\n");
  }
}

if (require.main === module) {
  seedDemoMohDoctor();
}

module.exports = seedDemoMohDoctor;
