/**
 * One-Off Backfill Script for Record Offices & Clinic Areas
 * Backfills clinicAreaId and mohOfficeId for existing records:
 * Mothers, Children, Visits, Immunizations, Growth, Appointments, and Alerts.
 * Logs any records that cannot be resolved.
 *
 * Usage:
 *   node scripts/backfillRecordOffices.js
 */

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const {
  User,
  Mother,
  Child,
  Visit,
  Immunization,
  Growth,
  Appointment,
  Alert,
  MohOffice,
  ClinicArea,
  Staff,
} = require("../src/models");

async function backfillRecordOffices() {
  console.log("\n======================================================");
  console.log("Starting Records Office & Clinic Area Backfill");
  console.log("======================================================\n");

  await connectDB();

  try {
    // 1. Preload reference data
    const [offices, clinicAreas, staffMembers, users] = await Promise.all([
      MohOffice.find({}).lean(),
      ClinicArea.find({}).lean(),
      Staff.find({}).lean(),
      User.find({}).lean(),
    ]);

    console.log(`Loaded ${offices.length} MOH offices, ${clinicAreas.length} clinic areas, ${staffMembers.length} staff, ${users.length} users.`);

    // Fallback default office if only one exists (e.g. Buttala)
    const defaultOffice = offices.find((o) => /buttala/i.test(o.name)) || offices[0];
    if (defaultOffice) {
      console.log(`Default Office Anchor: '${defaultOffice.name}' (${defaultOffice._id})`);
    }

    // Name normalization helper
    const cleanStr = (s) => String(s || "").toLowerCase().replace(/\b(clinic|division|moh|health|office|rural|mch)\b/gi, "").trim();

    // Build lookup maps
    const clinicAreaMapByName = new Map();
    for (const ca of clinicAreas) {
      clinicAreaMapByName.set(cleanStr(ca.name), ca);
      clinicAreaMapByName.set(String(ca.name).toLowerCase().trim(), ca);
    }

    const staffByUsername = new Map();
    const staffById = new Map();
    for (const s of staffMembers) {
      if (s.username) staffByUsername.set(s.username.toUpperCase(), s);
      staffById.set(s._id.toString(), s);
    }

    const userById = new Map();
    for (const u of users) {
      userById.set(u._id.toString(), u);
    }

    // Helper: Resolve office and clinicArea for a user
    const resolveForUser = (userId) => {
      if (!userId) return null;
      const u = userById.get(userId.toString());
      if (!u) return null;

      if (u.mohOfficeId && u.clinicAreaId) {
        return { mohOfficeId: u.mohOfficeId, clinicAreaId: u.clinicAreaId };
      }

      // Check linked Staff
      if (u.staffId && staffByUsername.has(u.staffId.toUpperCase())) {
        const s = staffByUsername.get(u.staffId.toUpperCase());
        return { mohOfficeId: s.mohOfficeId || defaultOffice?._id, clinicAreaId: s.clinicAreaId };
      }

      // Check area
      const areaKey = cleanStr(u.area || u.clinic);
      if (areaKey && clinicAreaMapByName.has(areaKey)) {
        const ca = clinicAreaMapByName.get(areaKey);
        return { mohOfficeId: ca.mohOfficeId, clinicAreaId: ca._id };
      }

      return null;
    };

    // 2. Ensure Users have mohOfficeId & clinicAreaId where possible
    console.log("\n--- Checking and updating User documents ---");
    let usersUpdated = 0;
    for (const u of users) {
      let changed = false;
      if (!u.mohOfficeId) {
        if (/moh/i.test(u.role) && defaultOffice) {
          u.mohOfficeId = defaultOffice._id;
          changed = true;
        } else if (u.staffId && staffByUsername.has(u.staffId.toUpperCase())) {
          const s = staffByUsername.get(u.staffId.toUpperCase());
          if (s.mohOfficeId) {
            u.mohOfficeId = s.mohOfficeId;
            changed = true;
          }
        }
      }
      if (!u.clinicAreaId && (u.area || u.clinic)) {
        const ca = clinicAreaMapByName.get(cleanStr(u.area || u.clinic));
        if (ca) {
          u.clinicAreaId = ca._id;
          if (!u.mohOfficeId) u.mohOfficeId = ca.mohOfficeId;
          changed = true;
        }
      }
      if (changed) {
        await User.updateOne({ _id: u._id }, { $set: { mohOfficeId: u.mohOfficeId, clinicAreaId: u.clinicAreaId } });
        usersUpdated++;
      }
    }
    console.log(`Updated ${usersUpdated} users with office/clinic assignments.`);

    // 3. Backfill Mothers
    console.log("\n--- Backfilling Mothers ---");
    const mothers = await Mother.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let mothersUpdated = 0;
    const unresolvedMothers = [];

    for (const m of mothers) {
      let resolved = resolveForUser(m.assignedPhm);

      if (!resolved && (m.phmArea || m.village)) {
        const ca = clinicAreaMapByName.get(cleanStr(m.phmArea || m.village));
        if (ca) {
          resolved = { mohOfficeId: ca.mohOfficeId, clinicAreaId: ca._id };
        }
      }

      if (!resolved && defaultOffice && clinicAreas.length > 0) {
        resolved = { mohOfficeId: defaultOffice._id, clinicAreaId: clinicAreas[0]._id };
      }

      if (resolved) {
        m.mohOfficeId = resolved.mohOfficeId;
        m.clinicAreaId = resolved.clinicAreaId;
        await m.save();
        mothersUpdated++;
      } else {
        unresolvedMothers.push({ id: m._id, code: m.code, name: m.name });
      }
    }
    console.log(`Mothers updated: ${mothersUpdated}, Unresolved: ${unresolvedMothers.length}`);

    // Map motherId -> { mohOfficeId, clinicAreaId }
    const allMothers = await Mother.find({}).select("_id mohOfficeId clinicAreaId name code").lean();
    const motherOfficeMap = new Map();
    for (const m of allMothers) {
      if (m.mohOfficeId && m.clinicAreaId) {
        motherOfficeMap.set(m._id.toString(), { mohOfficeId: m.mohOfficeId, clinicAreaId: m.clinicAreaId });
      }
    }

    // 4. Backfill Children
    console.log("\n--- Backfilling Children ---");
    const children = await Child.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let childrenUpdated = 0;
    const unresolvedChildren = [];

    for (const c of children) {
      const parentOffice = motherOfficeMap.get(c.mother?.toString());
      if (parentOffice) {
        c.mohOfficeId = parentOffice.mohOfficeId;
        c.clinicAreaId = parentOffice.clinicAreaId;
        await c.save();
        childrenUpdated++;
      } else {
        unresolvedChildren.push({ id: c._id, code: c.code, name: c.name });
      }
    }
    console.log(`Children updated: ${childrenUpdated}, Unresolved: ${unresolvedChildren.length}`);

    // Map childId -> { mohOfficeId, clinicAreaId }
    const allChildren = await Child.find({}).select("_id mother mohOfficeId clinicAreaId").lean();
    const childOfficeMap = new Map();
    for (const c of allChildren) {
      if (c.mohOfficeId && c.clinicAreaId) {
        childOfficeMap.set(c._id.toString(), { mohOfficeId: c.mohOfficeId, clinicAreaId: c.clinicAreaId });
      }
    }

    // 5. Backfill Visits
    console.log("\n--- Backfilling Visits ---");
    const visits = await Visit.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let visitsUpdated = 0;
    const unresolvedVisits = [];

    for (const v of visits) {
      let resolved = resolveForUser(v.recordedBy);
      if (!resolved && v.mother) {
        resolved = motherOfficeMap.get(v.mother.toString());
      }

      if (resolved) {
        v.mohOfficeId = resolved.mohOfficeId;
        v.clinicAreaId = resolved.clinicAreaId;
        await v.save();
        visitsUpdated++;
      } else {
        unresolvedVisits.push({ id: v._id, type: v.type, date: v.date });
      }
    }
    console.log(`Visits updated: ${visitsUpdated}, Unresolved: ${unresolvedVisits.length}`);

    // 6. Backfill Immunizations
    console.log("\n--- Backfilling Immunizations ---");
    const immunizations = await Immunization.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let immUpdated = 0;
    const unresolvedImm = [];

    for (const imm of immunizations) {
      let resolved = resolveForUser(imm.recordedBy);
      if (!resolved && imm.child) {
        resolved = childOfficeMap.get(imm.child.toString());
      }
      if (!resolved && imm.mother) {
        resolved = motherOfficeMap.get(imm.mother.toString());
      }

      if (resolved) {
        imm.mohOfficeId = resolved.mohOfficeId;
        imm.clinicAreaId = resolved.clinicAreaId;
        await imm.save();
        immUpdated++;
      } else {
        unresolvedImm.push({ id: imm._id, vaccine: imm.vaccine });
      }
    }
    console.log(`Immunizations updated: ${immUpdated}, Unresolved: ${unresolvedImm.length}`);

    // 7. Backfill Growth Records
    console.log("\n--- Backfilling Growth Records ---");
    const growths = await Growth.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let growthUpdated = 0;
    const unresolvedGrowth = [];

    for (const g of growths) {
      let resolved = resolveForUser(g.recordedBy);
      if (!resolved && g.child) {
        resolved = childOfficeMap.get(g.child.toString());
      }

      if (resolved) {
        g.mohOfficeId = resolved.mohOfficeId;
        g.clinicAreaId = resolved.clinicAreaId;
        await g.save();
        growthUpdated++;
      } else {
        unresolvedGrowth.push({ id: g._id, child: g.child });
      }
    }
    console.log(`Growth records updated: ${growthUpdated}, Unresolved: ${unresolvedGrowth.length}`);

    // 8. Backfill Appointments
    console.log("\n--- Backfilling Appointments ---");
    const appointments = await Appointment.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let apptUpdated = 0;
    const unresolvedAppt = [];

    for (const appt of appointments) {
      let resolved = appt.mother ? motherOfficeMap.get(appt.mother.toString()) : null;
      if (!resolved && appt.phmArea) {
        const ca = clinicAreaMapByName.get(cleanStr(appt.phmArea));
        if (ca) resolved = { mohOfficeId: ca.mohOfficeId, clinicAreaId: ca._id };
      }

      if (resolved) {
        appt.mohOfficeId = resolved.mohOfficeId;
        appt.clinicAreaId = resolved.clinicAreaId;
        await appt.save();
        apptUpdated++;
      } else {
        unresolvedAppt.push({ id: appt._id, type: appt.type, date: appt.date });
      }
    }
    console.log(`Appointments updated: ${apptUpdated}, Unresolved: ${unresolvedAppt.length}`);

    // 9. Backfill Alerts
    console.log("\n--- Backfilling Alerts ---");
    const alerts = await Alert.find({
      $or: [{ mohOfficeId: { $exists: false } }, { mohOfficeId: null }, { clinicAreaId: { $exists: false } }, { clinicAreaId: null }],
    });

    let alertsUpdated = 0;
    const unresolvedAlerts = [];

    for (const a of alerts) {
      let resolved = a.mother ? motherOfficeMap.get(a.mother.toString()) : null;
      if (!resolved && a.child) {
        resolved = childOfficeMap.get(a.child.toString());
      }
      if (!resolved && a.area) {
        const ca = clinicAreaMapByName.get(cleanStr(a.area));
        if (ca) resolved = { mohOfficeId: ca.mohOfficeId, clinicAreaId: ca._id };
      }

      if (resolved) {
        a.mohOfficeId = resolved.mohOfficeId;
        a.clinicAreaId = resolved.clinicAreaId;
        await a.save();
        alertsUpdated++;
      } else {
        unresolvedAlerts.push({ id: a._id, reason: a.reason, area: a.area });
      }
    }
    console.log(`Alerts updated: ${alertsUpdated}, Unresolved: ${unresolvedAlerts.length}`);

    // 10. Summary Report
    console.log("\n======================================================");
    console.log("BACKFILL SUMMARY");
    console.log("======================================================");
    console.log(`Users Updated:         ${usersUpdated}`);
    console.log(`Mothers Updated:       ${mothersUpdated} (Unresolved: ${unresolvedMothers.length})`);
    console.log(`Children Updated:      ${childrenUpdated} (Unresolved: ${unresolvedChildren.length})`);
    console.log(`Visits Updated:        ${visitsUpdated} (Unresolved: ${unresolvedVisits.length})`);
    console.log(`Immunizations Updated: ${immUpdated} (Unresolved: ${unresolvedImm.length})`);
    console.log(`Growth Updated:        ${growthUpdated} (Unresolved: ${unresolvedGrowth.length})`);
    console.log(`Appointments Updated:  ${apptUpdated} (Unresolved: ${unresolvedAppt.length})`);
    console.log(`Alerts Updated:        ${alertsUpdated} (Unresolved: ${unresolvedAlerts.length})`);
    console.log("======================================================\n");

    if (
      unresolvedMothers.length > 0 ||
      unresolvedVisits.length > 0 ||
      unresolvedImm.length > 0 ||
      unresolvedAppt.length > 0 ||
      unresolvedAlerts.length > 0
    ) {
      console.warn("⚠️  Some records could not be resolved automatically:");
      if (unresolvedMothers.length) console.warn("Unresolved Mothers:", unresolvedMothers);
      if (unresolvedVisits.length) console.warn("Unresolved Visits:", unresolvedVisits);
      if (unresolvedImm.length) console.warn("Unresolved Immunizations:", unresolvedImm);
      if (unresolvedAppt.length) console.warn("Unresolved Appointments:", unresolvedAppt);
      if (unresolvedAlerts.length) console.warn("Unresolved Alerts:", unresolvedAlerts);
    } else {
      console.log("✅ All records successfully resolved and backfilled!");
    }
  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.\n");
  }
}

if (require.main === module) {
  backfillRecordOffices();
}

module.exports = backfillRecordOffices;
