import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { Language, T } from "../types";
import { StaffManagement } from "./StaffManagement";
import { MOHReportsScreen } from "./MOHReportsScreen";
import {
  getMohDashboard,
  getMohAlerts,
  getMohAlertDetail,
  getMohClinicAreas,
  setAlertClinicAreaFilter,
  getAlertClinicAreaFilter,
} from "../api/mohApi";
import {
  DashboardSkeleton,
  ErrorState,
  EmptyState,
  SkeletonBox,
} from "../components/MohStateComponents";

// Design Tokens & Palette
const PRIMARY = "#7B4FE0";
const PRIMARY_DARK = "#6B3FD4";
const PRIMARY_LIGHT = "#EDE9FE";
const PRIMARY_TINT = "#F5F3FF";
const BG_COLOR = "#F5F6FA";
const CARD_BG = "#FFFFFF";

const SUCCESS = "#10B981";
const SUCCESS_BG = "#DCFCE7";
const SUCCESS_TEXT = "#15803D";

const DANGER = "#EF4444";
const DANGER_BG = "#FEE2E2";
const DANGER_TEXT = "#B91C1C";

const WARNING = "#F59E0B";
const WARNING_BG = "#FEF3C7";
const WARNING_TEXT = "#B45309";

const TEXT_MAIN = "#1E293B";
const TEXT_MUTED = "#64748B";
const TEXT_LIGHT = "#94A3B8";
const BORDER_COLOR = "#EEF2F6";

// Live Data Types
export interface ZoneComplianceItem {
  clinicAreaId: string;
  name: string;
  value: number | null;
  visits: { done: number; scheduled: number };
}

export interface RecentActivityItem {
  type: "high_risk" | "overdue" | "sync" | "record";
  message: string;
  createdAt: string;
  refId?: string;
}

export interface DashboardData {
  mohOffice: { id: string; name: string; district: string; province: string };
  doctor: { fullName: string; profileImageUrl?: string | null };
  indicators: {
    visitCompliance: { value: number | null; target: number; trend: string | null };
    immunizationCoverage: { value: number | null; target: number; trend: string | null };
    highRiskCases: { value: number; change: number };
    clinicAreas: { value: number };
  };
  zoneCompliance: ZoneComplianceItem[];
  districtAverage: number | null;
  recentActivity: RecentActivityItem[];
}

// Circular Ring Donut Component
function RingDonut({
  value,
  strokeColor,
  trackColor,
  size = 56,
  strokeWidth = 5.5,
  displayValue,
}: {
  value: number | null | undefined;
  strokeColor: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  displayValue?: string | number;
}) {
  const numericValue = typeof value === "number" && !isNaN(value) ? Math.min(Math.max(0, value), 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - numericValue / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Fill Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.ringText, { color: strokeColor }]}>
        {displayValue !== undefined ? displayValue : (value !== null && value !== undefined ? value : "—")}
      </Text>
    </View>
  );
}

// ----------------------------------------------------
// MAIN DASHBOARD COMPONENT (MOHHome)
// ----------------------------------------------------
export function MOHHome() {
  const { language, setLanguage, navigate } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeActivity, setActiveActivity] = useState<RecentActivityItem | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setError(null);
    try {
      const res = await getMohDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getComplianceColor = (val: number | null | undefined, target = 85) => {
    if (val === null || val === undefined) return "#94A3B8";
    if (val >= target) return SUCCESS;
    if (val >= target - 10) return WARNING;
    return DANGER;
  };

  const handleZonePress = (zone: ZoneComplianceItem) => {
    setAlertClinicAreaFilter(zone.clinicAreaId);
    navigate("moh-alerts");
  };

  const formatActivityTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 1) return "Just now";
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const days = Math.floor(diffHrs / 24);
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";

  if (loading && !data) {
    return (
      <View style={styles.screenContainer}>
        <LinearGradient colors={["#7B4FE0", "#6B3FD4"]} style={styles.headerGradient}>
          <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
            <View style={styles.headerContent}>
              <View style={styles.headerTopRow}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarCircle}><Ionicons name="person" size={26} color="#FFFFFF" /></View>
                  <View style={styles.onlineDot} />
                </View>
                <View style={styles.headerNameCol}>
                  <Text style={styles.greetingText}>{greeting}</Text>
                  <Text style={styles.doctorName}>MOH Doctor</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <DashboardSkeleton />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.screenContainer}>
        <LinearGradient colors={["#7B4FE0", "#6B3FD4"]} style={styles.headerGradient}>
          <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
            <View style={styles.headerContent}>
              <View style={styles.headerTopRow}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarCircle}><Ionicons name="person" size={26} color="#FFFFFF" /></View>
                </View>
                <View style={styles.headerNameCol}>
                  <Text style={styles.greetingText}>{greeting}</Text>
                  <Text style={styles.doctorName}>MOH Doctor</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <ErrorState message={error} onRetry={() => fetchDashboard(false)} />
      </View>
    );
  }

  const indicators = data?.indicators;
  const visitCompVal = indicators?.visitCompliance?.value;
  const visitTarget = indicators?.visitCompliance?.target || 85;
  const immVal = indicators?.immunizationCoverage?.value;
  const immTarget = indicators?.immunizationCoverage?.target || 95;
  const highRiskVal = indicators?.highRiskCases?.value ?? 0;
  const highRiskChange = indicators?.highRiskCases?.change ?? 0;
  const clinicAreasCount = indicators?.clinicAreas?.value ?? 0;

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      >
        {/* ==================================================== */}
        {/* 1. HEADER (Purple Gradient, Real Profile, Pills)     */}
        {/* ==================================================== */}
        <LinearGradient
          colors={["#7B4FE0", "#6B3FD4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
            <View style={styles.headerContent}>
              {/* Row 1: Profile & Action Icons */}
              <View style={styles.headerTopRow}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.onlineDot} />
                </View>

                {/* Greeting & Doctor's Real Name */}
                <View style={styles.headerNameCol}>
                  <Text style={styles.greetingText}>{greeting}</Text>
                  <Text style={styles.doctorName}>{data?.doctor?.fullName || "MOH Doctor"}</Text>
                </View>

                {/* Top-Right Circular Action Buttons */}
                <View style={styles.headerActionsRow}>
                  <Pressable
                    onPress={() => setShowLangModal(true)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.circularBtn, pressed && styles.circularBtnPressed]}
                    accessibilityLabel="Language Switcher"
                  >
                    <Ionicons name="globe-outline" size={19} color="#FFFFFF" />
                  </Pressable>

                  <Pressable
                    onPress={() => navigate("settings")}
                    hitSlop={8}
                    style={({ pressed }) => [styles.circularBtn, pressed && styles.circularBtnPressed]}
                    accessibilityLabel="Settings"
                  >
                    <Ionicons name="settings-outline" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {/* Row 2: Badges below doctor's name */}
              <View style={styles.pillsRow}>
                <View style={styles.districtPill}>
                  <Ionicons name="location-sharp" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.districtPillText}>
                    {data?.mohOffice?.name || "MOH Office"} • {data?.mohOffice?.district || "District"}
                  </Text>
                </View>

                <View style={styles.roleTagPill}>
                  <Text style={styles.roleTagPillText}>MOH</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Outer body wrapper with responsive padding */}
        <View style={styles.bodyWrapper}>
          {/* ==================================================== */}
          {/* 2. KEY INDICATORS — 2x2 Grid of White Rounded Cards  */}
          {/* ==================================================== */}
          <View style={styles.grid2x2}>
            {/* Card 1: Visit Compliance */}
            <Pressable
              onPress={() => setShowIndicatorModal("visit")}
              style={({ pressed }) => [styles.kpiCard, styles.kpiCardHalf, pressed && styles.cardPressed]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Visit Compliance</Text>
              </View>
              <Text style={styles.kpiTarget}>Target: {visitTarget}%</Text>

              {/* Horizontal Progress Bar & Right-Aligned Percentage */}
              <View style={styles.progressBarSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: visitCompVal !== null && visitCompVal !== undefined ? `${Math.min(visitCompVal, 100)}%` : "0%",
                        backgroundColor: getComplianceColor(visitCompVal, visitTarget),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressValueText, { color: getComplianceColor(visitCompVal, visitTarget) }]}>
                  {visitCompVal !== null && visitCompVal !== undefined ? `${visitCompVal}%` : "No data yet"}
                </Text>
              </View>

              <View style={styles.kpiSubBadgeRow}>
                {visitCompVal !== null && visitCompVal !== undefined ? (
                  <View style={visitCompVal >= visitTarget ? styles.pillGreenMini : styles.pillAmberMini}>
                    <Ionicons
                      name={visitCompVal >= visitTarget ? "arrow-up" : "arrow-down"}
                      size={10}
                      color={visitCompVal >= visitTarget ? SUCCESS_TEXT : WARNING_TEXT}
                    />
                    <Text style={visitCompVal >= visitTarget ? styles.pillGreenMiniText : styles.pillAmberMiniText}>
                      {indicators?.visitCompliance?.trend || `${visitCompVal}% compliance`}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>No visits recorded</Text>
                )}
              </View>
            </Pressable>

            {/* Card 2: Immunization Coverage */}
            <Pressable
              onPress={() => setShowIndicatorModal("immunization")}
              style={({ pressed }) => [styles.kpiCard, styles.kpiCardHalf, pressed && styles.cardPressed]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Immunization Coverage</Text>
              </View>
              <Text style={styles.kpiTarget}>Target: {immTarget}%</Text>

              {/* Horizontal Progress Bar & Right-Aligned Percentage */}
              <View style={styles.progressBarSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: immVal !== null && immVal !== undefined ? `${Math.min(immVal, 100)}%` : "0%",
                        backgroundColor: getComplianceColor(immVal, immTarget),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressValueText, { color: getComplianceColor(immVal, immTarget) }]}>
                  {immVal !== null && immVal !== undefined ? `${immVal}%` : "No data yet"}
                </Text>
              </View>

              <View style={styles.kpiSubBadgeRow}>
                {immVal !== null && immVal !== undefined ? (
                  <View style={immVal >= immTarget ? styles.pillGreenMini : styles.pillAmberMini}>
                    <Text style={immVal >= immTarget ? styles.pillGreenMiniText : styles.pillAmberMiniText}>
                      {indicators?.immunizationCoverage?.trend || `Target: ${immTarget}%`}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>No children registered</Text>
                )}
              </View>
            </Pressable>

            {/* Card 3: High-Risk Cases */}
            <Pressable
              onPress={() => navigate("moh-alerts")}
              style={({ pressed }) => [styles.kpiCard, styles.kpiCardHalf, pressed && styles.cardPressed]}
            >
              <View style={styles.kpiTopBadgeRow}>
                <View style={highRiskChange <= 0 ? styles.trendBadgeGreen : styles.pillAmberMini}>
                  <Ionicons
                    name={highRiskChange <= 0 ? "arrow-down" : "arrow-up"}
                    size={11}
                    color={highRiskChange <= 0 ? SUCCESS_TEXT : DANGER_TEXT}
                  />
                  <Text style={highRiskChange <= 0 ? styles.trendBadgeGreenText : { color: DANGER_TEXT, fontSize: 10, fontWeight: "700" }}>
                    {highRiskChange >= 0 ? `+${highRiskChange}` : `${highRiskChange}`} vs last
                  </Text>
                </View>
              </View>

              <View style={styles.ringCenterContainer}>
                <RingDonut
                  value={highRiskVal > 0 ? 100 : 0}
                  strokeColor={highRiskVal > 0 ? DANGER : SUCCESS}
                  trackColor={highRiskVal > 0 ? DANGER_BG : SUCCESS_BG}
                  size={58}
                  displayValue={highRiskVal}
                />
              </View>

              <Text style={styles.largeBoldNumber}>{highRiskVal}</Text>
              <Text style={styles.kpiCardBottomLabel}>High-Risk Cases</Text>
            </Pressable>

            {/* Card 4: Active Clinic Areas (Replaces PHM Zones) */}
            <Pressable
              onPress={() => navigate("moh-missed")}
              style={({ pressed }) => [styles.kpiCard, styles.kpiCardHalf, pressed && styles.cardPressed]}
            >
              <View style={styles.kpiTopBadgeRow}>
                <View style={styles.trendBadgeGreen}>
                  <Text style={styles.trendBadgeGreenText}>active</Text>
                </View>
              </View>

              <View style={styles.ringCenterContainer}>
                <RingDonut
                  value={clinicAreasCount > 0 ? 100 : 0}
                  strokeColor={PRIMARY}
                  trackColor={PRIMARY_LIGHT}
                  size={58}
                  displayValue={clinicAreasCount}
                />
              </View>

              <Text style={styles.largeBoldNumber}>{clinicAreasCount}</Text>
              <Text style={styles.kpiCardBottomLabel}>Active Clinic Areas</Text>
            </Pressable>
          </View>

          {/* ==================================================== */}
          {/* 3. ZONE VISIT COMPLIANCE SECTION                     */}
          {/* ==================================================== */}
          <View style={styles.sectionContainer}>
            <View style={styles.singleCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>CLINIC AREA VISIT COMPLIANCE (%)</Text>
                <Text style={styles.sectionHint}>Tap bar to view alerts</Text>
              </View>

              {(!data?.zoneCompliance || data.zoneCompliance.length === 0) ? (
                <EmptyState
                  icon="business-outline"
                  title="No clinic areas or visit data yet"
                  description="Register clinic areas and field staff to begin tracking compliance."
                  actionLabel="Add clinic area"
                  onAction={() => navigate("moh-missed")}
                />
              ) : (
                <>
                  <View style={styles.barChartContainer}>
                    {data.zoneCompliance.map((zone) => {
                      const maxBarHeight = 110;
                      const hasVal = zone.value !== null && zone.value !== undefined;
                      const barHeight = hasVal ? Math.max(12, ((zone.value || 0) / 100) * maxBarHeight) : 8;
                      const barColor = getComplianceColor(zone.value, 85);

                      return (
                        <Pressable
                          key={zone.clinicAreaId}
                          onPress={() => handleZonePress(zone)}
                          style={({ pressed }) => [styles.barColumn, pressed && { opacity: 0.75 }]}
                        >
                          <Text style={[styles.barValueText, { color: barColor, fontWeight: "800" }]}>
                            {hasVal ? `${zone.value}%` : "—"}
                          </Text>

                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: barHeight,
                                  backgroundColor: barColor,
                                },
                              ]}
                            />
                          </View>

                          <Text numberOfLines={1} style={styles.barZoneName}>
                            {zone.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.districtAverageRow}>
                    <View style={styles.districtAvgLabelCol}>
                      <Text style={styles.districtAvgLabel}>District average</Text>
                      <Text style={styles.districtAvgSub}>Weighted across all active MOH divisions</Text>
                    </View>
                    <Text style={styles.districtAvgValue}>
                      {data?.districtAverage !== null && data?.districtAverage !== undefined ? `${data.districtAverage}%` : "No data"}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ==================================================== */}
          {/* 4. RECENT ACTIVITY SECTION                           */}
          {/* ==================================================== */}
          <View style={[styles.sectionContainer, { marginBottom: 110 }]}>
            <Text style={styles.sectionTitleOutside}>RECENT ACTIVITY</Text>

            <View style={styles.singleCard}>
              {(!data?.recentActivity || data.recentActivity.length === 0) ? (
                <EmptyState
                  icon="notifications-off-outline"
                  title="No recent activity"
                  description="High-risk flags, overdue checks, and staff record entries will appear here."
                />
              ) : (
                data.recentActivity.map((activity, index) => {
                  const isLast = index === (data.recentActivity.length - 1);

                  let iconBg = PRIMARY_LIGHT;
                  let iconColor = PRIMARY;
                  let iconName: keyof typeof Ionicons.glyphMap = "information";

                  if (activity.type === "high_risk") {
                    iconBg = DANGER_BG;
                    iconColor = DANGER;
                    iconName = "alert-circle";
                  } else if (activity.type === "overdue") {
                    iconBg = WARNING_BG;
                    iconColor = WARNING;
                    iconName = "time-outline";
                  } else if (activity.type === "sync") {
                    iconBg = SUCCESS_BG;
                    iconColor = SUCCESS;
                    iconName = "checkmark-circle";
                  } else {
                    iconBg = PRIMARY_LIGHT;
                    iconColor = PRIMARY;
                    iconName = "medkit";
                  }

                  return (
                    <Pressable
                      key={activity.refId || `act-${index}`}
                      onPress={() => {
                        if (activity.type === "high_risk" || activity.type === "overdue") {
                          navigate("moh-alerts");
                        }
                      }}
                      style={({ pressed }) => [styles.activityRow, pressed && styles.activityRowPressed]}
                    >
                      <View style={[styles.activityIconCircle, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={19} color={iconColor} />
                      </View>

                      <View style={styles.activityTextCol}>
                        <Text style={styles.activityTitle} numberOfLines={2}>{activity.message}</Text>
                      </View>

                      <View style={styles.activityRightCol}>
                        <Text style={styles.activityTime}>{formatActivityTime(activity.createdAt)}</Text>
                        <Ionicons name="chevron-forward" size={14} color={TEXT_LIGHT} style={{ marginTop: 2 }} />
                      </View>

                      {!isLast && <View style={styles.rowSeparator} />}
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* 5. BOTTOM NAVIGATION BAR (Fixed, White, Top Shadow)  */}
      {/* ==================================================== */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomNavSafeArea}>
        <View style={styles.bottomNavContainer}>
          <Pressable
            onPress={() => navigate("moh-home")}
            style={styles.navTab}
            accessibilityRole="tab"
            accessibilityState={{ selected: true }}
          >
            <View style={[styles.navIconBox, styles.navIconBoxActive]}>
              <Ionicons name="home" size={20} color={PRIMARY} />
            </View>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
          </Pressable>

          <Pressable
            onPress={() => navigate("moh-alerts")}
            style={styles.navTab}
            accessibilityRole="tab"
          >
            <View style={styles.navIconBox}>
              <Ionicons name="notifications-outline" size={21} color={TEXT_MUTED} />
              {highRiskVal > 0 && (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{highRiskVal}</Text>
                </View>
              )}
            </View>
            <Text style={styles.navLabel}>Alerts</Text>
          </Pressable>

          <Pressable
            onPress={() => navigate("moh-missed")}
            style={styles.navTab}
            accessibilityRole="tab"
          >
            <View style={styles.navIconBox}>
              <Ionicons name="people-outline" size={21} color={TEXT_MUTED} />
            </View>
            <Text style={styles.navLabel}>Staff</Text>
          </Pressable>

          <Pressable
            onPress={() => navigate("moh-reports")}
            style={styles.navTab}
            accessibilityRole="tab"
          >
            <View style={styles.navIconBox}>
              <Ionicons name="document-text-outline" size={21} color={TEXT_MUTED} />
            </View>
            <Text style={styles.navLabel}>Reports</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Language Switcher Modal */}
      <Modal
        visible={showLangModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLangModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLangModal(false)}>
          <Pressable style={styles.langModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.langModalTitle}>Select Language</Text>
            <Text style={styles.langModalSub}>භාෂාව තෝරන්න / மொழியைத் தேர்ந்தெடுக்கவும்</Text>

            {[
              { code: "en", label: "English", sub: "Default MOH language" },
              { code: "si", label: "සිංහල", sub: "Sinhala" },
              { code: "ta", label: "தமிழ்", sub: "Tamil" },
            ].map((item) => (
              <Pressable
                key={item.code}
                onPress={() => {
                  setLanguage(item.code as Language);
                  setShowLangModal(false);
                }}
                style={[styles.langOptionRow, language === item.code && styles.langOptionRowActive]}
              >
                <View>
                  <Text style={[styles.langOptionText, language === item.code && { color: PRIMARY, fontWeight: "800" }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.langOptionSub}>{item.sub}</Text>
                </View>
                {language === item.code && <Ionicons name="checkmark-circle" size={22} color={PRIMARY} />}
              </Pressable>
            ))}

            <Pressable onPress={() => setShowLangModal(false)} style={styles.langModalCancelBtn}>
              <Text style={styles.langModalCancelBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Indicator Breakdown Modal */}
      <Modal
        visible={!!showIndicatorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIndicatorModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowIndicatorModal(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {showIndicatorModal === "visit"
                    ? "Visit Compliance Breakdown"
                    : "Immunization Coverage Breakdown"}
                </Text>
                <Text style={styles.modalSubTitle}>
                  {data?.mohOffice?.name} MOH Registry
                </Text>
              </View>
              <Pressable onPress={() => setShowIndicatorModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </Pressable>
            </View>

            <View style={styles.indicatorDetailCard}>
              <Text style={styles.indicatorDetailIntro}>
                {showIndicatorModal === "visit"
                  ? `Maternal routine visits stand at ${visitCompVal !== null && visitCompVal !== undefined ? `${visitCompVal}%` : "no data"}, benchmark target is ${visitTarget}%.`
                  : `Childhood immunization coverage is ${immVal !== null && immVal !== undefined ? `${immVal}%` : "no data"}, benchmark target is ${immTarget}%.`}
              </Text>

              <View style={styles.indicatorKpiSummaryRow}>
                <View style={styles.summaryMiniBox}>
                  <Text style={styles.summaryMiniVal}>
                    {showIndicatorModal === "visit" ? (visitCompVal !== null && visitCompVal !== undefined ? `${visitCompVal}%` : "No data") : (immVal !== null && immVal !== undefined ? `${immVal}%` : "No data")}
                  </Text>
                  <Text style={styles.summaryMiniLabel}>Current Value</Text>
                </View>
                <View style={styles.summaryMiniBox}>
                  <Text style={[styles.summaryMiniVal, { color: PRIMARY }]}>
                    {showIndicatorModal === "visit" ? `${visitTarget}%` : `${immTarget}%`}
                  </Text>
                  <Text style={styles.summaryMiniLabel}>Benchmark Target</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => setShowIndicatorModal(null)}
              style={[styles.modalPrimaryBtn, { backgroundColor: PRIMARY }]}
            >
              <Text style={styles.modalPrimaryBtnText}>Back to Dashboard</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ----------------------------------------------------
// MATCHING MOH SUB-SCREENS (ALERTS, MISSED, REPORTS)
// ----------------------------------------------------
export function MOHAlerts() {
  const { navigate } = useApp();
  const [filterType, setFilterType] = useState<"all" | "high_risk" | "overdue" | "missed">("all");
  const [selectedClinicAreaId, setSelectedClinicAreaId] = useState<string>("all");
  const [clinicAreas, setClinicAreas] = useState<Array<{ _id: string; name: string }>>([]);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ highRisk: number; overdue: number; missed: number }>({
    highRisk: 0,
    overdue: 0,
    missed: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Check pending clinic area filter on mount (e.g. from Dashboard bar tap)
  useEffect(() => {
    const pendingArea = getAlertClinicAreaFilter();
    if (pendingArea) {
      setSelectedClinicAreaId(pendingArea);
    }
  }, []);

  // Fetch clinic areas for filter bar
  useEffect(() => {
    let mounted = true;
    getMohClinicAreas()
      .then((areas) => {
        if (mounted && Array.isArray(areas)) {
          setClinicAreas(areas);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const fetchAlerts = useCallback(
    async (pageNum = 1, isPullRefresh = false) => {
      try {
        if (isPullRefresh) {
          setRefreshing(true);
        } else if (pageNum === 1) {
          setLoading(true);
        }
        setError(null);

        const params: any = {
          page: pageNum,
          limit: 25,
          status: "open",
        };
        if (filterType !== "all") {
          params.type = filterType;
        }
        if (selectedClinicAreaId && selectedClinicAreaId !== "all") {
          params.clinicAreaId = selectedClinicAreaId;
        }

        const res = await getMohAlerts(params);
        const items = res.items || [];
        setCounts(res.counts || { highRisk: 0, overdue: 0, missed: 0 });
        setTotal(res.total || 0);

        if (pageNum === 1) {
          setAlerts(items);
        } else {
          setAlerts((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 25);
        setPage(pageNum);
      } catch (err: any) {
        setError(err?.message || "Failed to load alerts from server");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterType, selectedClinicAreaId]
  );

  useEffect(() => {
    fetchAlerts(1);
  }, [fetchAlerts]);

  const handleOpenDetail = async (item: any) => {
    setSelectedAlert(item);
    setDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const fullRes = await getMohAlertDetail(item.id);
      setSelectedAlert(fullRes.alert || fullRes);
    } catch {
      // Keep basic item info
    } finally {
      setDetailLoading(false);
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getSeverityStyle = (severity?: string, type?: string) => {
    if (severity === "danger" || type === "high_risk") {
      return {
        bg: DANGER_BG,
        iconColor: DANGER,
        text: DANGER_TEXT,
        icon: "alert-circle" as const,
        label: "High-Risk",
      };
    }
    if (severity === "warn" || type === "overdue") {
      return {
        bg: WARNING_BG,
        iconColor: WARNING,
        text: WARNING_TEXT,
        icon: "time" as const,
        label: "Overdue",
      };
    }
    return {
      bg: "#EFF6FF",
      iconColor: "#3B82F6",
      text: "#1D4ED8",
      icon: "information-circle" as const,
      label: "Missed",
    };
  };

  const activeAlertsCount = (counts.highRisk || 0) + (counts.overdue || 0) + (counts.missed || 0);

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <LinearGradient colors={["#7B4FE0", "#6B3FD4"]} style={styles.subHeaderGradient}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.subHeaderRow}>
            <Pressable onPress={() => navigate("moh-home")} style={styles.subBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.subHeaderTitle}>Alerts & Case Triage</Text>
              <Text style={styles.subHeaderSubtitle}>
                {activeAlertsCount > 0
                  ? `${activeAlertsCount} active cases requiring clinical attention`
                  : "Live maternal & child health surveillance"}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Type Filter Chips Row */}
      <View style={{ backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#EEF2F6" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {[
            { key: "all", label: `All (${total})` },
            { key: "high_risk", label: `High-Risk (${counts.highRisk})` },
            { key: "overdue", label: `Overdue (${counts.overdue})` },
            { key: "missed", label: `Missed (${counts.missed})` },
          ].map((chip) => {
            const isSelected = filterType === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilterType(chip.key as any)}
                style={[
                  styles.filterPill,
                  isSelected && { backgroundColor: PRIMARY },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && { color: "#FFFFFF", fontWeight: "800" },
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Clinic Area Horizontal Filter */}
        {clinicAreas.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}
          >
            <Pressable
              onPress={() => setSelectedClinicAreaId("all")}
              style={[
                styles.areaFilterChip,
                selectedClinicAreaId === "all" && styles.areaFilterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.areaFilterChipText,
                  selectedClinicAreaId === "all" && styles.areaFilterChipTextActive,
                ]}
              >
                All Areas
              </Text>
            </Pressable>
            {clinicAreas.map((ca) => {
              const isSelected = selectedClinicAreaId === ca._id;
              return (
                <Pressable
                  key={ca._id}
                  onPress={() => setSelectedClinicAreaId(ca._id)}
                  style={[
                    styles.areaFilterChip,
                    isSelected && styles.areaFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.areaFilterChipText,
                      isSelected && styles.areaFilterChipTextActive,
                    ]}
                  >
                    {ca.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={{ padding: 16 }}>
          <DashboardSkeleton />
        </View>
      ) : error && alerts.length === 0 ? (
        <View style={{ padding: 16, paddingTop: 30 }}>
          <ErrorState message={error} onRetry={() => fetchAlerts(1)} />
        </View>
      ) : alerts.length === 0 ? (
        <View style={{ padding: 16, paddingTop: 40 }}>
          <EmptyState
            icon="checkmark-circle-outline"
            title="No alerts. Everything is on track."
            description="There are currently no high-risk cases, overdue visits, or missed milestones matching your filters."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAlerts(1, true)}
              colors={[PRIMARY]}
              tintColor={PRIMARY}
            />
          }
        >
          {alerts.map((item) => {
            const sev = getSeverityStyle(item.severity, item.type);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleOpenDetail(item)}
                style={({ pressed }) => [
                  styles.alertCardItem,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                ]}
              >
                <View style={[styles.alertIconCircle, { backgroundColor: sev.bg }]}>
                  <Ionicons name={sev.icon} size={20} color={sev.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 }}>
                      <Text style={styles.alertPatientName} numberOfLines={1}>{item.patientName}</Text>
                      <View
                        style={[
                          styles.tagBadgeMini,
                          { backgroundColor: item.patientType === "child" ? "#E0E7FF" : PRIMARY_LIGHT },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagBadgeMiniText,
                            { color: item.patientType === "child" ? "#4338CA" : PRIMARY_DARK },
                          ]}
                        >
                          {item.patientType === "child" ? "Child" : "Mother"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.alertTimeText}>{formatRelativeTime(item.flaggedAt)}</Text>
                  </View>

                  <Text style={styles.alertReasonText}>{item.reason}</Text>

                  <View style={styles.alertMetaRow}>
                    <Ionicons name="location-outline" size={12} color={TEXT_MUTED} />
                    <Text style={styles.alertAreaText}>{item.clinicAreaName || "Clinic Area"}</Text>
                    {item.dueDate ? (
                      <>
                        <Text style={[styles.alertAreaText, { marginHorizontal: 3 }]}>•</Text>
                        <Text style={[styles.alertAreaText, { color: DANGER_TEXT, fontWeight: "600" }]}>
                          Due: {new Date(item.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </Text>
                      </>
                    ) : null}
                    {item.flaggedBy?.name ? (
                      <>
                        <Text style={[styles.alertAreaText, { marginHorizontal: 3 }]}>•</Text>
                        <Text style={styles.alertAreaText}>{item.flaggedBy.name}</Text>
                      </>
                    ) : null}
                    <View style={[styles.tagBadgeMini, { backgroundColor: sev.bg, marginLeft: "auto" }]}>
                      <Text style={[styles.tagBadgeMiniText, { color: sev.text }]}>
                        {sev.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {hasMore && (
            <Pressable
              onPress={() => fetchAlerts(page + 1)}
              style={{ padding: 14, alignItems: "center" }}
            >
              <Text style={{ color: PRIMARY, fontWeight: "700", fontSize: 13 }}>
                Load more alerts...
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Alert Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalCard}>
            <View style={styles.alertModalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.alertModalTitle}>
                  {selectedAlert?.patientName || "Case Details"}
                </Text>
                <Text style={styles.alertModalSubtitle}>
                  {selectedAlert?.patientType === "child" ? "Infant / Child Case" : "Maternal Case"} • {selectedAlert?.clinicAreaName || "Clinic Area"}
                </Text>
              </View>
              <Pressable
                onPress={() => setDetailModalVisible(false)}
                style={styles.alertModalCloseBtn}
              >
                <Ionicons name="close" size={20} color={TEXT_MAIN} />
              </Pressable>
            </View>

            {detailLoading ? (
              <View style={{ padding: 30, alignItems: "center" }}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={{ marginTop: 10, color: TEXT_MUTED, fontSize: 13 }}>
                  Loading clinical details...
                </Text>
              </View>
            ) : selectedAlert ? (
              <ScrollView style={styles.alertModalBody} showsVerticalScrollIndicator={false}>
                {/* Clinical Concern Banner */}
                <View style={styles.detailSectionCard}>
                  <Text style={styles.detailSectionLabel}>PRIMARY CLINICAL CONCERN</Text>
                  <Text style={styles.detailReasonBig}>{selectedAlert.reason}</Text>
                </View>

                {/* Vitals & Metrics Breakdown */}
                {selectedAlert.vitals && (
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionLabel}>REPORTED CLINICAL VITALS</Text>
                    {selectedAlert.vitals.bloodPressure ? (
                      <View style={styles.detailGridRow}>
                        <Text style={styles.detailGridLabel}>Blood Pressure</Text>
                        <Text style={[styles.detailGridValue, { color: DANGER_TEXT }]}>
                          {selectedAlert.vitals.bloodPressure}
                        </Text>
                      </View>
                    ) : null}
                    {selectedAlert.vitals.weight ? (
                      <View style={styles.detailGridRow}>
                        <Text style={styles.detailGridLabel}>Weight</Text>
                        <Text style={styles.detailGridValue}>{selectedAlert.vitals.weight} kg</Text>
                      </View>
                    ) : null}
                    {selectedAlert.vitals.gestationalWeeks ? (
                      <View style={styles.detailGridRow}>
                        <Text style={styles.detailGridLabel}>Gestational Age</Text>
                        <Text style={styles.detailGridValue}>{selectedAlert.vitals.gestationalWeeks} weeks</Text>
                      </View>
                    ) : null}
                    {selectedAlert.vitals.hemoglobin ? (
                      <View style={styles.detailGridRow}>
                        <Text style={styles.detailGridLabel}>Hemoglobin (Hb)</Text>
                        <Text style={styles.detailGridValue}>{selectedAlert.vitals.hemoglobin} g/dL</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Details Breakdown */}
                <View style={styles.detailSectionCard}>
                  <Text style={styles.detailSectionLabel}>CASE METADATA</Text>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Status</Text>
                    <Text style={[styles.detailGridValue, { textTransform: "capitalize", color: SUCCESS_TEXT }]}>
                      {selectedAlert.status || "Open"}
                    </Text>
                  </View>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Clinic Area</Text>
                    <Text style={styles.detailGridValue}>{selectedAlert.clinicAreaName || "N/A"}</Text>
                  </View>
                  {selectedAlert.dueDate ? (
                    <View style={styles.detailGridRow}>
                      <Text style={styles.detailGridLabel}>Due / Scheduled Date</Text>
                      <Text style={[styles.detailGridValue, { color: DANGER_TEXT }]}>
                        {new Date(selectedAlert.dueDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  ) : null}
                  {selectedAlert.flaggedBy ? (
                    <View style={styles.detailGridRow}>
                      <Text style={styles.detailGridLabel}>Flagged By</Text>
                      <Text style={styles.detailGridValue}>
                        {selectedAlert.flaggedBy.name} ({selectedAlert.flaggedBy.role})
                      </Text>
                    </View>
                  ) : null}
                  {selectedAlert.flaggedAt ? (
                    <View style={styles.detailGridRow}>
                      <Text style={styles.detailGridLabel}>Recorded At</Text>
                      <Text style={styles.detailGridValue}>
                        {new Date(selectedAlert.flaggedAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.alertModalActionsRow}>
                  <Pressable
                    onPress={() => {
                      if (selectedAlert.contactPhone) {
                        Linking.openURL(`tel:${selectedAlert.contactPhone}`).catch(() => {
                          Alert.alert("Call PHM", `Assigned phone: ${selectedAlert.contactPhone}`);
                        });
                      } else {
                        Alert.alert("Contact Staff", "Notification request sent to assigned PHM / Clinic staff.");
                      }
                    }}
                    style={styles.modalBtnPrimary}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={styles.modalBtnPrimaryText}>Call Staff</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.modalBtnSecondary}
                  >
                    <Text style={styles.modalBtnSecondaryText}>Close</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Shared Bottom Nav with Real Alerts Count */}
      <MOHSharedBottomNav activeTab="Alerts" alertsCount={activeAlertsCount} />
    </View>
  );
}

export function MOHMissed() {
  const { navigate } = useApp();

  return (
    <View style={styles.screenContainer}>
      <StaffManagement
        onBackToHome={() => navigate("moh-home")}
        renderBottomNav={() => <MOHSharedBottomNav activeTab="Staff" />}
      />
    </View>
  );
}

export function MOHReports() {
  const { navigate } = useApp();

  return (
    <View style={styles.screenContainer}>
      <MOHReportsScreen
        onBackToHome={() => navigate("moh-home")}
        renderBottomNav={() => <MOHSharedBottomNav activeTab="Reports" />}
      />
    </View>
  );
}

// ----------------------------------------------------
// SHARED BOTTOM NAV FOR SUB-SCREENS
// ----------------------------------------------------
function MOHSharedBottomNav({
  activeTab,
  alertsCount,
}: {
  activeTab: "Dashboard" | "Alerts" | "Staff" | "Missed" | "Reports";
  alertsCount?: number;
}) {
  const { navigate } = useApp();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.bottomNavSafeArea}>
      <View style={styles.bottomNavContainer}>
        <Pressable
          onPress={() => navigate("moh-home")}
          style={styles.navTab}
        >
          <View
            style={[
              styles.navIconBox,
              activeTab === "Dashboard" && styles.navIconBoxActive,
            ]}
          >
            <Ionicons
              name={activeTab === "Dashboard" ? "home" : "home-outline"}
              size={20}
              color={activeTab === "Dashboard" ? PRIMARY : TEXT_MUTED}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === "Dashboard" && styles.navLabelActive,
            ]}
          >
            Dashboard
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigate("moh-alerts")}
          style={styles.navTab}
        >
          <View
            style={[
              styles.navIconBox,
              activeTab === "Alerts" && styles.navIconBoxActive,
            ]}
          >
            <Ionicons
              name={activeTab === "Alerts" ? "notifications" : "notifications-outline"}
              size={21}
              color={activeTab === "Alerts" ? PRIMARY : TEXT_MUTED}
            />
            {alertsCount != null && alertsCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{alertsCount > 99 ? "99+" : alertsCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === "Alerts" && styles.navLabelActive,
            ]}
          >
            Alerts
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigate("moh-missed")}
          style={styles.navTab}
        >
          <View
            style={[
              styles.navIconBox,
              (activeTab === "Staff" || activeTab === "Missed") && styles.navIconBoxActive,
            ]}
          >
            <Ionicons
              name={activeTab === "Staff" || activeTab === "Missed" ? "people" : "people-outline"}
              size={21}
              color={activeTab === "Staff" || activeTab === "Missed" ? PRIMARY : TEXT_MUTED}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              (activeTab === "Staff" || activeTab === "Missed") && styles.navLabelActive,
            ]}
          >
            Staff
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigate("moh-reports")}
          style={styles.navTab}
        >
          <View
            style={[
              styles.navIconBox,
              activeTab === "Reports" && styles.navIconBoxActive,
            ]}
          >
            <Ionicons
              name={activeTab === "Reports" ? "document-text" : "document-text-outline"}
              size={21}
              color={activeTab === "Reports" ? PRIMARY : TEXT_MUTED}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === "Reports" && styles.navLabelActive,
            ]}
          >
            Reports
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// STYLESHEET
// ----------------------------------------------------
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // 1. Header Styles
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  headerSafeArea: {
    backgroundColor: "transparent",
  },
  headerContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 22,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: SUCCESS,
    borderWidth: 2,
    borderColor: PRIMARY,
    zIndex: 10,
  },
  headerNameCol: {
    flex: 1,
    justifyContent: "center",
  },
  greetingText: {
    color: "#D8B4FE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  doctorName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circularBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  circularBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  districtPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  districtPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  roleTagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  roleTagPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Body Container
  bodyWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // 2. Key Indicators Grid
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  kpiCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2.5,
  },
  kpiCardHalf: {
    width: "48.2%",
    minHeight: 140,
    justifyContent: "space-between",
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kpiLabel: {
    color: TEXT_MAIN,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  kpiTarget: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 10,
  },
  progressBarSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressValueText: {
    fontSize: 15,
    fontWeight: "800",
  },
  kpiSubBadgeRow: {
    marginTop: 8,
  },
  pillGreenMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 3,
  },
  pillGreenMiniText: {
    color: SUCCESS_TEXT,
    fontSize: 10,
    fontWeight: "700",
  },
  pillAmberMini: {
    backgroundColor: WARNING_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  pillAmberMiniText: {
    color: WARNING_TEXT,
    fontSize: 10,
    fontWeight: "700",
  },
  kpiTopBadgeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  trendBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  trendBadgeGreenText: {
    color: SUCCESS_TEXT,
    fontSize: 11,
    fontWeight: "700",
  },
  ringCenterContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  ringText: {
    fontSize: 16,
    fontWeight: "800",
  },
  largeBoldNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: TEXT_MAIN,
    textAlign: "center",
  },
  kpiCardBottomLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
  },

  // 3. Zone Visit Compliance Section
  sectionContainer: {
    marginTop: 18,
  },
  singleCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2.5,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionTitleOutside: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHint: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "600",
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 145,
    paddingTop: 10,
    paddingBottom: 4,
  },
  barColumn: {
    alignItems: "center",
    width: "18%",
  },
  barValueText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginBottom: 6,
  },
  barTrack: {
    width: 28,
    height: 110,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  barFillSelected: {
    borderWidth: 2,
    borderColor: "#1E293B",
  },
  barZoneName: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginTop: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  districtAverageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  districtAvgLabelCol: {
    flex: 1,
  },
  districtAvgLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  districtAvgSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  districtAvgValue: {
    fontSize: 20,
    fontWeight: "900",
    color: PRIMARY_DARK,
  },

  // 4. Recent Activity Section
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  activityRowPressed: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  activityTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  activityDetail: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  activityRightCol: {
    alignItems: "flex-end",
  },
  activityTime: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: "500",
  },
  rowSeparator: {
    position: "absolute",
    bottom: 0,
    left: 50,
    right: 0,
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // 5. Bottom Navigation Bar
  bottomNavSafeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 999,
  },
  bottomNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 12,
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
  },
  navIconBox: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 14,
    marginBottom: 2,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  navIconBoxActive: {
    backgroundColor: PRIMARY_LIGHT,
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  navLabelActive: {
    color: PRIMARY_DARK,
    fontWeight: "800",
  },
  navBadge: {
    position: "absolute",
    top: -2,
    right: 4,
    backgroundColor: DANGER,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  // Sub-screen Headers (Alerts, Missed, Reports)
  subHeaderGradient: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  subHeaderTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subHeaderSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },
  segmentedControlRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderRadius: 24,
    padding: 4,
    marginTop: 14,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 20,
  },
  segmentItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentItemText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
  },
  segmentItemTextActive: {
    color: PRIMARY,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  alertCardItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  alertPatientName: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  alertTimeText: {
    fontSize: 11,
    color: TEXT_LIGHT,
  },
  alertReasonText: {
    fontSize: 12.5,
    color: DANGER_TEXT,
    fontWeight: "600",
    marginTop: 2,
  },
  alertMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  alertAreaText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
  },
  tagBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 6,
  },
  tagBadgeMiniText: {
    fontSize: 10,
    fontWeight: "700",
  },
  missedChartRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 150,
    marginTop: 14,
  },
  missedBarCol: {
    alignItems: "center",
    width: "22%",
  },
  missedBarCount: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_MAIN,
    marginBottom: 6,
  },
  missedBarTrack: {
    width: 32,
    height: 110,
    justifyContent: "flex-end",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  missedBarFill: {
    width: "100%",
    borderRadius: 8,
  },
  missedBarLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginTop: 6,
  },
  missedZoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  missedZoneInfo: {
    flex: 1,
  },
  missedZoneName: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  missedZoneSub: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  missedCountPill: {
    backgroundColor: WARNING_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  missedCountPillText: {
    color: WARNING_TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  formFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginTop: 10,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  chipButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Modals Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: Dimensions.get("window").height * 0.85,
  },
  modalDragHandle: {
    width: 38,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  modalSubTitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 3,
  },
  zoneScorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  zoneScorePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  modalStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalStatNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT_MAIN,
  },
  modalStatLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 2,
  },
  modalPhmCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_TINT,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    marginBottom: 18,
  },
  phmAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  phmName: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  phmRole: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  phmCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  phmCallBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  modalActionsCol: {
    gap: 10,
  },
  modalPrimaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 6,
  },
  modalSecondaryBtnText: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: "600",
  },
  clinicalCaseCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  clinicalCaseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  patientMeta: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  clinicalNotesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  clinicalNotesBody: {
    fontSize: 13,
    color: TEXT_MAIN,
    lineHeight: 18,
  },
  langModalBox: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    alignSelf: "center",
    width: "88%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_MAIN,
    textAlign: "center",
  },
  langModalSub: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },
  langOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  langOptionRowActive: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  langOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  langOptionSub: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  langModalCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 12,
  },
  langModalCancelBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  indicatorDetailCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  indicatorDetailIntro: {
    fontSize: 13,
    color: TEXT_MAIN,
    lineHeight: 19,
    marginBottom: 14,
  },
  indicatorKpiSummaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryMiniBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryMiniVal: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  summaryMiniLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Alert Screen Filters & Details Modal
  areaFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  areaFilterChipActive: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  areaFilterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  areaFilterChipTextActive: {
    color: PRIMARY_DARK,
    fontWeight: "800",
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  alertModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  alertModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  alertModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  alertModalSubtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  alertModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  alertModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailSectionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  detailReasonBig: {
    fontSize: 15,
    fontWeight: "700",
    color: DANGER_TEXT,
    lineHeight: 21,
  },
  detailGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  detailGridLabel: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  detailGridValue: {
    fontSize: 12.5,
    color: TEXT_MAIN,
    fontWeight: "700",
  },
  alertModalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 10,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  modalBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
