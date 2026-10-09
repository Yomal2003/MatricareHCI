/**
 * Automated Test Runner for MOH Office & Clinic Area Endpoints
 * Tests all requirements:
 * 1. Login MOH doctor & verify mohOfficeId in JWT
 * 2. GET /api/moh/my-office with no clinic areas -> returns 200 with empty array
 * 3. POST /api/moh/clinic-areas -> returns 201
 * 4. Duplicate clinic area name -> returns 409
 * 5. PUT another office's clinic area -> returns 403
 * 6. Create staff under the clinic area -> returns 201
 * 7. PATCH /api/moh/clinic-areas/:id/deactivate with active staff -> returns 409
 * 8. POST staff with clinic area from different office -> returns 403
 * 9. Create second clinic area & PATCH /api/moh/staff/:id/reassign -> returns 200
 * 10. Deactivate first clinic area now that staff is reassigned -> returns 200
 */

const http = require("http");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const app = require("../src/app");
const MohOffice = require("../src/models/MohOffice");
const { ClinicArea } = require("../src/models/ClinicArea");
const { Staff } = require("../src/models/Staff");
const User = require("../src/models/User");

async function runTests() {
  console.log("Starting endpoint verification tests...\n");
  await connectDB();

  // Start express server on a random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // 1. Get or create two MOH Offices
    const buttalaOffice = await MohOffice.findOne({ name: { $regex: /^buttala$/i } });
    if (!buttalaOffice) throw new Error("Buttala MOH office not found. Run seed:moh first.");

    let otherOffice = await MohOffice.findOne({ _id: { $ne: buttalaOffice._id } });
    if (!otherOffice) throw new Error("Need a second MOH office for cross-office tests.");

    // Clean up test clinic areas in buttalaOffice and otherOffice
    await Staff.deleteMany({ mohOfficeId: { $in: [buttalaOffice._id, otherOffice._id] } });
    await ClinicArea.deleteMany({ mohOfficeId: { $in: [buttalaOffice._id, otherOffice._id] } });

    // 2. Doctor login
    let doctor = await User.findOne({ role: "moh", staffId: "MOH001" });
    if (!doctor) throw new Error("Doctor MOH001 not found.");
    doctor.mohOfficeId = buttalaOffice._id;
    await doctor.save();

    console.log("➡️ Test 1: Doctor Login & JWT with mohOfficeId");
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "MOH001", password: process.env.DEMO_MOH_PASSWORD || "password123" }),
    });
    const loginData = await loginRes.json();
    console.log(`Login status: ${loginRes.status}`);
    const token = loginData.token;
    if (!token) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    console.log(`✅ Token received. user.mohOfficeId: ${loginData.user.mohOfficeId}`);

    // Verify JWT payload has mohOfficeId
    const jwtPayload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    console.log(`✅ Decoded JWT mohOfficeId: ${jwtPayload.mohOfficeId}`);
    if (jwtPayload.mohOfficeId !== buttalaOffice._id.toString()) {
      throw new Error("JWT does not contain correct mohOfficeId!");
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 3. GET /api/moh/my-office with NO clinic areas
    console.log("\n➡️ Test 2: GET /api/moh/my-office (Empty clinic areas)");
    const myOfficeRes1 = await fetch(`${baseUrl}/api/moh/my-office`, { headers: authHeaders });
    const myOfficeData1 = await myOfficeRes1.json();
    console.log(`Status: ${myOfficeRes1.status}`);
    console.log(`ClinicAreas count: ${myOfficeData1.clinicAreas.length}, Totals:`, myOfficeData1.totals);
    if (myOfficeRes1.status !== 200 || myOfficeData1.clinicAreas.length !== 0) {
      throw new Error("Expected 200 with empty clinicAreas array");
    }
    console.log("✅ Passed!");

    // 4. POST /api/moh/clinic-areas (Create clinic area)
    console.log("\n➡️ Test 3: POST /api/moh/clinic-areas (Create clinic area)");
    const createCaRes = await fetch(`${baseUrl}/api/moh/clinic-areas`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Pelwatte Central Clinic",
        type: "MCH_CLINIC",
        address: "Pelwatte East Road, Buttala",
      }),
    });
    const createCaData = await createCaRes.json();
    console.log(`Status: ${createCaRes.status}, Created ID: ${createCaData.id}`);
    if (createCaRes.status !== 201 || createCaData.name !== "Pelwatte Central Clinic") {
      throw new Error(`Expected 201 created. Got: ${JSON.stringify(createCaData)}`);
    }
    const ca1Id = createCaData.id;
    console.log("✅ Passed!");

    // 5. Duplicate name in same office -> 409
    console.log("\n➡️ Test 4: POST /api/moh/clinic-areas (Duplicate name check -> 409)");
    const dupRes = await fetch(`${baseUrl}/api/moh/clinic-areas`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "pelwatte central clinic", // case-insensitive check
        type: "OTHER",
      }),
    });
    const dupData = await dupRes.json();
    console.log(`Status: ${dupRes.status}, Message: ${dupData.message}`);
    if (dupRes.status !== 409) {
      throw new Error("Expected 409 Conflict for duplicate name");
    }
    console.log("✅ Passed!");

    // 6. Editing another office's clinic area -> 403
    console.log("\n➡️ Test 5: PUT /api/moh/clinic-areas/:id (Another office's clinic area -> 403)");
    const otherOfficeArea = await ClinicArea.create({
      name: "Foreign Clinic Area",
      type: "MCH_CLINIC",
      mohOfficeId: otherOffice._id,
      status: "active",
    });
    const putForeignRes = await fetch(`${baseUrl}/api/moh/clinic-areas/${otherOfficeArea._id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ name: "Attempted Update" }),
    });
    const putForeignData = await putForeignRes.json();
    console.log(`Status: ${putForeignRes.status}, Message: ${putForeignData.message}`);
    if (putForeignRes.status !== 403) {
      throw new Error("Expected 403 Forbidden when modifying other office's clinic area");
    }
    console.log("✅ Passed!");

    // 7. Create staff under ca1
    console.log("\n➡️ Test 6: POST /api/moh/staff (Create staff under clinic area)");
    const staffRes = await fetch(`${baseUrl}/api/moh/staff`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        fullName: "Anula Kumarihamy",
        role: "PHM",
        clinicAreaId: ca1Id,
        phone: "+94771234567",
        email: "anula.kumari@example.com",
      }),
    });
    const staffData = await staffRes.json();
    console.log(`Status: ${staffRes.status}, Staff ID: ${staffData.id}, Username: ${staffData.username}`);
    if (staffRes.status !== 201) {
      throw new Error(`Expected 201 created staff. Got: ${JSON.stringify(staffData)}`);
    }
    const staffId = staffData.id;
    console.log("✅ Passed!");

    // 8. Deactivate clinic area with active staff -> 409
    console.log("\n➡️ Test 7: PATCH /api/moh/clinic-areas/:id/deactivate (With active staff -> 409)");
    const deactRes = await fetch(`${baseUrl}/api/moh/clinic-areas/${ca1Id}/deactivate`, {
      method: "PATCH",
      headers: authHeaders,
    });
    const deactData = await deactRes.json();
    console.log(`Status: ${deactRes.status}, Message: ${deactData.message}`);
    if (deactRes.status !== 409 || !deactData.activeStaffCount) {
      throw new Error("Expected 409 Conflict with activeStaffCount");
    }
    console.log("✅ Passed!");

    // 9. Creating staff in a clinic area from a different office -> 403
    console.log("\n➡️ Test 8: POST /api/moh/staff (Using foreign clinic area -> 403)");
    const foreignStaffRes = await fetch(`${baseUrl}/api/moh/staff`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        fullName: "Susantha Perera",
        role: "CLINIC STAFF",
        clinicAreaId: otherOfficeArea._id.toString(),
        phone: "+94719876543",
        email: "susantha@example.com",
      }),
    });
    const foreignStaffData = await foreignStaffRes.json();
    console.log(`Status: ${foreignStaffRes.status}, Message: ${foreignStaffData.message}`);
    if (foreignStaffRes.status !== 403) {
      throw new Error("Expected 403 Forbidden when creating staff in foreign clinic area");
    }
    console.log("✅ Passed!");

    // 10. Create second clinic area and reassign staff -> 200
    console.log("\n➡️ Test 9: Create second clinic area & PATCH /api/moh/staff/:id/reassign -> 200");
    const ca2Res = await fetch(`${baseUrl}/api/moh/clinic-areas`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Malwatte Sub Clinic",
        type: "IMMUNIZATION_CLINIC",
      }),
    });
    const ca2Data = await ca2Res.json();
    const ca2Id = ca2Data.id;

    const reassignRes = await fetch(`${baseUrl}/api/moh/staff/${staffId}/reassign`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ clinicAreaId: ca2Id }),
    });
    const reassignData = await reassignRes.json();
    console.log(`Status: ${reassignRes.status}, Message: ${reassignData.message}`);
    if (reassignRes.status !== 200 || reassignData.staff.clinicAreaId.toString() !== ca2Id.toString()) {
      throw new Error(`Expected 200 reassign. Got: ${JSON.stringify(reassignData)}`);
    }
    console.log("✅ Passed!");

    // 11. Deactivate first clinic area now that staff is reassigned -> 200
    console.log("\n➡️ Test 10: PATCH /api/moh/clinic-areas/:id/deactivate (Now with 0 staff -> 200)");
    const deactRes2 = await fetch(`${baseUrl}/api/moh/clinic-areas/${ca1Id}/deactivate`, {
      method: "PATCH",
      headers: authHeaders,
    });
    const deactData2 = await deactRes2.json();
    console.log(`Status: ${deactRes2.status}, New Status: ${deactData2.status}`);
    if (deactRes2.status !== 200 || deactData2.status !== "inactive") {
      throw new Error("Expected 200 deactivated");
    }
    console.log("✅ Passed!");

    // 12. GET /api/moh/my-office should show totals and clinicAreas
    console.log("\n➡️ Test 11: GET /api/moh/my-office (Active only vs includeInactive=true)");
    const myOfficeActive = await (await fetch(`${baseUrl}/api/moh/my-office`, { headers: authHeaders })).json();
    const myOfficeAll = await (await fetch(`${baseUrl}/api/moh/my-office?includeInactive=true`, { headers: authHeaders })).json();

    console.log(`Active clinic areas: ${myOfficeActive.clinicAreas.length} (expected 1: Malwatte)`);
    console.log(`Total clinic areas (includeInactive=true): ${myOfficeAll.clinicAreas.length} (expected 2)`);
    console.log(`Totals:`, myOfficeActive.totals);
    if (myOfficeActive.clinicAreas.length !== 1 || myOfficeAll.clinicAreas.length !== 2) {
      throw new Error("Mismatch in active vs inactive clinic areas filter");
    }
    console.log("✅ Passed!");

    console.log("\n🎉 ALL 11 TESTS PASSED SUCCESSFULLY! Everything working as specified.");
  } catch (error) {
    console.error("\n❌ Test failure:", error);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log("Server closed and DB disconnected.\n");
  }
}

runTests();
