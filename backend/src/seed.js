// Populates MongoDB with demo users and data. Run: npm run seed   (WARNING: clears existing collections)
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { User, Mother, Child, Visit, Immunization, Growth, Appointment, QueueEntry, Alert, FamilyNotification } = require("./models");

const daysFromNow = (n) => new Date(Date.now() + n * 864e5);
const weeksAgo = (w) => new Date(Date.now() - w * 7 * 864e5);
const today = new Date().toISOString().slice(0, 10);

(async () => {
  await connectDB();
  await Promise.all([User, Mother, Child, Visit, Immunization, Growth, Appointment, QueueEntry, Alert, FamilyNotification].map((M) => M.deleteMany({})));

  const phm = await User.create({ role: "phm", name: "Kamani Rathnayake", staffId: "PHM001", password: "password123", badge: "PHM · Monaragala Division", area: "Buttala" });
  const nurse = await User.create({ role: "nursing", name: "Nalini Jayaweera", staffId: "NUR001", password: "password123", badge: "Nursing Officer · Buttala Clinic", area: "Buttala Clinic" });
  await User.create({ role: "moh", name: "Dr. Pradeep Silva", staffId: "MOH001", password: "password123", badge: "MOH · Monaragala District", area: "Monaragala" });

  const mothersData = [
    { code: "M-1042", name: "Chamari Perera", village: "Buttala", phmArea: "Buttala", lmp: weeksAgo(28), risk: "low", phone: "0771234567", vitals: { weight: 62, bp: "110/70", hb: 11.4 } },
    { code: "M-1043", name: "Dilani Kumari", village: "Okkampitiya", phmArea: "Okkampitiya", lmp: weeksAgo(34), risk: "high", riskFlags: ["High BP"], phone: "0712345678" },
    { code: "M-1044", name: "Fathima Rizna", village: "Wellawaya", phmArea: "Wellawaya", lmp: weeksAgo(12), risk: "medium", riskFlags: ["Low Hb"], phone: "0759876543" },
    { code: "M-1045", name: "Sivaranjani K.", village: "Siyambalanduwa", phmArea: "Siyambalanduwa", lmp: weeksAgo(22), risk: "low", phone: "0763456789" },
    { code: "M-1046", name: "Nirosha Madushani", village: "Buttala", phmArea: "Buttala", lmp: weeksAgo(38), risk: "high", riskFlags: ["Reduced movements"], phone: "0701112233" },
    { code: "M-1047", name: "Kumudu Wijesinghe", village: "Madulla", phmArea: "Madulla", status: "postnatal", risk: "medium", phone: "0723334455" },
  ];
  const mothers = await Mother.insertMany(mothersData.map((m) => ({ ...m, assignedPhm: phm._id })));
  const M = Object.fromEntries(mothers.map((m) => [m.code, m]));

  M["M-1042"].family.push({ name: "Ruwan Perera", relation: "Husband", phone: "0779990000", consent: true });
  await M["M-1042"].save();
  await User.create({ role: "mother", name: "Chamari Perera", phone: "0771234567", badge: "Patient · Buttala", mother: M["M-1042"]._id });

  const [c1, c2, c3] = await Child.insertMany([
    { code: "C-2201", name: "Baby of Chamari", mother: M["M-1042"]._id, dob: weeksAgo(70), sex: "female", birthWeight: 3.1 },
    { code: "C-2202", name: "Baby of Dilani", mother: M["M-1043"]._id, dob: weeksAgo(2), sex: "male", birthWeight: 2.8 },
    { code: "C-2203", name: "Baby of Kumudu", mother: M["M-1047"]._id, dob: weeksAgo(10), sex: "female", birthWeight: 2.3 },
  ]);

  await Immunization.insertMany([
    { mother: M["M-1042"]._id, vaccine: "TT1", date: weeksAgo(13), recordedBy: nurse._id },
    { mother: M["M-1042"]._id, vaccine: "TT2", date: weeksAgo(8), recordedBy: nurse._id },
    { child: c1._id, vaccine: "BCG", date: weeksAgo(70), recordedBy: nurse._id },
    { child: c1._id, vaccine: "Penta", dose: 1, date: weeksAgo(62), recordedBy: nurse._id },
    { child: c2._id, vaccine: "BCG", date: weeksAgo(1), recordedBy: nurse._id },
  ]);
  await Growth.insertMany([
    { child: c3._id, weight: 3.9, height: 55, date: weeksAgo(2), recordedBy: nurse._id },
    { child: c1._id, weight: 9.8, height: 76, date: weeksAgo(4), recordedBy: nurse._id },
  ]);

  await Visit.insertMany([
    { type: "anc", mother: M["M-1042"]._id, date: weeksAgo(2), weight: 62, bp: "110/70", hb: 11.4, recordedBy: nurse._id },
    { type: "home-visit", mother: M["M-1042"]._id, date: weeksAgo(5), weight: 60, recordedBy: phm._id },
    { type: "home-visit", mother: M["M-1043"]._id, date: weeksAgo(1), bp: "150/100", riskFlags: ["High BP"], recordedBy: phm._id },
  ]);

  const appt = (code, type, category, d, status = "upcoming", place = "Buttala MOH Clinic") =>
    ({ mother: M[code]._id, type, category, date: daysFromNow(d), status, place, phmArea: M[code].phmArea });
  await Appointment.insertMany([
    appt("M-1042", "ANC — 30 weeks", "anc", 11),
    appt("M-1042", "ANC — 26 weeks", "anc", -17, "done"),
    appt("M-1042", "Home visit by PHM", "home-visit", -35, "done", "Home"),
    appt("M-1042", "Ultrasound scan", "scan", -52, "missed", "Monaragala Hospital"),
    appt("M-1043", "ANC — 35 weeks", "anc", -3, "missed"),
    appt("M-1044", "Dating scan", "scan", 2),
    appt("M-1045", "ANC — 24 weeks", "anc", 5),
    appt("M-1046", "ANC — 38 weeks", "anc", 1),
    appt("M-1047", "Postnatal check", "postnatal", -6, "missed", "Home"),
    appt("M-1047", "Growth check", "growth", -20, "done"),
    appt("M-1045", "ANC — 20 weeks", "anc", -28, "done"),
    appt("M-1044", "ANC booking", "anc", -40, "done"),
  ]);

  await QueueEntry.insertMany([
    { day: today, clinic: "Buttala Clinic", token: 10, name: "Baby of Chamari", child: c1._id, reason: "Penta 2", status: "done" },
    { day: today, clinic: "Buttala Clinic", token: 11, name: "Fathima Rizna", mother: M["M-1044"]._id, reason: "Dating scan", status: "in-room" },
    { day: today, clinic: "Buttala Clinic", token: 12, name: "Nirosha Madushani", mother: M["M-1046"]._id, reason: "ANC visit" },
    { day: today, clinic: "Buttala Clinic", token: 13, name: "Baby of Dilani", child: c2._id, reason: "BCG + Weight" },
  ]);

  await Alert.insertMany([
    { mother: M["M-1043"]._id, level: "danger", reason: "BP 150/100 · 34 wks", area: "Okkampitiya" },
    { mother: M["M-1046"]._id, level: "danger", reason: "Reduced fetal movement", area: "Buttala" },
    { mother: M["M-1044"]._id, level: "warn", reason: "Hb 8.9 g/dL", area: "Wellawaya" },
    { child: c3._id, level: "warn", reason: "Weight below −2SD", area: "Madulla" },
  ]);

  console.log("✔ Seed complete.\n  Staff logins (password: password123): PHM001, NUR001, MOH001\n  Mother login: phone 0771234567 + DEV_OTP from .env");
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
