// Staff account management (MOH only).
const router = require("express").Router();
const { User } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError, pick } = require("../utils/http");

// Midwives Directory & Area Suggestion (accessible by Nurse, PHM, MOH)
router.get("/midwives", authorize("midwives:read"), ah(async (req, res) => {
  const { area } = req.query;
  const filter = { role: "phm", active: true };
  if (area) {
    const areaRegex = new RegExp(area.trim(), "i");
    filter.$or = [{ area: areaRegex }, { locations: { $in: [areaRegex] } }];
  }
  const midwives = await User.find(filter)
    .select("name staffId phone badge area locations qualifications clinic experienceYears")
    .sort({ name: 1 });
  res.json(midwives);
}));

// Midwife Profile View
router.get("/midwives/:id", authorize("midwives:read"), ah(async (req, res) => {
  const midwife = await User.findOne({ _id: req.params.id, role: "phm" })
    .select("name staffId phone badge area locations qualifications clinic experienceYears");
  if (!midwife) throw new HttpError(404, "Midwife profile not found");
  res.json(midwife);
}));

// Add Midwife with assigned Location (MOH only)
router.post("/midwives", authorize("midwives:write"), ah(async (req, res) => {
  const { name, staffId, phone, password, area, locations, badge, qualifications, clinic, experienceYears } = req.body;
  if (!name || !staffId) throw new HttpError(400, "Name and Staff ID are required");

  const locationsList = Array.isArray(locations)
    ? locations
    : typeof locations === "string"
      ? locations.split(",").map((s) => s.trim()).filter(Boolean)
      : area ? [area] : [];

  const midwife = await User.create({
    role: "phm",
    name: name.trim(),
    staffId: staffId.toUpperCase().trim(),
    phone: phone?.trim(),
    password: password || "password123",
    area: area?.trim() || locationsList[0] || "Buttala",
    locations: locationsList,
    badge: badge || `PHM · ${area || "Division"}`,
    qualifications: qualifications || "Registered Public Health Midwife (SLMC)",
    clinic: clinic || "MOH Clinic",
    experienceYears: experienceYears ? Number(experienceYears) : 5,
  });

  res.status(201).json(midwife);
}));

module.exports = router;
