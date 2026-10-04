const router = require("express").Router();
const env = require("../config/env");
const { User } = require("../models");
const { authenticate, signToken } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const respond = (res, user) => res.json({ token: signToken(user), user });

// Staff: { staffId, password }   Demo (DEMO_LOGIN=true): { role }
router.post("/login", ah(async (req, res) => {
  const { staffId, password, role } = req.body;
  if (staffId) {
    const user = await User.findOne({ staffId: String(staffId).toUpperCase() }).select("+password");
    if (!user || !(await user.checkPassword(password || ""))) throw new HttpError(401, "Invalid staff ID or password");
    if (!user.active) throw new HttpError(403, "Account disabled");
    return respond(res, user);
  }
  if (role && env.demoLogin) {
    const user = await User.findOne({ role, active: true }).sort({ createdAt: 1 });
    if (!user) throw new HttpError(404, `No ${role} user found. Run "npm run seed".`);
    return respond(res, user);
  }
  throw new HttpError(400, "staffId and password are required");
}));

// Mother / family: phone + OTP. Replace DEV_OTP with an SMS gateway (e.g. Dialog/Mobitel/Twilio).
router.post("/otp/request", ah(async (req, res) => {
  const user = await User.findOne({ phone: req.body.phone, role: "mother" });
  if (!user) throw new HttpError(404, "Phone number not registered");
  res.json({ sent: true, ...(env.nodeEnv !== "production" ? { devOtp: env.devOtp } : {}) });
}));

router.post("/otp/verify", ah(async (req, res) => {
  const { phone, otp } = req.body;
  if (otp !== env.devOtp) throw new HttpError(401, "Incorrect OTP");
  const user = await User.findOne({ phone, role: "mother" });
  if (!user) throw new HttpError(404, "Phone number not registered");
  respond(res, user);
}));

router.get("/me", authenticate, (req, res) => res.json(req.user));

router.patch("/me", authenticate, ah(async (req, res) => {
  if (req.body.language) req.user.language = req.body.language;
  await req.user.save();
  res.json(req.user);
}));

module.exports = router;
