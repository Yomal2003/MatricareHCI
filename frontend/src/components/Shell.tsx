import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { ROLE_CONFIG, Screen, T } from "../types";
import { C, usePalette, WfLabel } from "./ui";
import BottomNavBar from "./BottomNavBar";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home", calendar: "calendar", document: "document-text", people: "people", search: "search",
  edit: "create", sync: "sync", bell: "notifications", chart: "bar-chart", report: "clipboard",
};

export default function Shell({
  title,
  children,
  headerBadge,
  headerLeadingIcon,
  headerBackTo,
}: {
  title: string;
  children: React.ReactNode;
  headerBadge?: string | null;
  headerLeadingIcon?: keyof typeof Ionicons.glyphMap;
  headerBackTo?: Screen;
}) {
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
          {headerBackTo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to home"
              onPress={() => navigate(headerBackTo)}
              hitSlop={8}
              style={({ pressed }) => [st.avatar, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name={headerLeadingIcon ?? "chevron-back"} size={20} color="#fff" />
            </Pressable>
          ) : (
            <View style={st.avatar}>
              {headerLeadingIcon
                ? <Ionicons name={headerLeadingIcon} size={20} color="#fff" />
                : <Text style={st.avatarText}>{cfg.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</Text>}
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{title}</Text>
            {headerBadge !== null && <Text style={st.badge}>{headerBadge ?? cfg.badge}</Text>}
          </View>
          <Pressable
            onPress={toggleOnline}
            hitSlop={10}
            android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: true, radius: 20 }}
            style={({ pressed }) => [st.iconBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name={isOnline ? "cloud-done" : "cloud-offline"} size={21} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => navigate("settings")}
            hitSlop={10}
            android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: true, radius: 20 }}
            style={({ pressed }) => [st.iconBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="settings-sharp" size={21} color="#fff" />
          </Pressable>
        </View>
        {(!isOnline || isSyncing) && (
          <View style={[st.banner, { backgroundColor: isOnline ? "rgba(0,0,0,0.18)" : "#7C2D12" }]}>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
  badge: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1, fontWeight: "600" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  bannerText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
