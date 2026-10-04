const env = require("../config/env");

const notFound = (req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || "Server error";
  if (err.name === "ValidationError") { status = 400; message = Object.values(err.errors).map((e) => e.message).join(", "); }
  if (err.name === "CastError") { status = 400; message = `Invalid ${err.path}`; }
  if (err.code === 11000) { status = 409; message = `Duplicate value: ${Object.keys(err.keyValue).join(", ")}`; }
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message, ...(env.nodeEnv !== "production" && status >= 500 ? { stack: err.stack } : {}) });
}

module.exports = { notFound, errorHandler };
