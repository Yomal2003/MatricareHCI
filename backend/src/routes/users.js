// Staff account management (MOH only).
const router = require("express").Router();
const { User } = require("../models");
const { authorize } = require("../middleware/auth");
const { ah, HttpError, pick } = require("../utils/http");

router.get("/", authorize("users:manage"), ah(async (req, res) => {
  res.json(await User.find(req.query.role ? { role: req.query.role } : {}).sort({ role: 1, name: 1 }));
}));

router.post("/", authorize("users:manage"), ah(async (req, res) => {
  const body = pick(req.body, ["role", "name", "staffId", "phone", "password", "badge", "area", "language", "mother"]);
  if (body.role !== "mother" && !body.password) throw new HttpError(400, "password is required for staff");
  res.status(201).json(await User.create(body));
}));

router.patch("/:id", authorize("users:manage"), ah(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  Object.assign(user, pick(req.body, ["name", "badge", "area", "active", "password", "language"]));
  await user.save();
  res.json(user);
}));

module.exports = router;
