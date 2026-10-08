/**
 * Rate Limiting Middleware
 * Protects endpoints against brute-force attacks and abuse using express-rate-limit.
 */

const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for staff creation endpoint (POST /api/moh/staff).
 * Limits to 30 requests per 15-minute window per IP.
 */
const staffCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "TooManyRequests",
    message: "Too many staff accounts created from this IP. Please try again after 15 minutes.",
  },
});

/**
 * Rate limiter for resending credentials (POST /api/moh/staff/:id/resend-credentials).
 * Limits to 15 requests per 15-minute window to prevent SMTP email flooding.
 */
const resendCredentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Too many credential resend requests. Please try again later.",
  },
});

/**
 * General authentication rate limiter for login and password resets.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

module.exports = {
  staffCreationLimiter,
  resendCredentialsLimiter,
  authLimiter,
};
