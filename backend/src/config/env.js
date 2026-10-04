require("dotenv").config();

const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  demoLogin: process.env.DEMO_LOGIN === "true",
  devOtp: process.env.DEV_OTP || "123456",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

if (!env.mongoUri) {
  console.error("✖ MONGODB_URI is empty. Add your MongoDB connection string to backend/.env");
  process.exit(1);
}

module.exports = env;
