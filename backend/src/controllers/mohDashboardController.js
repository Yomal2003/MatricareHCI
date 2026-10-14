/**
 * MOH Dashboard Controller
 * Computes live operational indicators and activity feed from PHM/Nurse records.
 * Filters strictly by req.user.mohOfficeId.
 */

const MohOffice = require("../models/MohOffice");
const {
  TARGET_VISIT_COMPLIANCE,
  TARGET_IMMUNIZATION_COVERAGE,
  getMonthRange,
  computeVisitCompliance,
  computeImmunizationCoverage,
  computeHighRiskCases,
  computeActiveClinicAreas,
  computeZoneCompliance,
  computeDistrictAverage,
  getRecentActivity,
} = require("../utils/metrics");

/**
 * GET /api/moh/dashboard
 * Live statistics for MOH Doctor dashboard
 */
async function getDashboard(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(403).json({
        message: "No MOH office assigned to this account",
      });
    }

    // 1. Fetch office details
    const office = await MohOffice.findById(mohOfficeId).lean();
    if (!office) {
      return res.status(404).json({
        message: "Assigned MOH office not found",
      });
    }

    // 2. Resolve month range (?month=YYYY-MM or current month in Asia/Colombo)
    const { month } = req.query;
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        message: "Invalid month format. Expected YYYY-MM",
      });
    }

    const { start, end, prevStart, prevEnd } = getMonthRange(month);

    // 3. Parallel aggregated metric queries
    const [
      visitCurrent,
      visitPrev,
      immunization,
      highRisk,
      activeClinicAreasCount,
      zoneComplianceList,
      districtAvg,
      recentActivityList,
    ] = await Promise.all([
      computeVisitCompliance(mohOfficeId, start, end),
      computeVisitCompliance(mohOfficeId, prevStart, prevEnd),
      computeImmunizationCoverage(mohOfficeId, new Date()),
      computeHighRiskCases(mohOfficeId, new Date(), prevStart),
      computeActiveClinicAreas(mohOfficeId),
      computeZoneCompliance(mohOfficeId, start, end),
      computeDistrictAverage(office.district, start, end),
      getRecentActivity(mohOfficeId, 10),
    ]);

    // Trend calculations
    let visitTrend = null;
    if (visitCurrent.value !== null && visitPrev.value !== null) {
      const diff = visitCurrent.value - visitPrev.value;
      visitTrend = diff >= 0 ? `+${diff}%` : `${diff}%`;
    }

    let immTrend = null;
    if (immunization.value !== null) {
      const diff = immunization.value - TARGET_IMMUNIZATION_COVERAGE;
      immTrend = diff >= 0 ? `+${diff}%` : `${diff}%`;
    }

    // Build standard response payload
    const payload = {
      mohOffice: {
        id: office._id.toString(),
        name: office.name,
        district: office.district,
        province: office.province,
      },
      doctor: {
        fullName: req.user.name || "MOH Doctor",
        profileImageUrl: req.user.profileImageUrl || null,
      },
      indicators: {
        visitCompliance: {
          value: visitCurrent.value,
          target: TARGET_VISIT_COMPLIANCE,
          trend: visitTrend,
        },
        immunizationCoverage: {
          value: immunization.value,
          target: TARGET_IMMUNIZATION_COVERAGE,
          trend: immTrend,
        },
        highRiskCases: {
          value: highRisk.value,
          change: highRisk.change,
        },
        clinicAreas: {
          value: activeClinicAreasCount,
        },
      },
      zoneCompliance: zoneComplianceList,
      districtAverage: districtAvg,
      recentActivity: recentActivityList,
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error("❌ Error in getDashboard:", error);
    return res.status(500).json({
      message: "Internal server error fetching dashboard data",
      details: error.message,
    });
  }
}

module.exports = {
  getDashboard,
};
