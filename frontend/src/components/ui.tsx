import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, ViewStyle, TextInputProps } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { ROLE_CONFIG } from "../types";

export const C = {
  ink: "#0F2A2E",
  sub: "#5B7275",
  line: "#E3ECEA",
  card: "#FFFFFF",
  bg: "#F4F8F6",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  warn: "#D97706",
  warnBg: "#FEF3C7",
  ok: "#059669",
  okBg: "#D1FAE5",
};

/** Role palette, collapsed to grayscale in wireframe mode. */
export function usePalette() {
  const { role, wireframeMode } = useApp();
  const r = ROLE_CONFIG[role ?? "mother"];
  if (wireframeMode)
    return { color: "#555", colorLight: "#E5E5E5", colorDark: "#333", colorBg: "#F5F5F5", wf: true, tone: (_: string) => "#777" };
  return { ...r, wf: false, tone: (c: string) => c };
}

export function Card({ children, style, label }: { children: React.ReactNode; style?: ViewStyle; label?: string }) {
  const { wf } = usePalette();
  return (
    <View style={[s.card, wf && s.wfBox, style]}>
      {wf && label ? <WfLabel text={label} /> : null}
      {children}
    </View>
  );
}

export function WfLabel({ text }: { text: string }) {
  return (
    <View style={s.wfLabel}>
      <Text style={s.wfLabelText}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: string }) {
  const p = usePalette();
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      {action ? <Text style={[s.action, { color: p.color }]}>{action}</Text> : null}
    </View>
  );
}

export function Button({ title, onPress, icon, variant = "solid", style }: { title: string; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap; variant?: "solid" | "soft" | "ghost"; style?: ViewStyle }) {
  const p = usePalette();
  const bg = variant === "solid" ? p.color : variant === "soft" ? p.colorLight : "transparent";
  const fg = variant === "solid" ? "#fff" : p.colorDark;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: variant === "solid" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)" }}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, variant === "ghost" && { borderWidth: 1.5, borderColor: p.colorLight }, style]}
    >
      {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const { label, icon, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View style={s.field}>
        {icon ? <Ionicons name={icon} size={18} color={C.sub} /> : null}
        <TextInput placeholderTextColor="#9AABAD" style={[s.input, style]} {...rest} />
      </View>
    </View>
  );
}

export function Chip({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "danger" | "warn" | "ok" }) {
  const { wf } = usePalette();
  const map = { neutral: ["#EEF2F1", C.sub], danger: [C.dangerBg, C.danger], warn: [C.warnBg, C.warn], ok: [C.okBg, C.ok] } as const;
  const [bg, fg] = wf ? ["#EEE", "#555"] : map[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Ring({ value, size = 76, stroke = 8, color, label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const p = usePalette();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E8EFEE" strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.wf ? "#666" : color ?? p.color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - value / 100)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
        </Svg>
        <Text style={{ fontSize: 17, fontWeight: "800", color: C.ink }}>{value}%</Text>
      </View>
      {label ? <Text style={s.ringLabel}>{label}</Text> : null}
    </View>
  );
}

export function Row({ icon, title, sub, right, onPress, iconTone }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; iconTone?: string }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}
    >
      <View style={[s.rowIcon, { backgroundColor: p.wf ? "#EEE" : p.colorLight }]}>
        <Ionicons name={icon} size={20} color={p.tone(iconTone ?? p.colorDark)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.75)" : "#EDF2F1",
    shadowColor: "#0F2A2E",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2.5,
  },
  wfBox: { shadowOpacity: 0, elevation: 0, borderWidth: 1.5, borderColor: "#999", borderStyle: "dashed", backgroundColor: "#FAFAFA" },
  wfLabel: { position: "absolute", top: -9, left: 12, backgroundColor: "#222", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, zIndex: 2 },
  wfLabelText: { color: "#fff", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 6, marginBottom: 10 },
  section: { fontSize: 17, fontWeight: "800", color: C.ink },
  action: { fontSize: 13, fontWeight: "700" },
  btn: { minHeight: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: "700" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.sub, marginBottom: 6 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F3F7F6", borderRadius: 14, paddingHorizontal: 14, minHeight: 54, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, fontSize: 16, color: C.ink },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  chipText: { fontSize: 12, fontWeight: "700" },
  ringLabel: { marginTop: 6, fontSize: 12, fontWeight: "600", color: C.sub, textAlign: "center", maxWidth: 90 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, minHeight: 56 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
  rowSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  muted: { fontSize: 13, color: C.sub },
  h1: { fontSize: 24, fontWeight: "800", color: C.ink },
});
