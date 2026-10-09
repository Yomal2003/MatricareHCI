/**
 * MOH Office Seeding Script
 * Reads Sri Lanka health hierarchy data from CSV using "csv-parser",
 * handles possible UTF-8 BOM, de-duplicates and bulk upserts
 * MOH offices into MongoDB.
 *
 * Usage:
 *   node scripts/seedMohOffices.js [path/to/hierarchy.csv]
 *   npm run seed:moh
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const MohOffice = require("../src/models/MohOffice");

async function seedMohOffices() {
  const defaultPath = path.resolve(__dirname, "../data/sri_lanka_moh_hierarchy.csv");
  const filePath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultPath;

  console.log(`\n======================================================`);
  console.log(`Starting MOH Offices Seed (CSV)`);
  console.log(`Target file: ${filePath}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: CSV file not found at path: ${filePath}`);
    process.exit(1);
  }

  // Connect to MongoDB
  await connectDB();

  let rowsRead = 0;
  let duplicatesSkipped = 0;
  let invalidRowsSkipped = 0;
  const districtsCovered = new Set();
  const seenKeys = new Set();
  const validRows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        csv({
          // Strip possible UTF-8 BOM and normalize header names to lowercase
          mapHeaders: ({ header }) => header.replace(/^\ufeff/, "").trim().toLowerCase(),
        })
      )
      .on("data", (row) => {
        rowsRead++;

        // Only read province, district, and moh. Ignore all other columns.
        const province = String(row.province || "").trim();
        let district = String(row.district || "").trim();
        const moh = String(row.moh || "").trim();

        // Skip rows with missing required columns
        if (!province || !district || !moh) {
          invalidRowsSkipped++;
          return;
        }

        // Normalize district spelling: "Moneragala" -> "Monaragala"
        if (district.toLowerCase() === "moneragala") {
          district = "Monaragala";
        }

        // Case-insensitive de-duplication on (district, moh)
        const dedupeKey = `${district.toLowerCase()}|${moh.toLowerCase()}`;
        if (seenKeys.has(dedupeKey)) {
          console.log(`ℹ️  Skipped duplicate row in file: MOH '${moh}' under district '${district}'`);
          duplicatesSkipped++;
          return;
        }

        seenKeys.add(dedupeKey);
        districtsCovered.add(district);

        validRows.push({
          province,
          district,
          moh,
        });
      })
      .on("error", async (error) => {
        console.error("❌ Error reading CSV file:", error);
        await mongoose.disconnect();
        reject(error);
      })
      .on("end", async () => {
        try {
          let inserted = 0;
          let alreadyExisting = 0;

          // Idempotent bulk upsert on (district, name)
          if (validRows.length > 0) {
            const bulkOps = validRows.map((r) => ({
              updateOne: {
                filter: {
                  district: new RegExp(`^${r.district.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                  name: new RegExp(`^${r.moh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                },
                update: {
                  $setOnInsert: {
                    province: r.province,
                    district: r.district,
                    name: r.moh,
                  },
                },
                upsert: true,
              },
            }));

            const bulkResult = await MohOffice.bulkWrite(bulkOps);
            inserted = bulkResult.upsertedCount || 0;
            alreadyExisting = bulkResult.matchedCount || 0;
          }

          // Print summary
          console.log(`\n======================================================`);
          console.log(`MOH Offices Seed Summary`);
          console.log(`======================================================`);
          console.log(`Rows read:                ${rowsRead}`);
          console.log(`Offices inserted:         ${inserted}`);
          console.log(`Already existing:         ${alreadyExisting}`);
          console.log(`File duplicates skipped:  ${duplicatesSkipped}`);
          console.log(`Invalid rows skipped:     ${invalidRowsSkipped}`);
          console.log(`Districts covered:        ${districtsCovered.size} (${Array.from(districtsCovered).join(", ")})`);
          console.log(`======================================================\n`);

          await mongoose.disconnect();
          console.log("Disconnected from MongoDB.");
          resolve();
        } catch (err) {
          console.error("❌ Fatal error during bulk upsert:", err);
          await mongoose.disconnect();
          reject(err);
        }
      });
  });
}

if (require.main === module) {
  seedMohOffices().catch(() => process.exit(1));
}

module.exports = seedMohOffices;
