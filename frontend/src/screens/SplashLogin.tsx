import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { Language, ROLE_CONFIG, Role, T } from "../types";
import { Button, C, Field } from "../components/ui";

const TEAL = "#0F766E";

export function Splash() {
  const { navigate, language } = useApp();
  useEffect(() => { const id = setTimeout(() => navigate("login"), 1800); return () => clearTimeout(id); }, []);
  return (
    <Pressable onPress={() => navigate("login")} style={[st.splash]}>
      <View style={st.logo}><Ionicons name="heart" size={46} color={TEAL} /></View>
      <Text style={st.appName}>MatriCare</Text>
      <Text style={st.tag}>{T[language].tagline}</Text>
      <Text style={st.tagSub}>{T[language].taglineSub}</Text>
    </Pressable>
  );
}

const LANGS: { k: Language; label: string }[] = [{ k: "en", label: "English" }, { k: "si", label: "සිංහල" }, { k: "ta", label: "தமிழ்" }];
const ROLE_ICON: Record<Role, keyof typeof Ionicons.glyphMap> = { mother: "woman", family_member: "people", phm: "walk", nursing: "medkit", moh: "stats-chart" };
const DEMO_ROLES: Role[] = ["mother", "phm", "nursing", "moh"];

export function Login() {
  const { language, setLanguage, login, requestPhoneOtp, verifyPhoneOtp } = useApp();
  const t = T[language];
  const [mode, setMode] = useState<"mother" | "staff">("mother");
  const [otpSent, setOtpSent] = useState(false);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [authError, setAuthError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [submittingPhone, setSubmittingPhone] = useState(false);

  const handleDemoLogin = async (r: Role) => {
    if (loadingRole) return;
    setLoadingRole(r);
    try {
      await login(r);
    } finally {
      setLoadingRole(null);
    }
  };

  const handlePhoneLogin = async () => {
    if (submittingPhone) return;
    setSubmittingPhone(true);
    setAuthError("");
    try {
      if (!otpSent) {
        const result = await requestPhoneOtp(phone);
        setOtpSent(true);
        setDevOtp(result.devOtp ?? "");
      } else {
        await verifyPhoneOtp(phone, otp);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally {
      setSubmittingPhone(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0FDFA" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={st.langRow}>
          {LANGS.map((l) => (
            <Pressable key={l.k} onPress={() => setLanguage(l.k)} style={[st.lang, language === l.k && { backgroundColor: TEAL }]}>
              <Text style={[st.langText, language === l.k && { color: "#fff" }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ alignItems: "center", marginVertical: 24 }}>
          <View style={[st.logo, { backgroundColor: TEAL }]}><Ionicons name="heart" size={36} color="#fff" /></View>
          <Text style={[st.appName, { color: C.ink, fontSize: 28 }]}>{t.appName}</Text>
          <Text style={{ color: C.sub }}>{t.tagline}</Text>
        </View>

        <View style={st.card}>
          <View style={st.seg}>
            {(["mother", "staff"] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[st.segItem, mode === m && st.segActive]}>
                <Text style={[st.segText, mode === m && { color: TEAL }]}>{m === "mother" ? t.phoneLogin : t.staffLogin}</Text>
              </Pressable>
            ))}
          </View>
          {mode === "mother" ? (
            <>
              <Field icon="call" placeholder={t.phonePlaceholder} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              {otpSent && <Field icon="key" placeholder={t.otpPlaceholder} keyboardType="number-pad" value={otp} onChangeText={setOtp} />}
              {devOtp ? <Text style={st.devOtp}>Development OTP: {devOtp}</Text> : null}
              {authError ? <Text accessibilityRole="alert" style={st.authError}>{authError}</Text> : null}
              <Button title={submittingPhone ? "Please wait…" : otpSent ? t.signIn : t.sendOtp} onPress={() => void handlePhoneLogin()} style={{ backgroundColor: TEAL }} />
            </>
          ) : (
            <>
              <Field icon="id-card" placeholder={t.staffIdPlaceholder} autoCapitalize="characters" />
              <Field icon="lock-closed" placeholder={t.passwordPlaceholder} secureTextEntry />
              <Button title={t.signIn} onPress={() => login("phm")} style={{ backgroundColor: TEAL }} />
            </>
          )}
        </View>

        <Text style={st.demo}>{t.demoLabel}</Text>
        <View style={st.demoGrid}>
          {DEMO_ROLES.map((r) => (
            <Pressable
              key={r}
              disabled={!!loadingRole}
              onPress={() => handleDemoLogin(r)}
              style={({ pressed }) => [
                st.demoBtn,
                { borderColor: ROLE_CONFIG[r].colorLight },
                (pressed || loadingRole === r) && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[st.demoIcon, { backgroundColor: ROLE_CONFIG[r].colorLight }]}>
                {loadingRole === r ? (
                  <ActivityIndicator size="small" color={ROLE_CONFIG[r].colorDark} />
                ) : (
                  <Ionicons name={ROLE_ICON[r]} size={22} color={ROLE_CONFIG[r].colorDark} />
                )}
              </View>
              <Text style={st.demoRole}>{r.toUpperCase()}</Text>
              <Text style={st.demoName} numberOfLines={1}>{ROLE_CONFIG[r].name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  splash: { flex: 1, backgroundColor: TEAL, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: 84, height: 84, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  appName: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  tag: { color: "#CCFBF1", fontSize: 16, fontWeight: "700", marginTop: 6 },
  tagSub: { color: "#99F6E4", fontSize: 13, marginTop: 4 },
  langRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  lang: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "#fff" },
  langText: { fontWeight: "700", color: C.ink },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 18, elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14 },
  seg: { flexDirection: "row", backgroundColor: "#F0F5F4", borderRadius: 14, padding: 4, marginBottom: 16 },
  segItem: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: "center" },
  segActive: { backgroundColor: "#fff", elevation: 1 },
  segText: { fontWeight: "700", color: C.sub },
  demo: { textAlign: "center", color: C.sub, marginTop: 24, marginBottom: 12, fontWeight: "600" },
  devOtp: { color: C.sub, fontSize: 12, marginBottom: 8, textAlign: "center" },
  authError: { color: "#B42318", fontSize: 12, marginBottom: 8 },
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  demoBtn: { width: "48%", backgroundColor: "#fff", borderRadius: 18, padding: 14, borderWidth: 1.5 },
  demoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  demoRole: { fontSize: 11, fontWeight: "800", color: C.sub, letterSpacing: 1 },
  demoName: { fontSize: 14, fontWeight: "700", color: C.ink },
});
