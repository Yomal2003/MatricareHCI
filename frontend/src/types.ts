export type Role = "mother" | "phm" | "nursing" | "moh";
export type Language = "en" | "si" | "ta";

export type Screen =
  | "splash"
  | "login"
  | "settings"
  | "mother-home"
  | "mother-appointments"
  | "mother-records"
  | "mother-consent"
  | "phm-home"
  | "phm-followups"
  | "phm-search"
  | "phm-entry"
  | "phm-sync"
  | "nursing-home"
  | "nursing-entry"
  | "nursing-search"
  | "moh-home"
  | "moh-alerts"
  | "moh-missed"
  | "moh-reports";

export interface AppContextType {
  user: { id: string; name: string } | null;
  role: Role | null;
  language: Language;
  isOnline: boolean;
  isSyncing: boolean;
  currentScreen: Screen;
  wireframeMode: boolean;
  showLanguageModal: boolean;
  navigate: (screen: Screen) => void;
  login: (role: Role) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  setWireframeMode: (v: boolean) => void;
  setShowLanguageModal: (v: boolean) => void;
  toggleOnline: () => void;
}

export const ROLE_CONFIG: Record<
  Role,
  {
    color: string;
    colorLight: string;
    colorDark: string;
    colorBg: string;
    name: string;
    badge: string;
    homeScreen: Screen;
    navItems: NavItem[];
  }
> = {
  mother: {
    color: "#0891B2",
    colorLight: "#CFFAFE",
    colorDark: "#0E7490",
    colorBg: "#F0F9FF",
    name: "Chamari Perera",
    badge: "Patient · Buttala",
    homeScreen: "mother-home",
    navItems: [
      { key: "home", labelEn: "Home", labelSi: "මුල", icon: "home", screen: "mother-home" },
      { key: "appointments", labelEn: "Visits", labelSi: "හමු", icon: "calendar", screen: "mother-appointments" },
      { key: "records", labelEn: "Records", labelSi: "වාර්තා", icon: "document", screen: "mother-records" },
      { key: "consent", labelEn: "Family", labelSi: "පවුල", icon: "people", screen: "mother-consent" },
    ],
  },
  phm: {
    color: "#059669",
    colorLight: "#D1FAE5",
    colorDark: "#047857",
    colorBg: "#ECFDF5",
    name: "Kamani Rathnayake",
    badge: "PHM · Monaragala Division",
    homeScreen: "phm-home",
    navItems: [
      { key: "home", labelEn: "Home", labelSi: "මුල", icon: "home", screen: "phm-home" },
      { key: "followups", labelEn: "Follow-ups", labelSi: "නිරීක්ෂණ", icon: "calendar", screen: "phm-followups" },
      { key: "search", labelEn: "Search", labelSi: "සොයන්න", icon: "search", screen: "phm-search" },
      { key: "entry", labelEn: "Entry", labelSi: "ඇතුළු", icon: "edit", screen: "phm-entry" },
      { key: "sync", labelEn: "Sync", labelSi: "සමමුහුර්ත", icon: "sync", screen: "phm-sync" },
    ],
  },
  nursing: {
    color: "#D97706",
    colorLight: "#FEF3C7",
    colorDark: "#B45309",
    colorBg: "#FFFBEB",
    name: "Nalini Jayaweera",
    badge: "Nursing Officer · Buttala Clinic",
    homeScreen: "nursing-home",
    navItems: [
      { key: "home", labelEn: "Queue", labelSi: "පෝළිම", icon: "home", screen: "nursing-home" },
      { key: "entry", labelEn: "Entry", labelSi: "ඇතුළු", icon: "edit", screen: "nursing-entry" },
      { key: "search", labelEn: "Records", labelSi: "වාර්තා", icon: "search", screen: "nursing-search" },
    ],
  },
  moh: {
    color: "#7B4FE0",
    colorLight: "#EDE9FE",
    colorDark: "#6B3FD4",
    colorBg: "#F5F6FA",
    name: "Dr. Pradeep Silva",
    badge: "MOH · Monaragala District",
    homeScreen: "moh-home",
    navItems: [
      { key: "home", labelEn: "Dashboard", labelSi: "සාරාංශ", icon: "home", screen: "moh-home" },
      { key: "alerts", labelEn: "Alerts", labelSi: "අනතුරු", icon: "bell", screen: "moh-alerts" },
      { key: "staff", labelEn: "Staff", labelSi: "කාර්ය මණ්ඩලය", icon: "people", screen: "moh-missed" },
      { key: "reports", labelEn: "Reports", labelSi: "වාර්තා", icon: "report", screen: "moh-reports" },
    ],
  },
};

export interface NavItem {
  key: string;
  labelEn: string;
  labelSi: string;
  icon: string;
  screen: Screen;
}

export const T: Record<Language, Record<string, string>> = {
  en: {
    appName: "MatriCare",
    tagline: "Maternal & Child Health",
    taglineSub: "Caring for every mother and child",
    loginTitle: "Sign In",
    phoneLogin: "Mother / Family",
    staffLogin: "Clinic Staff",
    phonePlaceholder: "Phone number",
    otpPlaceholder: "Enter OTP",
    staffIdPlaceholder: "Staff ID",
    passwordPlaceholder: "Password",
    sendOtp: "Send OTP",
    signIn: "Sign In",
    demoLabel: "Demo — tap to sign in as:",
    settings: "Settings",
    language: "Language",
    notifications: "Notifications",
    logout: "Logout",
    offline: "You are offline · Data saved locally",
    syncing: "Syncing data...",
    syncDone: "All data synced",
    home: "Home",
    nextAppt: "Next Appointment",
    myRecords: "My Records",
    healthTips: "Health Tips",
    reminders: "Reminders",
    familyConsent: "Family Consent",
    addFamily: "Add Family Member",
    consentDesc: "Allow a family member to receive your appointment reminders",
    todayVisits: "Today's Visits",
    dueFollowups: "Due Follow-ups",
    searchMothers: "Search Mothers",
    dataEntry: "Data Entry",
    syncStatus: "Sync Status",
    pendingRecords: "Pending Upload",
    clinicQueue: "Today's Queue",
    immunizationEntry: "Immunization / Growth Entry",
    recordRetrieval: "Record Retrieval",
    mohDashboard: "Dashboard",
    highRiskAlerts: "High-Risk Alerts",
    missedVisits: "Missed Visit Summary",
    reportGenerator: "Report Generator",
    visitCompliance: "Visit Compliance",
    immunizationCoverage: "Immunization Coverage",
    highRiskCount: "High-Risk Cases",
    generateReport: "Generate Report",
    exportErhMis: "Export to eRHMIS",
  },
  si: {
    appName: "MatriCare",
    tagline: "මාතෘ හා ළදරු සෞඛ්‍ය",
    taglineSub: "සෑම මවකට හා දරුවාටම සෙනෙහෙ",
    loginTitle: "පිවිසෙන්න",
    phoneLogin: "අම්මා / පවුල",
    staffLogin: "දෙවල් කාර්ය",
    phonePlaceholder: "දුරකථන අංකය",
    otpPlaceholder: "OTP ඇතුළු කරන්න",
    staffIdPlaceholder: "කාර්ය ID",
    passwordPlaceholder: "මුරපදය",
    sendOtp: "OTP යවන්න",
    signIn: "පිවිසෙන්න",
    demoLabel: "Demo — ස්පර්ශ කර ඇතුළු වන්න:",
    settings: "සැකසුම්",
    language: "භාෂාව",
    notifications: "දැනුම්දීම්",
    logout: "ඉවත් වෙන්න",
    offline: "ඔෆ්ලයින් · දත්ත ලෝකලව සුරකිනු ලැබේ",
    syncing: "දත්ත සමමුහුර්ත කිරීම...",
    syncDone: "සියලු දත්ත සමමුහුර්ත විය",
    home: "මුල් පිටුව",
    nextAppt: "ඊළඟ හමුව",
    myRecords: "මගේ වාර්තා",
    healthTips: "සෞඛ්‍ය උපදෙස්",
    reminders: "මතක් කිරීම්",
    familyConsent: "පවුල් කැමැත්ත",
    addFamily: "පවුලේ සාමාජිකයෙකු එකතු කරන්න",
    consentDesc: "පවුලේ සාමාජිකයෙකුට ඔබේ හමු මතක් කිරීම් ලබා ගැනීමට ඉඩ දෙන්න",
    todayVisits: "අද නිවාස හමු",
    dueFollowups: "නිරීක්ෂණ ලැයිස්තුව",
    searchMothers: "අම්මලා සොයන්න",
    dataEntry: "දත්ත ඇතුළු කිරීම",
    syncStatus: "සමමුහුර්ත තත්ත්වය",
    pendingRecords: "මාරු කිරීමට ඇති",
    clinicQueue: "අද ක්ලිනික් පෝළිම",
    immunizationEntry: "එන්නත / වර්ධනය ඇතුළු කිරීම",
    recordRetrieval: "වාර්තා සෙවීම",
    mohDashboard: "ඩෑෂ්බෝඩ්",
    highRiskAlerts: "ඉහළ අවදානම් අනතුරු",
    missedVisits: "මඟ හැරුණු හමු සාරාංශය",
    reportGenerator: "වාර්තා නිෂ්පාදකය",
    visitCompliance: "හමු අනුකූලතාව",
    immunizationCoverage: "එන්නත ආවරණය",
    highRiskCount: "ඉහළ අවදානම් සිදුවීම්",
    generateReport: "වාර්තාව සාදන්න",
    exportErhMis: "eRHMIS වෙත නිර්යාත කරන්න",
  },
  ta: {
    appName: "MatriCare",
    tagline: "தாய் மற்றும் குழந்தை சுகாதாரம்",
    taglineSub: "ஒவ்வொரு தாய்க்கும் குழந்தைக்கும் அக்கறை",
    loginTitle: "உள்நுழைக",
    phoneLogin: "தாய் / குடும்பம்",
    staffLogin: "கிளினிக் ஊழியர்",
    phonePlaceholder: "தொலைபேசி எண்",
    otpPlaceholder: "OTP உள்ளிடுக",
    staffIdPlaceholder: "ஊழியர் ID",
    passwordPlaceholder: "கடவுச்சொல்",
    sendOtp: "OTP அனுப்பு",
    signIn: "உள்நுழைக",
    demoLabel: "Demo — தட்டவும்:",
    settings: "அமைப்புகள்",
    language: "மொழி",
    notifications: "அறிவிப்புகள்",
    logout: "வெளியேறு",
    offline: "ஆஃப்லைன் · தரவு உள்ளூரில் சேமிக்கப்பட்டது",
    syncing: "தரவு ஒத்திசைக்கப்படுகிறது...",
    syncDone: "அனைத்து தரவும் ஒத்திசைக்கப்பட்டது",
    home: "முகப்பு",
    nextAppt: "அடுத்த சந்திப்பு",
    myRecords: "என் பதிவுகள்",
    healthTips: "சுகாதார குறிப்புகள்",
    reminders: "நினைவூட்டல்கள்",
    familyConsent: "குடும்ப சம்மதம்",
    addFamily: "குடும்ப உறுப்பினரை சேர்க்கவும்",
    consentDesc: "குடும்ப உறுப்பினர் உங்கள் சந்திப்பு நினைவூட்டல்களைப் பெற அனுமதிக்கவும்",
    todayVisits: "இன்றைய வருகைகள்",
    dueFollowups: "தொடர் கண்காணிப்பு பட்டியல்",
    searchMothers: "தாய்மார்களை தேடுக",
    dataEntry: "தரவு உள்ளீடு",
    syncStatus: "ஒத்திசைவு நிலை",
    pendingRecords: "பதிவேற்ற நிலுவையில்",
    clinicQueue: "இன்றைய வரிசை",
    immunizationEntry: "தடுப்பூசி / வளர்ச்சி உள்ளீடு",
    recordRetrieval: "பதிவு மீட்டெடுப்பு",
    mohDashboard: "டாஷ்போர்டு",
    highRiskAlerts: "அதிக ஆபத்து எச்சரிக்கைகள்",
    missedVisits: "தவறவிட்ட சந்திப்பு சுருக்கம்",
    reportGenerator: "அறிக்கை உருவாக்கி",
    visitCompliance: "சந்திப்பு இணக்கம்",
    immunizationCoverage: "தடுப்பூசி கவரேஜ்",
    highRiskCount: "அதிக ஆபத்து வழக்குகள்",
    generateReport: "அறிக்கை உருவாக்கு",
    exportErhMis: "eRHMIS க்கு ஏற்றுமதி",
  },
};
