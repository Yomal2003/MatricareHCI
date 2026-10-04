import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { ROLE_CONFIG } from "../types";
import { WfLabel } from "./ui";
import GlassSurface from "./GlassSurface";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  calendar: "calendar-outline",
  document: "document-text-outline",
  people: "people-outline",
  search: "search-outline",
  edit: "create-outline",
  sync: "sync-outline",
  bell: "notifications-outline",
  chart: "bar-chart-outline",
  report: "clipboard-outline",
};

export default function BottomNavBar() {
  const { role, currentScreen, navigate, language, wireframeMode } = useApp();

  if (!role || !ROLE_CONFIG[role]) return null;

  const cfg = ROLE_CONFIG[role];
  const items = cfg.navItems;

  return (
    <SafeAreaView edges={["bottom"]} style={st.safeArea}>
      {wireframeMode && <WfLabel text="BOTTOM NAV" />}
      <GlassSurface
        intensity={85}
        tint="systemChromeMaterialLight"
        borderRadius={0}
        glassBorder={false}
        style={[
          st.container,
          wireframeMode && { borderWidth: 1, borderColor: "#999", borderStyle: "dashed" },
        ]}
      >
        {items.map((item) => {
          const isActive = currentScreen === item.screen;
          const label = language === "si" ? item.labelSi : item.labelEn;
          const iconName = ICONS[item.icon] || "apps-outline";

          return (
            <Pressable
              key={item.key}
              onPress={() => navigate(item.screen)}
              android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: true, radius: 26 }}
              style={({ pressed }) => [st.tabButton, pressed && { opacity: 0.75 }]}
            >
              <View
                style={[
                  st.iconContainer,
                  isActive && { backgroundColor: cfg.colorLight },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={21}
                  color={isActive ? cfg.colorDark : "#94A3B8"}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  st.tabLabel,
                  {
                    color: isActive ? cfg.colorDark : "#94A3B8",
                    fontWeight: isActive ? "800" : "600",
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 999,
  },
  container: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.55)" : "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    minHeight: 46,
  },
  iconContainer: {
    paddingHorizontal: 13,
    paddingVertical: 3,
    borderRadius: 14,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10.5,
    textAlign: "center",
  },
});
