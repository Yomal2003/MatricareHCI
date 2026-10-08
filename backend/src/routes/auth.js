const router = require("express").Router();
const env = require("../config/env");
const { User, Mother } = require("../models");
const { authenticate, signToken } = require("../middleware/auth");
const { ah, HttpError } = require("../utils/http");

const respond = (res, user) => res.json({ token: signToken(user), user });

function normalizePhone(value) {
  const phone = String(value ?? "").trim().replace(/[\s().-]/g, "");
  if (/^\+947\d{8}$/.test(phone)) return phone;
  if (/^947\d{8}$/.test(phone)) return `+${phone}`;
  if (/^07\d{8}$/.test(phone)) return `+94${phone.slice(1)}`;
  if (/^7\d{8}$/.test(phone)) return `+94${phone}`;
  return null;
}

function phoneAliases(canonical) {
  const national = canonical.slice(3);
  return [canonical, `0${national}`, canonical.slice(1), national];
}

async function linkedFamilyUser(user) {
  if (!user.mother || !user.familyMemberId) return false;
  const mother = await Mother.findById(user.mother);
  const member = mother?.family.id(user.familyMemberId);
  return !!member && String(member.userId) === String(user._id);
}

async function resolvePhoneUser(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new HttpError(400, "Enter a valid Sri Lankan mobile number");
  const aliases = phoneAliases(phone);
  const users = await User.find({ phone: { $in: aliases }, active: true });
  if (users.length > 1) throw new HttpError(409, "Phone number is linked to multiple accounts");
  if (users.length === 1) {
    const user = users[0];
    if (user.role === "family_member" && !(await linkedFamilyUser(user))) {
      throw new HttpError(404, "Phone number not registered");
    }
    if (user.role !== "mother" && user.role !== "family_member") {
      throw new HttpError(404, "Phone number not registered");
    }
    return user;
  }

  const mothers = await Mother.find({ "family.phone": { $in: aliases } });
  const matches = mothers.flatMap((mother) => mother.family
    .filter((member) => normalizePhone(member.phone) === phone)
    .map((member) => ({ mother, member })));
  if (matches.length !== 1) throw new HttpError(404, "Phone number not registered");

  const { mother, member } = matches[0];
  if (member.userId) {
    const existing = await User.findById(member.userId);
    if (!existing?.active || existing.role !== "family_member" || !(await linkedFamilyUser(existing))) {
      throw new HttpError(404, "Phone number not registered");
    }
    return existing;
  }

  const account = await User.create({
    role: "family_member",
    name: member.name || member.relation || "Family member",
    phone,
    mother: mother._id,
    familyMemberId: member._id,
  });
  member.userId = account._id;
  try {
    await mother.save();
  } catch (error) {
    await User.deleteOne({ _id: account._id });
    throw error;
  }
  return account;
}

// Staff: { staffId, password }   Demo (DEMO_LOGIN=true): { role }
router.post("/login", ah(async (req, res) => {
  const { staffId, password, role } = req.body;
  if (staffId) {
    const user = await User.findOne({ staffId: String(staffId).toUpperCase() }).select("+password");
    if (!user || !(await user.checkPassword(password || ""))) throw new HttpError(401, "Invalid staff ID or password");
    if (!user.active) throw new HttpError(403, "Account disabled");
    return respond(res, user);
  }
  if (role && role !== "family_member" && env.demoLogin) {
    const user = await User.findOne({ role, active: true }).sort({ createdAt: 1 });
    if (!user) throw new HttpError(404, `No ${role} user found. Run "npm run seed".`);
    return respond(res, user);
  }
  throw new HttpError(400, "staffId and password are required");
}));

// Mother / family member: phone + OTP. Replace DEV_OTP with an SMS gateway (e.g. Dialog/Mobitel/Twilio).
router.post("/otp/request", ah(async (req, res) => {
  await resolvePhoneUser(req.body?.phone);
  res.json({ sent: true, ...(env.nodeEnv !== "production" ? { devOtp: env.devOtp } : {}) });
}));

router.post("/otp/verify", ah(async (req, res) => {
  const { phone, otp } = req.body;
  if (otp !== env.devOtp) throw new HttpError(401, "Incorrect OTP");
  const user = await resolvePhoneUser(phone);
  respond(res, user);
}));

router.get("/me", authenticate, (req, res) => res.json(req.user));

router.patch("/me", authenticate, ah(async (req, res) => {
  if (req.body.language) req.user.language = req.body.language;
  await req.user.save();
  res.json(req.user);
}));

module.exports = router;
