import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
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

// Zone Compliance Data
interface ZoneData {
  id: string;
  name: string;
  compliance: number;
  color: string;
  phmName: string;
  phmPhone: string;
  totalMothers: number;
  highRiskCount: number;
  overdueCount: number;
}

const ZONES: ZoneData[] = [
  {
    id: "buttala",
    name: "Buttala",
    compliance: 81,
    color: "#7B4FE0", // Purple
    phmName: "Kamani Rathnayake",
    phmPhone: "+94 77 123 4567",
    totalMothers: 142,
    highRiskCount: 4,
    overdueCount: 2,
  },
  {
    id: "hella",
    name: "Hella",
    compliance: 68,
    color: "#EF4444", // Red
    phmName: "Sunethra Bandara",
    phmPhone: "+94 71 234 5678",
    totalMothers: 98,
    highRiskCount: 6,
    overdueCount: 5,
  },
  {
    id: "gonagala",
    name: "Gonagala",
    compliance: 77,
    color: "#F59E0B", // Orange
    phmName: "Priyanthi Silva",
    phmPhone: "+94 76 345 6789",
    totalMothers: 116,
    highRiskCount: 3,
    overdueCount: 3,
  },
  {
    id: "baevi",
    name: "Baevi",
    compliance: 85,
    color: "#10B981", // Green
    phmName: "Nirosha Jayatilleke",
    phmPhone: "+94 78 456 7890",
    totalMothers: 130,
    highRiskCount: 2,
    overdueCount: 1,
  },
  {
    id: "medawe",
    name: "Medawe",
    compliance: 72,
    color: "#6366F1", // Indigo / purple
    phmName: "Anoma Weerasinghe",
    phmPhone: "+94 70 567 8901",
    totalMothers: 104,
    highRiskCount: 3,
    overdueCount: 4,
  },
];

// Activity Feed Data
interface ActivityItem {
  id: string;
  type: "danger" | "warning" | "success" | "info";
  title: string;
  detail: string;
  time: string;
  zone?: string;
  badge?: string;
  caseData?: {
    patientName: string;
    age: string;
    weeks: string;
    phm: string;
    condition: string;
    priority: "Urgent" | "Moderate" | "Informational";
  };
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "danger",
    title: "2 new high-risk cases flagged",
    detail: "Dilani Kumari (BP 150/100 · 34 wks) & Nirosha (Reduced fetal movement)",
    time: "2h ago",
    zone: "Okkampitiya & Buttala",
    badge: "Urgent",
    caseData: {
      patientName: "Dilani Kumari",
      age: "28 yrs",
      weeks: "34 weeks",
      phm: "Kamani Rathnayake",
      condition: "Severe gestational hypertension (BP 150/100 mmHg). Immediate referral to Base Hospital Monaragala recommended.",
      priority: "Urgent",
    },
  },
  {
    id: "act-2",
    type: "warning",
    title: "Hella zone: 3 overdue mothers",
    detail: "Missed third-trimester routine clinical checks > 14 days",
    time: "5h ago",
    zone: "Hella",
    badge: "Attention",
    caseData: {
      patientName: "3 Overdue ANC Visits (Hella)",
      age: "Cohorted",
      weeks: "Trimester 3",
      phm: "Sunethra Bandara",
      condition: "Mothers overdue for mandatory ultrasound screening and oral glucose tolerance tests.",
      priority: "Moderate",
    },
  },
  {
    id: "act-3",
    type: "success",
    title: "Oct eRHMIS sync completed",
    detail: "142 field and clinical records synchronized with National eRHMIS gateway",
    time: "Yesterday",
    zone: "Monaragala District",
    badge: "Synced",
    caseData: {
      patientName: "October eRHMIS Gateway Sync",
      age: "N/A",
      weeks: "Monthly Return",
      phm: "District Field MID/MIS Unit",
      condition: "Full data integrity validated: 142 records synced, 0 validation errors, checksum verified.",
      priority: "Informational",
    },
  },
  {
    id: "act-4",
    type: "info",
    title: "Buttala clinic return submitted",
    detail: "28 mothers examined · 4 specialist referrals successfully booked",
    time: "2 days ago",
    zone: "Buttala",
    badge: "Completed",
    caseData: {
      patientName: "Buttala Clinic Monthly Return",
      age: "28 Attendees",
      weeks: "Routine Clinic",
      phm: "Kamani Rathnayake",
      condition: "All clinic returns recorded. 4 high-risk mothers routed to Consultant Obstetrician clinic.",
      priority: "Informational",
    },
  },
];

// Circular Ring Donut Component
function RingDonut({
  value,
  strokeColor,
  trackColor,
  size = 56,
  strokeWidth = 5.5,
  displayValue,
}: {
  value: number;
  strokeColor: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  displayValue?: string | number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(value, 100) / 100);

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
        {displayValue !== undefined ? displayValue : value}
      </Text>
    </View>
  );
}

// ----------------------------------------------------
// MAIN DASHBOARD COMPONENT (MOHHome)
// ----------------------------------------------------
export function MOHHome() {
  const { language, setLanguage, navigate, currentScreen } = useApp();
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState<string | null>(null);

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ==================================================== */}
        {/* 1. HEADER (Purple Gradient, Profile, Pills, Icons)    */}
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
                {/* Profile Picture with Online Status Dot */}
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarCircle}>
                    {/* Placeholder doctor illustration */}
                    <Ionicons name="person" size={26} color="#FFFFFF" />
                  </View>
                  {/* Small Green Online Status Dot at Top-Left */}
                  <View style={styles.onlineDot} />
                </View>

                {/* Greeting & Doctor's Name */}
                <View style={styles.headerNameCol}>
                  <Text style={styles.greetingText}>GOOD EVENING</Text>
                  <Text style={styles.doctorName}>Dr. Pradeep Silva</Text>
                </View>

                {/* Top-Right Circular Action Buttons */}
                <View style={styles.headerActionsRow}>
                  {/* Globe / Language Icon Button */}
                  <Pressable
                    onPress={() => setShowLangModal(true)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.circularBtn,
                      pressed && styles.circularBtnPressed,
                    ]}
                    accessibilityLabel="Language Switcher"
                  >
                    <Ionicons name="globe-outline" size={19} color="#FFFFFF" />
                  </Pressable>

                  {/* Settings / Gear Icon Button */}
                  <Pressable
                    onPress={() => navigate("settings")}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.circularBtn,
                      pressed && styles.circularBtnPressed,
                    ]}
                    accessibilityLabel="Settings"
                  >
                    <Ionicons name="settings-outline" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {/* Row 2: Badges below doctor's name */}
              <View style={styles.pillsRow}>
                {/* Semi-transparent White Pill: District */}
                <View style={styles.districtPill}>
                  <Ionicons
                    name="location-sharp"
                    size={12}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.districtPillText}>Monaragala District</Text>
                </View>

                {/* Role Tag Pill: MOH */}
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
              style={({ pressed }) => [
                styles.kpiCard,
                styles.kpiCardHalf,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Visit Compliance</Text>
              </View>
              <Text style={styles.kpiTarget}>Target: 85%</Text>

              {/* Horizontal Progress Bar & Right-Aligned Percentage */}
              <View style={styles.progressBarSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: "87%", backgroundColor: PRIMARY },
                    ]}
                  />
                </View>
                <Text style={[styles.progressValueText, { color: PRIMARY }]}>87%</Text>
              </View>

              <View style={styles.kpiSubBadgeRow}>
                <View style={styles.pillGreenMini}>
                  <Ionicons name="arrow-up" size={10} color={SUCCESS_TEXT} />
                  <Text style={styles.pillGreenMiniText}>+2% above target</Text>
                </View>
              </View>
            </Pressable>

            {/* Card 2: Immunization Coverage */}
            <Pressable
              onPress={() => setShowIndicatorModal("immunization")}
              style={({ pressed }) => [
                styles.kpiCard,
                styles.kpiCardHalf,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Immunization Coverage</Text>
              </View>
              <Text style={styles.kpiTarget}>Target: 95%</Text>

              {/* Horizontal Progress Bar & Right-Aligned Percentage */}
              <View style={styles.progressBarSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: "93%", backgroundColor: SUCCESS },
                    ]}
                  />
                </View>
                <Text style={[styles.progressValueText, { color: SUCCESS }]}>93%</Text>
              </View>

              <View style={styles.kpiSubBadgeRow}>
                <View style={styles.pillAmberMini}>
                  <Text style={styles.pillAmberMiniText}>Near target (95%)</Text>
                </View>
              </View>
            </Pressable>

            {/* Card 3: High-Risk Cases */}
            <Pressable
              onPress={() => navigate("moh-alerts")}
              style={({ pressed }) => [
                styles.kpiCard,
                styles.kpiCardHalf,
                pressed && styles.cardPressed,
              ]}
            >
              {/* Top-right Trend Badge */}
              <View style={styles.kpiTopBadgeRow}>
                <View style={styles.trendBadgeGreen}>
                  <Ionicons name="arrow-down" size={11} color={SUCCESS_TEXT} />
                  <Text style={styles.trendBadgeGreenText}>2</Text>
                </View>
              </View>

              {/* Circular Ring Indicator showing 18 in center */}
              <View style={styles.ringCenterContainer}>
                <RingDonut
                  value={72}
                  strokeColor={DANGER}
                  trackColor={DANGER_BG}
                  size={58}
                  displayValue="18"
                />
              </View>

              {/* Large Bold Number 18 below */}
              <Text style={styles.largeBoldNumber}>18</Text>
              <Text style={styles.kpiCardBottomLabel}>High-Risk Cases</Text>
            </Pressable>

            {/* Card 4: PHM Zones */}
            <Pressable
              onPress={() => setShowIndicatorModal("zones")}
              style={({ pressed }) => [
                styles.kpiCard,
                styles.kpiCardHalf,
                pressed && styles.cardPressed,
              ]}
            >
              {/* Top-right Trend Badge: "active" */}
              <View style={styles.kpiTopBadgeRow}>
                <View style={styles.trendBadgeGreen}>
                  <Text style={styles.trendBadgeGreenText}>active</Text>
                </View>
              </View>

              {/* Circular Ring Indicator showing 12 in center */}
              <View style={styles.ringCenterContainer}>
                <RingDonut
                  value={100}
                  strokeColor={WARNING}
                  trackColor={WARNING_BG}
                  size={58}
                  displayValue="12"
                />
              </View>

              {/* Large Bold 12 below */}
              <Text style={styles.largeBoldNumber}>12</Text>
              <Text style={styles.kpiCardBottomLabel}>PHM Zones</Text>
            </Pressable>
          </View>

          {/* ==================================================== */}
          {/* 3. ZONE VISIT COMPLIANCE SECTION                     */}
          {/* ==================================================== */}
          <View style={styles.sectionContainer}>
            <View style={styles.singleCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>ZONE VISIT COMPLIANCE (%)</Text>
                <Text style={styles.sectionHint}>Tap bar for details</Text>
              </View>

              {/* Vertical Bar Chart with 5 Zones */}
              <View style={styles.barChartContainer}>
                {ZONES.map((zone) => {
                  const maxBarHeight = 110;
                  const barHeight = (zone.compliance / 100) * maxBarHeight;
                  const isSelected = selectedZone?.id === zone.id;

                  return (
                    <Pressable
                      key={zone.id}
                      onPress={() => setSelectedZone(zone)}
                      style={({ pressed }) => [
                        styles.barColumn,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      {/* Percentage Value above Bar */}
                      <Text
                        style={[
                          styles.barValueText,
                          isSelected && { color: zone.color, fontWeight: "900" },
                        ]}
                      >
                        {zone.compliance}%
                      </Text>

                      {/* Bar Track & Fill */}
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: barHeight,
                              backgroundColor: zone.color,
                            },
                            isSelected && styles.barFillSelected,
                          ]}
                        />
                      </View>

                      {/* Zone Name below Bar */}
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.barZoneName,
                          isSelected && { color: TEXT_MAIN, fontWeight: "800" },
                        ]}
                      >
                        {zone.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Divider Line */}
              <View style={styles.cardDivider} />

              {/* District Average Row */}
              <View style={styles.districtAverageRow}>
                <View style={styles.districtAvgLabelCol}>
                  <Text style={styles.districtAvgLabel}>District average</Text>
                  <Text style={styles.districtAvgSub}>Weighted across 12 PHM divisions</Text>
                </View>
                <Text style={styles.districtAvgValue}>74%</Text>
              </View>
            </View>
          </View>

          {/* ==================================================== */}
          {/* 4. RECENT ACTIVITY SECTION                           */}
          {/* ==================================================== */}
          <View style={[styles.sectionContainer, { marginBottom: 110 }]}>
            <Text style={styles.sectionTitleOutside}>RECENT ACTIVITY</Text>

            <View style={styles.singleCard}>
              {ACTIVITIES.map((activity, index) => {
                const isLast = index === ACTIVITIES.length - 1;

                // Color-coded Circle Icon
                let iconBg = PRIMARY_LIGHT;
                let iconColor = PRIMARY;
                let iconName: keyof typeof Ionicons.glyphMap = "information";

                if (activity.type === "danger") {
                  iconBg = DANGER_BG;
                  iconColor = DANGER;
                  iconName = "alert-circle";
                } else if (activity.type === "warning") {
                  iconBg = WARNING_BG;
                  iconColor = WARNING;
                  iconName = "warning";
                } else if (activity.type === "success") {
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
                    key={activity.id}
                    onPress={() => setActiveActivity(activity)}
                    style={({ pressed }) => [
                      styles.activityRow,
                      pressed && styles.activityRowPressed,
                    ]}
                  >
                    {/* Color-Coded Circular Icon */}
                    <View style={[styles.activityIconCircle, { backgroundColor: iconBg }]}>
                      <Ionicons name={iconName} size={19} color={iconColor} />
                    </View>

                    {/* Middle: Description & Subtitle */}
                    <View style={styles.activityTextCol}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDetail} numberOfLines={1}>
                        {activity.detail}
                      </Text>
                    </View>

                    {/* Right: Timestamp */}
                    <View style={styles.activityRightCol}>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={TEXT_LIGHT}
                        style={{ marginTop: 2 }}
                      />
                    </View>

                    {!isLast && <View style={styles.rowSeparator} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* 5. BOTTOM NAVIGATION BAR (Fixed, White, Top Shadow)  */}
      {/* ==================================================== */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomNavSafeArea}>
        <View style={styles.bottomNavContainer}>
          {/* Tab 1: Dashboard (Active, Purple Highlighted) */}
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

          {/* Tab 2: Alerts (Bell Icon with Badge) */}
          <Pressable
            onPress={() => navigate("moh-alerts")}
            style={styles.navTab}
            accessibilityRole="tab"
          >
            <View style={styles.navIconBox}>
              <Ionicons name="notifications-outline" size={21} color={TEXT_MUTED} />
              {/* Small Red Notification Badge */}
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>18</Text>
              </View>
            </View>
            <Text style={styles.navLabel}>Alerts</Text>
          </Pressable>

          {/* Tab 3: Staff (People Icon) */}
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

          {/* Tab 4: Reports (Document Icon) */}
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

      {/* ==================================================== */}
      {/* INTERACTIVE MODAL 1: ZONE DETAIL VIEW                 */}
      {/* ==================================================== */}
      <Modal
        visible={!!selectedZone}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedZone(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedZone(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />

            {selectedZone && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <View style={styles.modalTitleBadgeRow}>
                      <Text style={styles.modalTitle}>{selectedZone.name} Zone</Text>
                      <View
                        style={[
                          styles.zoneScorePill,
                          { backgroundColor: `${selectedZone.color}20` },
                        ]}
                      >
                        <Text style={[styles.zoneScorePillText, { color: selectedZone.color }]}>
                          {selectedZone.compliance}% Compliance
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.modalSubTitle}>MOH Division: Monaragala</Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedZone(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={TEXT_MUTED} />
                  </Pressable>
                </View>

                {/* Zone Key Stats */}
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatNumber}>{selectedZone.totalMothers}</Text>
                    <Text style={styles.modalStatLabel}>Total Mothers</Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text style={[styles.modalStatNumber, { color: DANGER }]}>
                      {selectedZone.highRiskCount}
                    </Text>
                    <Text style={styles.modalStatLabel}>High-Risk</Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text style={[styles.modalStatNumber, { color: WARNING }]}>
                      {selectedZone.overdueCount}
                    </Text>
                    <Text style={styles.modalStatLabel}>Overdue</Text>
                  </View>
                </View>

                {/* Assigned Midwife Info */}
                <View style={styles.modalPhmCard}>
                  <View style={styles.phmAvatarCircle}>
                    <Ionicons name="person" size={20} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phmName}>{selectedZone.phmName}</Text>
                    <Text style={styles.phmRole}>Public Health Midwife (PHM)</Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert("Contact PHM", `Calling ${selectedZone.phmPhone}`)
                    }
                    style={styles.phmCallBtn}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={styles.phmCallBtnText}>Call</Text>
                  </Pressable>
                </View>

                {/* Quick Action Buttons */}
                <View style={styles.modalActionsCol}>
                  <Pressable
                    onPress={() => {
                      setSelectedZone(null);
                      navigate("moh-alerts");
                    }}
                    style={[styles.modalPrimaryBtn, { backgroundColor: PRIMARY }]}
                  >
                    <Ionicons name="filter" size={17} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryBtnText}>
                      Filter High-Risk Cases in {selectedZone.name}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedZone(null)}
                    style={styles.modalSecondaryBtn}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Close View</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* INTERACTIVE MODAL 2: CASE / ACTIVITY DETAIL VIEW     */}
      {/* ==================================================== */}
      <Modal
        visible={!!activeActivity}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveActivity(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveActivity(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />

            {activeActivity && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.modalTitleBadgeRow}>
                      <Text style={styles.modalTitle}>{activeActivity.title}</Text>
                    </View>
                    <Text style={styles.modalSubTitle}>
                      Timestamp: {activeActivity.time} · {activeActivity.zone}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setActiveActivity(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={TEXT_MUTED} />
                  </Pressable>
                </View>

                {/* Case Info Box */}
                {activeActivity.caseData && (
                  <View style={styles.clinicalCaseCard}>
                    <View style={styles.clinicalCaseHeader}>
                      <View>
                        <Text style={styles.patientName}>
                          {activeActivity.caseData.patientName}
                        </Text>
                        <Text style={styles.patientMeta}>
                          {activeActivity.caseData.age} · {activeActivity.caseData.weeks} · Assigned PHM: {activeActivity.caseData.phm}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.priorityPill,
                          activeActivity.caseData.priority === "Urgent"
                            ? { backgroundColor: DANGER_BG }
                            : activeActivity.caseData.priority === "Moderate"
                            ? { backgroundColor: WARNING_BG }
                            : { backgroundColor: SUCCESS_BG },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityPillText,
                            activeActivity.caseData.priority === "Urgent"
                              ? { color: DANGER_TEXT }
                              : activeActivity.caseData.priority === "Moderate"
                              ? { color: WARNING_TEXT }
                              : { color: SUCCESS_TEXT },
                          ]}
                        >
                          {activeActivity.caseData.priority}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.clinicalNotesTitle}>Clinical Note / Summary:</Text>
                    <Text style={styles.clinicalNotesBody}>
                      {activeActivity.caseData.condition}
                    </Text>
                  </View>
                )}

                {/* Doctor Triage Action Buttons */}
                <View style={styles.modalActionsCol}>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Clinical Action Dispatched",
                        "Urgent referral directive transmitted to District Base Hospital & assigned PHM."
                      );
                      setActiveActivity(null);
                    }}
                    style={[styles.modalPrimaryBtn, { backgroundColor: PRIMARY }]}
                  >
                    <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryBtnText}>Order Priority Referral</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Acknowledged",
                        "Activity review logged by Dr. Pradeep Silva (MOH)."
                      );
                      setActiveActivity(null);
                    }}
                    style={styles.modalSecondaryBtn}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Acknowledge & Archive</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* INTERACTIVE MODAL 3: LANGUAGE SWITCHER               */}
      {/* ==================================================== */}
      <Modal
        visible={showLangModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLangModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowLangModal(false)}
        >
          <Pressable style={styles.langModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.langModalTitle}>Select Language</Text>
            <Text style={styles.langModalSub}>භාෂාව තෝරන්න / மொழியைத் தேர்ந்தெடுக்கவும்</Text>

            {(
              [
                { code: "en", label: "English", sub: "Default MOH language" },
                { code: "si", label: "සිංහල", sub: "Sinhala" },
                { code: "ta", label: "தமிழ்", sub: "Tamil" },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.code}
                onPress={() => {
                  setLanguage(item.code as Language);
                  setShowLangModal(false);
                }}
                style={[
                  styles.langOptionRow,
                  language === item.code && styles.langOptionRowActive,
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.langOptionText,
                      language === item.code && { color: PRIMARY, fontWeight: "800" },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.langOptionSub}>{item.sub}</Text>
                </View>
                {language === item.code && (
                  <Ionicons name="checkmark-circle" size={22} color={PRIMARY} />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowLangModal(false)}
              style={styles.langModalCancelBtn}
            >
              <Text style={styles.langModalCancelBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* INTERACTIVE MODAL 4: INDICATOR BREAKDOWN             */}
      {/* ==================================================== */}
      <Modal
        visible={!!showIndicatorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIndicatorModal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowIndicatorModal(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {showIndicatorModal === "visit"
                    ? "Visit Compliance Breakdown"
                    : showIndicatorModal === "immunization"
                    ? "Immunization Coverage Breakdown"
                    : "12 PHM Zones Overview"}
                </Text>
                <Text style={styles.modalSubTitle}>
                  Monaragala Health Office District Registry
                </Text>
              </View>
              <Pressable
                onPress={() => setShowIndicatorModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </Pressable>
            </View>

            <View style={styles.indicatorDetailCard}>
              <Text style={styles.indicatorDetailIntro}>
                {showIndicatorModal === "visit"
                  ? "Overall maternal ante-natal and post-natal home visits stand at 87% compliance, beating the annual district target of 85%."
                  : showIndicatorModal === "immunization"
                  ? "Routine infant pentavalent and MMR immunization coverage is currently 93%, with catch-up rounds scheduled in Hella and Okkampitiya."
                  : "All 12 field PHM divisions are fully reporting data with zero offline sync backlog."}
              </Text>

              <View style={styles.indicatorKpiSummaryRow}>
                <View style={styles.summaryMiniBox}>
                  <Text style={styles.summaryMiniVal}>
                    {showIndicatorModal === "visit" ? "87%" : showIndicatorModal === "immunization" ? "93%" : "12"}
                  </Text>
                  <Text style={styles.summaryMiniLabel}>Current Value</Text>
                </View>
                <View style={styles.summaryMiniBox}>
                  <Text style={[styles.summaryMiniVal, { color: PRIMARY }]}>
                    {showIndicatorModal === "visit" ? "85%" : showIndicatorModal === "immunization" ? "95%" : "12"}
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
  const [activeSegment, setActiveSegment] = useState<"alerts" | "missed">("alerts");
  const [filter, setFilter] = useState<"all" | "urgent" | "watch">("all");

  const missedData = [
    { label: "ANC Visit", count: 12, max: 15, color: PRIMARY },
    { label: "Postnatal", count: 7, max: 15, color: "#EC4899" },
    { label: "Immunization", count: 9, max: 15, color: WARNING },
    { label: "Growth Mon.", count: 5, max: 15, color: SUCCESS },
  ];

  const ALERTS_DATA = [
    { id: "1", name: "Dilani Kumari", why: "BP 150/100 · 34 wks", area: "Okkampitiya", lvl: "danger", time: "2h ago" },
    { id: "2", name: "Nirosha Madushani", why: "Reduced fetal movement", area: "Buttala", lvl: "danger", time: "3h ago" },
    { id: "3", name: "Fathima Rizna", why: "Hb 8.9 g/dL · Severe anemia", area: "Wellawaya", lvl: "warn", time: "6h ago" },
    { id: "4", name: "Baby of Kumudu", why: "Weight below −2SD (Growth faltering)", area: "Madulla", lvl: "warn", time: "Yesterday" },
    { id: "5", name: "K. Sandya", why: "Gestational diabetes glucose spike", area: "Gonagala", lvl: "danger", time: "Yesterday" },
    { id: "6", name: "Malani Jayawardena", why: "Overdue post-term check (40w 3d)", area: "Baevi", lvl: "warn", time: "2 days ago" },
  ];

  const filtered = ALERTS_DATA.filter((a) => {
    if (filter === "urgent") return a.lvl === "danger";
    if (filter === "watch") return a.lvl === "warn";
    return true;
  });

  return (
    <View style={styles.screenContainer}>
      <LinearGradient colors={["#7B4FE0", "#6B3FD4"]} style={styles.subHeaderGradient}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.subHeaderRow}>
            <Pressable onPress={() => navigate("moh-home")} style={styles.subBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.subHeaderTitle}>
                {activeSegment === "alerts" ? "High-Risk Cases (18)" : "Missed Visits Analysis"}
              </Text>
              <Text style={styles.subHeaderSubtitle}>
                {activeSegment === "alerts"
                  ? "Prioritized maternal triage queue"
                  : "Overdue follow-up checks this month"}
              </Text>
            </View>
          </View>

          {/* Segmented Control: Alerts | Missed Visits */}
          <View style={styles.segmentedControlRow}>
            <Pressable
              onPress={() => setActiveSegment("alerts")}
              style={[
                styles.segmentItem,
                activeSegment === "alerts" && styles.segmentItemActive,
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={activeSegment === "alerts" ? PRIMARY : "rgba(255, 255, 255, 0.85)"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  activeSegment === "alerts" && styles.segmentItemTextActive,
                ]}
              >
                Alerts
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveSegment("missed")}
              style={[
                styles.segmentItem,
                activeSegment === "missed" && styles.segmentItemActive,
              ]}
            >
              <Ionicons
                name="bar-chart-outline"
                size={16}
                color={activeSegment === "missed" ? PRIMARY : "rgba(255, 255, 255, 0.85)"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  activeSegment === "missed" && styles.segmentItemTextActive,
                ]}
              >
                Missed Visits
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {activeSegment === "alerts" ? (
        <>
          <View style={styles.filterPillsRow}>
            {(["all", "urgent", "watch"] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  filter === f && { backgroundColor: PRIMARY },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filter === f && { color: "#FFFFFF", fontWeight: "800" },
                  ]}
                >
                  {f === "all" ? "All Cases (18)" : f === "urgent" ? "Urgent (8)" : "Watch List (10)"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
            {filtered.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  Alert.alert(
                    item.name,
                    `${item.why}\nArea: ${item.area}\nFlagged: ${item.time}`,
                    [
                      { text: "Call PHM", onPress: () => {} },
                      { text: "Refer Hospital", onPress: () => {} },
                      { text: "Close", style: "cancel" },
                    ]
                  )
                }
                style={styles.alertCardItem}
              >
                <View
                  style={[
                    styles.alertIconCircle,
                    { backgroundColor: item.lvl === "danger" ? DANGER_BG : WARNING_BG },
                  ]}
                >
                  <Ionicons
                    name={item.lvl === "danger" ? "alert-circle" : "warning"}
                    size={20}
                    color={item.lvl === "danger" ? DANGER : WARNING}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.alertPatientName}>{item.name}</Text>
                    <Text style={styles.alertTimeText}>{item.time}</Text>
                  </View>
                  <Text style={styles.alertReasonText}>{item.why}</Text>
                  <View style={styles.alertMetaRow}>
                    <Ionicons name="location-outline" size={12} color={TEXT_MUTED} />
                    <Text style={styles.alertAreaText}>{item.area} Zone</Text>
                    <View
                      style={[
                        styles.tagBadgeMini,
                        { backgroundColor: item.lvl === "danger" ? DANGER_BG : WARNING_BG },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagBadgeMiniText,
                          { color: item.lvl === "danger" ? DANGER_TEXT : WARNING_TEXT },
                        ]}
                      >
                        {item.lvl === "danger" ? "Urgent" : "Watch"}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {/* Column Bar Overview */}
          <View style={styles.singleCard}>
            <Text style={styles.sectionTitle}>MISSED VISITS BY CATEGORY</Text>
            <View style={styles.missedChartRow}>
              {missedData.map((d) => (
                <View key={d.label} style={styles.missedBarCol}>
                  <Text style={styles.missedBarCount}>{d.count}</Text>
                  <View style={styles.missedBarTrack}>
                    <View
                      style={[
                        styles.missedBarFill,
                        { height: (d.count / d.max) * 110, backgroundColor: d.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.missedBarLabel} numberOfLines={1}>
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Breakdown by PHM Zone */}
          <View style={[styles.singleCard, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>MISSED VISITS BY PHM ZONE</Text>
            {ZONES.map((zone) => (
              <View key={zone.id} style={styles.missedZoneRow}>
                <View style={styles.missedZoneInfo}>
                  <Text style={styles.missedZoneName}>{zone.name} Zone</Text>
                  <Text style={styles.missedZoneSub}>Assigned PHM: {zone.phmName}</Text>
                </View>
                <View style={styles.missedCountPill}>
                  <Text style={styles.missedCountPillText}>{zone.overdueCount} missed</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Shared Bottom Nav */}
      <MOHSharedBottomNav activeTab="Alerts" />
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
function MOHSharedBottomNav({ activeTab }: { activeTab: "Dashboard" | "Alerts" | "Staff" | "Missed" | "Reports" }) {
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
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>18</Text>
            </View>
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
});
