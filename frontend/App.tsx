import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { AppCtx } from "./src/context";
import type { Language, Role, Screen } from "./src/types";
import { ROLE_CONFIG } from "./src/types";
import { api, flushPending, getPending, setToken } from "./src/api/client";
import { Splash, Login } from "./src/screens/SplashLogin";
import Settings from "./src/screens/Settings";
import { MotherHome, MotherAppointments, MotherRecords, MotherConsent } from "./src/screens/Mother";
import { PHMHome, PHMProfile, PHMFollowups, PHMSearch, PHMEntry, PHMSync } from "./src/screens/PHM";
import { NursingHome, NursingEntry, NursingSearch } from "./src/screens/Nursing";
import { MOHHome, MOHAlerts, MOHMissed, MOHReports } from "./src/screens/MOH";

// Screen → component, and which roles may open it (client-side guard; server enforces too).
const ROUTES: Record<Screen, { C: React.ComponentType; roles?: Role[] }> = {
  splash: { C: Splash }, login: { C: Login }, settings: { C: Settings, roles: ["mother", "phm", "nursing", "moh"] },
  "mother-home": { C: MotherHome, roles: ["mother"] }, "mother-appointments": { C: MotherAppointments, roles: ["mother"] },
  "mother-records": { C: MotherRecords, roles: ["mother"] }, "mother-consent": { C: MotherConsent, roles: ["mother"] },
  "phm-home": { C: PHMHome, roles: ["phm"] }, "phm-profile": { C: PHMProfile, roles: ["phm"] }, "phm-followups": { C: PHMFollowups, roles: ["phm"] },
  "phm-search": { C: PHMSearch, roles: ["phm"] }, "phm-entry": { C: PHMEntry, roles: ["phm"] }, "phm-sync": { C: PHMSync, roles: ["phm"] },
  "nursing-home": { C: NursingHome, roles: ["nursing"] }, "nursing-entry": { C: NursingEntry, roles: ["nursing"] },
  "nursing-search": { C: NursingSearch, roles: ["nursing"] },
  "moh-home": { C: MOHHome, roles: ["moh"] }, "moh-alerts": { C: MOHAlerts, roles: ["moh"] },
  "moh-missed": { C: MOHMissed, roles: ["moh"] }, "moh-reports": { C: MOHReports, roles: ["moh"] },
};

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [isOnline, setOnline] = useState(true);
  const [forcedOffline, setForcedOffline] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [currentScreen, setScreen] = useState<Screen>("splash");
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(() => void getPending().then((l) => setPending(l.length)), []);

  useEffect(() => {
    refreshPending();
    return NetInfo.addEventListener((st) => setOnline(!!st.isConnected));
  }, []);

  const online = isOnline && !forcedOffline;

  // Auto-sync queued entries whenever we come back online.
  useEffect(() => {
    if (!online || !role || !pending || (role !== "phm" && role !== "nursing")) return;
    setSyncing(true);
    flushPending().catch(() => {}).finally(() => { setSyncing(false); refreshPending(); });
  }, [online, role]);

  const navigate = useCallback((s: Screen) => {
    const r = ROUTES[s].roles;
    if (r && (!role || !r.includes(role))) return; // permission boundary
    setScreen(s);
  }, [role]);

  const login = useCallback(async (r: Role) => {
    try {
      const res = await api<{ token: string; user: { id: string; name: string } }>("/auth/login", { method: "POST", body: { role: r } });
      setToken(res.token);
      setUser(res.user);
    } catch {
      setUser({ id: "offline", name: ROLE_CONFIG[r].name }); // demo fallback when server unreachable
    }
    setRole(r);
    setScreen(ROLE_CONFIG[r].homeScreen);
  }, []);

  const logout = useCallback(() => { setToken(null); setRole(null); setUser(null); setScreen("login"); }, []);

  const value = useMemo(() => ({
    role, user, language, isOnline: online, isSyncing, currentScreen, wireframeMode, showLanguageModal, pending,
    navigate, login, logout, setLanguage, setWireframeMode, setShowLanguageModal, refreshPending,
    toggleOnline: () => setForcedOffline((v) => !v),
  }), [role, user, language, online, isSyncing, currentScreen, wireframeMode, showLanguageModal, pending, navigate, login, logout]);

  const Current = ROUTES[currentScreen].C;
  return (
    <SafeAreaProvider>
      <AppCtx.Provider value={value}>
        <StatusBar style={role ? "light" : "dark"} />
        <Current />
      </AppCtx.Provider>
    </SafeAreaProvider>
  );
}
