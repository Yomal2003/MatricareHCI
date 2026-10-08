const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const env = require("./config/env");
const { authenticate } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "2mb" }));
if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.use("/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), require("./routes/auth"));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), require("./routes/auth"));
app.use("/api/auth/staff-login", require("./controllers/staffController").loginStaff);

// Everything below requires a valid JWT.
app.use(authenticate);
app.use("/me", require("./routes/me"));
app.use("/mothers", require("./routes/mothers"));
app.use("/children", require("./routes/children"));
app.use("/records", require("./routes/records"));
app.use("/appointments", require("./routes/appointments"));
app.use("/queue", require("./routes/queue"));
app.use("/alerts", require("./routes/alerts"));
app.use("/reports", require("./routes/reports"));
app.use("/users", require("./routes/users"));
app.use("/api/moh", require("./routes/mohOfficeRoutes"));
app.use("/api/moh/clinic-areas", require("./routes/clinicAreaRoutes"));
app.use("/api/moh/staff", require("./routes/staffRoutes"));
app.use("/api/auth/reset-password", require("./controllers/staffController").validateResetPasswordInput, require("./controllers/staffController").resetPassword);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
