const env = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");

connectDB()
  .then(() => app.listen(env.port, "0.0.0.0", () => console.log(`✔ MatriCare API running on http://0.0.0.0:${env.port}`)))
  .catch((err) => {
    console.error("✖ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
