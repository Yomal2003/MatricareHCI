/**
 * Automated Verification Script for MOH Dashboard, Alerts, and Reports Endpoints
 */

const http = require("http");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const app = require("../src/app");
const { User, MohOffice, ClinicArea, Alert, Mother } = require("../src/models");

async function runTests() {
  console.log("\n======================================================");
  console.log("Running MOH Dashboard, Alerts & Reports Verification");
  console.log("======================================================\n");

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // 1. Get Buttala Office
    const buttalaOffice = await MohOffice.findOne({ name: { $regex: /^buttala$/i } });
    if (!buttalaOffice) throw new Error("Buttala MOH office not found.");

    // Ensure doctor MOH001 has buttalaOffice
    let doctor = await User.findOne({ staffId: "MOH001" });
    if (!doctor) {
      doctor = await User.create({
        name: "Dr. Pradeep Silva",
        role: "moh",
        staffId: "MOH001",
        password: "password123",
        mohOfficeId: buttalaOffice._id,
      });
    } else {
      doctor.mohOfficeId = buttalaOffice._id;
      await doctor.save();
    }

    // Login doctor
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "MOH001", password: "password123" }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    if (!token) throw new Error("Login failed: " + JSON.stringify(loginData));
    console.log("✅ Doctor MOH001 logged in. Token acquired.");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // TEST 1: Dashboard for office with data
    console.log("\n➡️ Test 1: GET /api/moh/dashboard (Office with data)");
    const dashRes = await fetch(`${baseUrl}/api/moh/dashboard`, { headers: authHeaders });
    const dashData = await dashRes.json();
    console.log("Dashboard response status:", dashRes.status);
    console.log("MOH Office:", dashData.mohOffice);
    console.log("Doctor:", dashData.doctor);
    console.log("Indicators:", dashData.indicators);
    console.log("Zone compliance count:", dashData.zoneCompliance?.length);
    console.log("Recent activity count:", dashData.recentActivity?.length);
    if (dashRes.status !== 200 || !dashData.indicators) throw new Error("Dashboard failed");
    console.log("✅ Test 1 PASSED");

    // TEST 2: Alerts list with counts
    console.log("\n➡️ Test 2: GET /api/moh/alerts");
    const alertsRes = await fetch(`${baseUrl}/api/moh/alerts`, { headers: authHeaders });
    const alertsData = await alertsRes.json();
    console.log("Alerts status:", alertsRes.status);
    console.log("Counts:", alertsData.counts);
    console.log("Items count:", alertsData.items?.length);
    if (alertsRes.status !== 200 || !alertsData.counts) throw new Error("Alerts list failed");
    console.log("✅ Test 2 PASSED");

    // TEST 3: Alerts filtered by type=high_risk
    console.log("\n➡️ Test 3: GET /api/moh/alerts?type=high_risk");
    const hrAlertsRes = await fetch(`${baseUrl}/api/moh/alerts?type=high_risk`, { headers: authHeaders });
    const hrAlertsData = await hrAlertsRes.json();
    console.log("High risk items count:", hrAlertsData.items?.length);
    if (hrAlertsRes.status !== 200) throw new Error("High risk alerts failed");
    console.log("✅ Test 3 PASSED");

    // TEST 4: Alert detail
    if (alertsData.items?.length > 0) {
      const sampleId = alertsData.items[0].id;
      console.log(`\n➡️ Test 4: GET /api/moh/alerts/${sampleId}`);
      const detailRes = await fetch(`${baseUrl}/api/moh/alerts/${sampleId}`, { headers: authHeaders });
      const detailData = await detailRes.json();
      console.log("Detail status:", detailRes.status, "Reason:", detailData.reason);
      if (detailRes.status !== 200) throw new Error("Alert detail failed");
      console.log("✅ Test 4 PASSED");
    }

    // TEST 5: Alert from another office (403)
    console.log("\n➡️ Test 5: Alert from another office (403 Forbidden check)");
    const otherOffice = await MohOffice.findOne({ _id: { $ne: buttalaOffice._id } });
    if (otherOffice) {
      const foreignAlert = await Alert.create({
        reason: "Test foreign alert",
        mohOfficeId: otherOffice._id,
        level: "danger",
        status: "open",
      });
      const foreignRes = await fetch(`${baseUrl}/api/moh/alerts/${foreignAlert._id}`, { headers: authHeaders });
      console.log("Foreign alert status:", foreignRes.status);
      if (foreignRes.status !== 403) throw new Error(`Expected 403, got ${foreignRes.status}`);
      await Alert.deleteOne({ _id: foreignAlert._id });
      console.log("✅ Test 5 PASSED: 403 Forbidden properly enforced");
    }

    // TEST 6: Report preview data
    console.log("\n➡️ Test 6: GET /api/moh/reports/data");
    const reportDataRes = await fetch(`${baseUrl}/api/moh/reports/data?type=monthly`, { headers: authHeaders });
    const reportData = await reportDataRes.json();
    console.log("Report data status:", reportDataRes.status);
    console.log("Title:", reportData.title);
    console.log("Summary:", reportData.summary);
    console.log("Clinic areas breakdown:", reportData.clinicAreas?.length);
    if (reportDataRes.status !== 200 || !reportData.summary) throw new Error("Report data failed");
    console.log("✅ Test 6 PASSED");

    // TEST 7: Report download PDF
    console.log("\n➡️ Test 7: GET /api/moh/reports/download?format=pdf");
    const pdfRes = await fetch(`${baseUrl}/api/moh/reports/download?type=monthly&format=pdf`, { headers: authHeaders });
    console.log("PDF download status:", pdfRes.status);
    console.log("Content-Type:", pdfRes.headers.get("content-type"));
    console.log("Content-Disposition:", pdfRes.headers.get("content-disposition"));
    const pdfBlob = await pdfRes.arrayBuffer();
    console.log("PDF byte size:", pdfBlob.byteLength);
    if (pdfRes.status !== 200 || !pdfRes.headers.get("content-type")?.includes("pdf") || pdfBlob.byteLength < 500) {
      throw new Error("PDF download failed");
    }
    console.log("✅ Test 7 PASSED: PDF generated and downloaded successfully");

    // TEST 8: Report download XLSX
    console.log("\n➡️ Test 8: GET /api/moh/reports/download?format=xlsx");
    const xlsxRes = await fetch(`${baseUrl}/api/moh/reports/download?type=monthly&format=xlsx`, { headers: authHeaders });
    console.log("XLSX download status:", xlsxRes.status);
    console.log("Content-Type:", xlsxRes.headers.get("content-type"));
    console.log("Content-Disposition:", xlsxRes.headers.get("content-disposition"));
    const xlsxBlob = await xlsxRes.arrayBuffer();
    console.log("XLSX byte size:", xlsxBlob.byteLength);
    if (xlsxRes.status !== 200 || xlsxBlob.byteLength < 500) {
      throw new Error("XLSX download failed");
    }
    console.log("✅ Test 8 PASSED: XLSX generated and downloaded successfully");

    // TEST 9: Report history
    console.log("\n➡️ Test 9: GET /api/moh/reports/history");
    const histRes = await fetch(`${baseUrl}/api/moh/reports/history`, { headers: authHeaders });
    const histData = await histRes.json();
    console.log("History status:", histRes.status, "Count:", histData.count);
    if (histRes.status !== 200 || histData.count < 2) throw new Error("Report history failed");
    console.log("✅ Test 9 PASSED");

    // TEST 10: Invalid date validation (400)
    console.log("\n➡️ Test 10: GET /api/moh/reports/data?from=invalid-date (400 check)");
    const badDateRes = await fetch(`${baseUrl}/api/moh/reports/data?from=invalid-date`, { headers: authHeaders });
    console.log("Bad date status:", badDateRes.status);
    if (badDateRes.status !== 400) throw new Error(`Expected 400, got ${badDateRes.status}`);
    console.log("✅ Test 10 PASSED: 400 validation error properly returned");

    // TEST 11: Office with NO data (nulls and empty arrays, not errors)
    console.log("\n➡️ Test 11: Office with NO data (nulls and empty arrays)");
    let emptyOffice = await MohOffice.findOne({ name: "Empty Test Office" });
    if (!emptyOffice) {
      emptyOffice = await MohOffice.create({
        name: "Empty Test Office",
        district: "Monaragala",
        province: "Uva",
      });
    }

    let emptyDoctor = await User.findOne({ staffId: "EMPTY001" });
    if (!emptyDoctor) {
      emptyDoctor = await User.create({
        name: "Dr. Empty Office",
        role: "moh",
        staffId: "EMPTY001",
        password: "password123",
        mohOfficeId: emptyOffice._id,
      });
    }

    const emptyLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "EMPTY001", password: "password123" }),
    });
    const emptyToken = (await emptyLoginRes.json()).token;

    const emptyDashRes = await fetch(`${baseUrl}/api/moh/dashboard`, {
      headers: { Authorization: `Bearer ${emptyToken}` },
    });
    const emptyDashData = await emptyDashRes.json();
    console.log("Empty Office Dashboard status:", emptyDashRes.status);
    console.log("Indicators for empty office:", emptyDashData.indicators);
    console.log("Zone compliance for empty office:", emptyDashData.zoneCompliance);
    console.log("Recent activity for empty office:", emptyDashData.recentActivity);

    if (
      emptyDashRes.status !== 200 ||
      emptyDashData.indicators.visitCompliance.value !== null ||
      emptyDashData.indicators.immunizationCoverage.value !== null ||
      !Array.isArray(emptyDashData.zoneCompliance) ||
      !Array.isArray(emptyDashData.recentActivity)
    ) {
      throw new Error("Empty office did not return clean nulls and empty arrays");
    }
    console.log("✅ Test 11 PASSED: Clean nulls and empty arrays returned without error!");

    console.log("\n🎉 ALL 11 BACKEND ENDPOINT TESTS PASSED SUCCESSFULLY!\n");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests();
