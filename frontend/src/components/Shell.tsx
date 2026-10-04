import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { ROLE_CONFIG, T } from "../types";
import { C, usePalette, WfLabel } from "./ui";
import BottomNavBar from "./BottomNavBar";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home", calendar: "calendar", document: "document-text", people: "people", search: "search",
  edit: "create", sync: "sync", bell: "notifications", chart: "bar-chart", report: "clipboard",
};

export default function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { role, language, isOnline, isSyncing, currentScreen, navigate, wireframeMode, toggleOnline, pending } = useApp();
  const p = usePalette();
  const cfg = ROLE_CONFIG[role!];
  const t = T[language];

  return (
    <View style={{ flex: 1, backgroundColor: p.wf ? "#F2F2F2" : p.colorBg }}>
      {/* Top bar */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: p.color }}>
        {wireframeMode && <WfLabel text="TOP BAR" />}
        <View style={st.top}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{cfg.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{title}</Text>
            <Text style={st.badge}>{cfg.badge}</Text>
          </View>
          <Pressable onPress={toggleOnline} hitSlop={10} style={st.iconBtn}>
            <Ionicons name={isOnline ? "cloud-done" : "cloud-offline"} size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={() => navigate("settings")} hitSlop={10} style={st.iconBtn}>
            <Ionicons name="settings-sharp" size={22} color="#fff" />
          </Pressable>
        </View>
        {(!isOnline || isSyncing) && (
          <View style={[st.banner, { backgroundColor: isOnline ? p.colorDark : "#7C2D12" }]}>
            <Ionicons name={isOnline ? "sync" : "cloud-offline"} size={14} color="#fff" />
            <Text style={st.bannerText}>{isOnline ? t.syncing : `${t.offline}${pending ? ` · ${pending} pending` : ""}`}</Text>
          </View>
        )}
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>

      {wireframeMode && <DotGrid />}

      {/* Bottom nav */}
      <BottomNavBar />
    </View>
  );
}

function DotGrid() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <Circle cx="1" cy="1" r="1" fill="#000" opacity={0.12} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  title: { color: "#fff", fontSize: 19, fontWeight: "800" },
  badge: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 },
  bannerText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  navWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: 8 },
  nav: { flexDirection: "row", backgroundColor: C.card, borderRadius: 26, padding: 8, gap: 4, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  navItem: { flex: 1, minHeight: 50, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 },
  navLabel: { fontSize: 12, fontWeight: "800" },
});
