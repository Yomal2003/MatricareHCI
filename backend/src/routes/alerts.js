const router = require("express").Router();
const { Alert } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

router.get("/", authorize("alerts:read"), ah(async (req, res) => {
  const filter = { status: req.query.status || { $ne: "resolved" } };
  res.json(await Alert.find(filter).populate("mother", "code name village weeks lmp").populate("child", "code name").sort({ level: 1, createdAt: -1 }).limit(200));
}));

router.patch("/:id", authorize("alerts:write"), ah(async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(req.params.id, { status: req.body.status, handledBy: req.user._id }, { new: true, runValidators: true });
  if (!alert) throw new HttpError(404, "Alert not found");
  res.json(alert);
}));

module.exports = router;
