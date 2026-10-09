const jwt = require("jsonwebtoken");
const env = require("../config/env");
const PERMS = require("../config/permissions");
const User = require("../models/User");
const { HttpError } = require("../utils/http");

async function authenticate(req, _res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      if (env.demoLogin) {
        const demoUser = await User.findOne({ role: "moh", active: true });
        if (demoUser) {
          req.user = demoUser;
          return next();
        }
      }
      throw new HttpError(401, "Unauthenticated");
    }
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub || payload.id);
    if (!user || !user.active) throw new HttpError(401, "Account not found or disabled");
    req.user = user;
    if (!req.user.mohOfficeId && payload.mohOfficeId) {
      req.user.mohOfficeId = payload.mohOfficeId;
    }
    next();
  } catch (e) {
    next(e.status ? e : new HttpError(401, "Invalid or expired token"));
  }
}

const authorize = (perm) => (req, _res, next) => {
  const allowed = PERMS[perm];
  if (!allowed) return next(new HttpError(500, `Unknown permission ${perm}`));
  if (!allowed.includes(req.user.role)) return next(new HttpError(403, "Forbidden for your role"));
  next();
};

const signToken = (user) => {
  const payload = {
    sub: user.id || user._id,
    role: user.role,
  };
  if (user.mohOfficeId) {
    payload.mohOfficeId = user.mohOfficeId.toString();
  }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

module.exports = { authenticate, authorize, signToken };
