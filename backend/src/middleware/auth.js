const jwt = require("jsonwebtoken");
const env = require("../config/env");
const PERMS = require("../config/permissions");
const User = require("../models/User");
const { HttpError } = require("../utils/http");

async function authenticate(req, _res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "Unauthenticated");
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw new HttpError(401, "Account not found or disabled");
    req.user = user;
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

const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

module.exports = { authenticate, authorize, signToken };
