/**
 * Clinic Area Controller
 * Manages clinic areas under an MOH Doctor's office.
 */

const { ClinicArea } = require("../models/ClinicArea");
const { Staff } = require("../models/Staff");
const { assertClinicAreaOwned } = require("../utils/ownership");

/**
 * POST /api/moh/clinic-areas
 * Creates a new clinic area under the authenticated doctor's MOH Office.
 */
async function createClinicArea(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(409).json({
        message: "No MOH office assigned to this account",
      });
    }

    const { name, type, address } = req.body;
    const trimmedName = name.trim();

    // Check for existing clinic area with the same name in this office (case-insensitive)
    const existing = await ClinicArea.findOne({
      mohOfficeId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (existing) {
      return res.status(409).json({
        message: `A clinic area with name '${trimmedName}' already exists in your MOH office`,
      });
    }

    const clinicArea = new ClinicArea({
      name: trimmedName,
      type: type || "MCH_CLINIC",
      address: address ? address.trim() : "",
      status: "active",
      mohOfficeId,
      createdBy: req.user?._id || req.user?.id,
    });

    await clinicArea.save();

    return res.status(201).json(clinicArea);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A clinic area with this name already exists in your MOH office",
      });
    }
    console.error("❌ Error in createClinicArea controller:", error);
    return res.status(500).json({
      message: "An error occurred while creating the clinic area",
    });
  }
}

/**
 * PUT /api/moh/clinic-areas/:id
 * Updates an existing clinic area (owned by the doctor's office).
 */
async function updateClinicArea(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(409).json({
        message: "No MOH office assigned to this account",
      });
    }

    const { id } = req.params;
    const { name, type, address } = req.body;

    // Verify existence & ownership
    let clinicArea;
    try {
      clinicArea = await assertClinicAreaOwned(id, mohOfficeId);
    } catch (err) {
      return res.status(err.status || 500).json({
        message: err.message,
      });
    }

    // Check duplicate name if name is being changed
    if (name) {
      const trimmedName = name.trim();
      const duplicate = await ClinicArea.findOne({
        mohOfficeId,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });

      if (duplicate) {
        return res.status(409).json({
          message: `A clinic area with name '${trimmedName}' already exists in your MOH office`,
        });
      }

      clinicArea.name = trimmedName;
    }

    if (type) {
      clinicArea.type = type;
    }

    if (address !== undefined) {
      clinicArea.address = address ? address.trim() : "";
    }

    await clinicArea.save();

    return res.status(200).json(clinicArea);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A clinic area with this name already exists in your MOH office",
      });
    }
    console.error("❌ Error in updateClinicArea controller:", error);
    return res.status(500).json({
      message: "An error occurred while updating the clinic area",
    });
  }
}

/**
 * PATCH /api/moh/clinic-areas/:id/deactivate
 * Soft deletes a clinic area by setting status to 'inactive'.
 * Blocked (409) if active staff are still assigned to it.
 */
async function deactivateClinicArea(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(409).json({
        message: "No MOH office assigned to this account",
      });
    }

    const { id } = req.params;

    let clinicArea;
    try {
      clinicArea = await assertClinicAreaOwned(id, mohOfficeId);
    } catch (err) {
      return res.status(err.status || 500).json({
        message: err.message,
      });
    }

    // Check for active staff assigned to this clinic area
    const activeStaffCount = await Staff.countDocuments({
      clinicAreaId: id,
      status: "active",
    });

    if (activeStaffCount > 0) {
      return res.status(409).json({
        message: `Cannot deactivate clinic area with ${activeStaffCount} active staff member(s). Please reassign them first.`,
        activeStaffCount,
      });
    }

    clinicArea.status = "inactive";
    await clinicArea.save();

    return res.status(200).json(clinicArea);
  } catch (error) {
    console.error("❌ Error in deactivateClinicArea controller:", error);
    return res.status(500).json({
      message: "An error occurred while deactivating the clinic area",
    });
  }
}

/**
 * PATCH /api/moh/clinic-areas/:id/activate
 * Re-activates an inactive clinic area.
 */
async function activateClinicArea(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(409).json({
        message: "No MOH office assigned to this account",
      });
    }

    const { id } = req.params;

    let clinicArea;
    try {
      clinicArea = await assertClinicAreaOwned(id, mohOfficeId);
    } catch (err) {
      return res.status(err.status || 500).json({
        message: err.message,
      });
    }

    clinicArea.status = "active";
    await clinicArea.save();

    return res.status(200).json(clinicArea);
  } catch (error) {
    console.error("❌ Error in activateClinicArea controller:", error);
    return res.status(500).json({
      message: "An error occurred while activating the clinic area",
    });
  }
}

/**
 * GET /api/moh/clinic-areas/:id/staff
 * Lists staff members assigned to a specific clinic area.
 * Supports optional ?status= query filter ('active' | 'inactive').
 */
async function getClinicAreaStaff(req, res) {
  try {
    const mohOfficeId = req.user?.mohOfficeId;
    if (!mohOfficeId) {
      return res.status(409).json({
        message: "No MOH office assigned to this account",
      });
    }

    const { id } = req.params;

    try {
      await assertClinicAreaOwned(id, mohOfficeId);
    } catch (err) {
      return res.status(err.status || 500).json({
        message: err.message,
      });
    }

    const filter = { clinicAreaId: id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const staffList = await Staff.find(filter).sort({ fullName: 1 });

    return res.status(200).json({
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    console.error("❌ Error in getClinicAreaStaff controller:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving clinic area staff",
    });
  }
}

module.exports = {
  createClinicArea,
  updateClinicArea,
  deactivateClinicArea,
  activateClinicArea,
  getClinicAreaStaff,
};
