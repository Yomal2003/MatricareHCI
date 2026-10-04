const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["mother", "phm", "nursing", "moh"], required: true },
    name: { type: String, required: true, trim: true },
    staffId: { type: String, unique: true, sparse: true, uppercase: true, trim: true }, // staff login
    phone: { type: String, unique: true, sparse: true, trim: true }, // mother login (OTP)
    password: { type: String, select: false },
    badge: String, // e.g. "PHM · Monaragala Division"
    area: String, // PHM area / clinic / district
    language: { type: String, enum: ["en", "si", "ta"], default: "en" },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "Mother" }, // linked profile for role=mother
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.checkPassword = function (pw) {
  return bcrypt.compare(pw, this.password || "");
};
userSchema.set("toJSON", { transform: (_d, r) => { r.id = r._id; delete r._id; delete r.__v; delete r.password; return r; } });

module.exports = mongoose.model("User", userSchema);
