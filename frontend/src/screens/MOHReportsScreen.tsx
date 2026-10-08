import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS (Matching MOH Dashboard Design System)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type ReportType = "Weekly" | "Monthly" | "Area-wise";
export type DownloadFormat = "pdf" | "excel" | "png";

export interface PastReport {
  id: string;
  name: string;
  period: string;
  type: ReportType;
  format: DownloadFormat;
  date: string;
  size: string;
  compliance: number;
  immunization: number;
  highRisk: number;
  missed: number;
  zone?: string;
}

export const ZONES = [
  { id: "all", name: "All Zones", compliance: 78, highRisk: 18, missed: 33 },
  { id: "buttala", name: "Buttala", compliance: 81, highRisk: 4, missed: 5 },
  { id: "hella", name: "Hella", compliance: 68, highRisk: 6, missed: 12 },
  { id: "gonagala", name: "Gonagala", compliance: 77, highRisk: 3, missed: 7 },
  { id: "baevi", name: "Baevi", compliance: 85, highRisk: 2, missed: 4 },
  { id: "medawe", name: "Medawe", compliance: 79, highRisk: 3, missed: 5 },
];

const INITIAL_HISTORY: PastReport[] = [
  {
    id: "rep-1",
    name: "September 2026 MCH Return",
    period: "September 2026",
    type: "Monthly",
    format: "pdf",
    date: "Oct 01, 2026",
    size: "1.4 MB",
    compliance: 79,
    immunization: 93,
    highRisk: 16,
    missed: 29,
  },
  {
    id: "rep-2",
    name: "Hella Division Health Audit",
    period: "Q3 2026",
    type: "Area-wise",
    format: "excel",
    date: "Sep 28, 2026",
    size: "820 KB",
    compliance: 68,
    immunization: 88,
    highRisk: 6,
    missed: 12,
    zone: "Hella",
  },
  {
    id: "rep-3",
    name: "Week 39 Maternal Surveillance",
    period: "Sep 22 – Sep 28, 2026",
    type: "Weekly",
    format: "pdf",
    date: "Sep 29, 2026",
    size: "1.1 MB",
    compliance: 82,
    immunization: 95,
    highRisk: 4,
    missed: 6,
  },
  {
    id: "rep-4",
    name: "Buttala Division Compliance Snapshot",
    period: "August 2026",
    type: "Area-wise",
    format: "png",
    date: "Sep 15, 2026",
    size: "640 KB",
    compliance: 81,
    immunization: 92,
    highRisk: 4,
    missed: 5,
    zone: "Buttala",
  },
  {
    id: "rep-5",
    name: "August 2026 Monthly Summary",
    period: "August 2026",
    type: "Monthly",
    format: "excel",
    date: "Sep 02, 2026",
    size: "950 KB",
    compliance: 76,
    immunization: 91,
    highRisk: 19,
    missed: 35,
  },
];

const AVAILABLE_WEEKS = [
  "Oct 6 – Oct 12, 2026",
  "Sep 29 – Oct 5, 2026",
  "Sep 22 – Sep 28, 2026",
  "Sep 15 – Sep 21, 2026",
  "Sep 8 – Sep 14, 2026",
];

const AVAILABLE_MONTHS = [
  "October 2026",
  "September 2026",
  "August 2026",
  "July 2026",
  "June 2026",
];

const REPORT_CONTENT_OPTIONS = [
  { id: "compliance", label: "Visit Compliance" },
  { id: "immunization", label: "Immunization Coverage" },
  { id: "highRisk", label: "High-Risk Cases" },
  { id: "missed", label: "Missed Visits" },
];

interface MOHReportsScreenProps {
  onBackToHome: () => void;
  renderBottomNav?: () => React.ReactNode;
}

export function MOHReportsScreen({
  onBackToHome,
  renderBottomNav,
}: MOHReportsScreenProps) {
  // Navigation inside Reports: "home" (Screen 1) | "preview" (Screen 2) | "history" (Screen 4)
  const [currentScreen, setCurrentScreen] = useState<"home" | "preview" | "history">("home");

  // Screen 1 form state
  const [reportType, setReportType] = useState<ReportType>("Monthly");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(1); // "Sep 29 – Oct 5, 2026"
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0); // "October 2026"
  const [selectedZone, setSelectedZone] = useState("All Zones");
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [selectedContents, setSelectedContents] = useState<string[]>([
    "compliance",
    "immunization",
    "highRisk",
    "missed",
  ]);

  // Loading skeleton state for Screen 2
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Screen 2 active report model
  const [activeReportData, setActiveReportData] = useState<{
    title: string;
    periodOrZone: string;
    timestamp: string;
    type: ReportType;
    compliance: number;
    immunization: number;
    highRisk: number;
    missed: number;
    zoneName: string;
  } | null>(null);

  // Screen 3 Download Modal state
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [downloadSuccessFormat, setDownloadSuccessFormat] = useState<DownloadFormat | null>(null);

  // Screen 4 History state
  const [historyReports, setHistoryReports] = useState<PastReport[]>(INITIAL_HISTORY);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("All");

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle report content checkbox
  const toggleContentItem = (id: string) => {
    setSelectedContents((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Generate Report Handler (Screen 1 -> Screen 2)
  const handleGenerateReport = () => {
    let title = "";
    let periodOrZone = "";
    let zoneName = "District Wide";

    if (reportType === "Weekly") {
      periodOrZone = AVAILABLE_WEEKS[selectedWeekIndex];
      title = `${periodOrZone} Report`;
    } else if (reportType === "Monthly") {
      periodOrZone = AVAILABLE_MONTHS[selectedMonthIndex];
      title = `${periodOrZone} Report`;
    } else {
      periodOrZone = selectedZone;
      zoneName = selectedZone;
      title = `${selectedZone} Report`;
    }

    setActiveReportData({
      title,
      periodOrZone,
      timestamp: "Generated today at 2:45 PM • Official Return",
      type: reportType,
      compliance: selectedZone === "Hella" ? 68 : selectedZone === "Baevi" ? 85 : 79,
      immunization: 93,
      highRisk: selectedZone === "Hella" ? 6 : 18,
      missed: selectedZone === "Hella" ? 12 : 33,
      zoneName,
    });

    setIsPreviewLoading(true);
    setCurrentScreen("preview");
    setTimeout(() => {
      setIsPreviewLoading(false);
    }, 550);
  };

  // Open Preview from History (Screen 4 -> Screen 2)
  const handleOpenHistoryReport = (rep: PastReport) => {
    setActiveReportData({
      title: rep.name,
      periodOrZone: rep.period,
      timestamp: `Generated on ${rep.date} • ${rep.size}`,
      type: rep.type,
      compliance: rep.compliance,
      immunization: rep.immunization,
      highRisk: rep.highRisk,
      missed: rep.missed,
      zoneName: rep.zone || "District Wide",
    });
    setIsPreviewLoading(false);
    setCurrentScreen("preview");
  };

  // Download row selection handler (Screen 3)
  const handleSelectDownloadFormat = (fmt: DownloadFormat) => {
    setDownloadingFormat(fmt);
    setTimeout(() => {
      setDownloadingFormat(null);
      setDownloadSuccessFormat(fmt);

      // Add to past downloads history
      if (activeReportData) {
        const newHist: PastReport = {
          id: `rep-${Date.now()}`,
          name: activeReportData.title,
          period: activeReportData.periodOrZone,
          type: activeReportData.type,
          format: fmt,
          date: "Oct 06, 2026",
          size: fmt === "pdf" ? "1.3 MB" : fmt === "excel" ? "780 KB" : "590 KB",
          compliance: activeReportData.compliance,
          immunization: activeReportData.immunization,
          highRisk: activeReportData.highRisk,
          missed: activeReportData.missed,
          zone: activeReportData.zoneName,
        };
        setHistoryReports((prev) => [newHist, ...prev]);
      }

      // Auto dismiss modal after short delay
      setTimeout(() => {
        setDownloadSuccessFormat(null);
        setDownloadModalVisible(false);
        showToast("Report saved to downloads");
      }, 1100);
    }, 900);
  };

  return (
    <View style={styles.container}>
      {/* Toast Banner */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* SCREEN 1: Reports Home */}
      {currentScreen === "home" && (
        <Screen1ReportsHome
          onBackToHome={onBackToHome}
          onOpenHistory={() => setCurrentScreen("history")}
          reportType={reportType}
          onSelectReportType={setReportType}
          currentWeek={AVAILABLE_WEEKS[selectedWeekIndex]}
          onPrevWeek={() =>
            setSelectedWeekIndex((prev) => Math.min(prev + 1, AVAILABLE_WEEKS.length - 1))
          }
          onNextWeek={() => setSelectedWeekIndex((prev) => Math.max(prev - 1, 0))}
          hasPrevWeek={selectedWeekIndex < AVAILABLE_WEEKS.length - 1}
          hasNextWeek={selectedWeekIndex > 0}
          currentMonth={AVAILABLE_MONTHS[selectedMonthIndex]}
          onPrevMonth={() =>
            setSelectedMonthIndex((prev) => Math.min(prev + 1, AVAILABLE_MONTHS.length - 1))
          }
          onNextMonth={() => setSelectedMonthIndex((prev) => Math.max(prev - 1, 0))}
          hasPrevMonth={selectedMonthIndex < AVAILABLE_MONTHS.length - 1}
          hasNextMonth={selectedMonthIndex > 0}
          selectedZone={selectedZone}
          onOpenZonePicker={() => setZonePickerVisible(true)}
          selectedContents={selectedContents}
          onToggleContent={toggleContentItem}
          onGenerate={handleGenerateReport}
          renderBottomNav={renderBottomNav}
        />
      )}

      {/* SCREEN 2: Report Preview */}
      {currentScreen === "preview" && activeReportData && (
        <Screen2ReportPreview
          report={activeReportData}
          selectedContents={selectedContents}
          isLoading={isPreviewLoading}
          onBack={() => setCurrentScreen("home")}
          onShare={() => showToast("Share link copied to clipboard")}
          onDownload={() => {
            setDownloadingFormat(null);
            setDownloadSuccessFormat(null);
            setDownloadModalVisible(true);
          }}
        />
      )}

      {/* SCREEN 4: Report History */}
      {currentScreen === "history" && (
        <Screen4ReportHistory
          onBack={() => setCurrentScreen("home")}
          reports={historyReports}
          searchQuery={historySearchQuery}
          onSearchChange={setHistorySearchQuery}
          filter={historyFilter}
          onFilterChange={setHistoryFilter}
          onSelectReport={handleOpenHistoryReport}
          onQuickDownload={(rep) => showToast(`Downloading ${rep.name}...`)}
        />
      )}

      {/* SCREEN 3: Download Format Selection Modal */}
      <Screen3DownloadModal
        visible={downloadModalVisible}
        onClose={() => {
          if (!downloadingFormat && !downloadSuccessFormat) {
            setDownloadModalVisible(false);
          }
        }}
        downloadingFormat={downloadingFormat}
        successFormat={downloadSuccessFormat}
        onSelectFormat={handleSelectDownloadFormat}
      />

      {/* Zone Picker Modal (for Area-wise) */}
      <ZoneSelectModal
        visible={zonePickerVisible}
        currentZone={selectedZone}
        onSelectZone={(zone) => {
          setSelectedZone(zone);
          setZonePickerVisible(false);
        }}
        onClose={() => setZonePickerVisible(false)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 1: Reports Home (Filter + Generate)
// ─────────────────────────────────────────────────────────────
interface Screen1Props {
  onBackToHome: () => void;
  onOpenHistory: () => void;
  reportType: ReportType;
  onSelectReportType: (t: ReportType) => void;
  currentWeek: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  hasPrevWeek: boolean;
  hasNextWeek: boolean;
  currentMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  hasPrevMonth: boolean;
  hasNextMonth: boolean;
  selectedZone: string;
  onOpenZonePicker: () => void;
  selectedContents: string[];
  onToggleContent: (id: string) => void;
  onGenerate: () => void;
  renderBottomNav?: () => React.ReactNode;
}

function Screen1ReportsHome({
  onBackToHome,
  onOpenHistory,
  reportType,
  onSelectReportType,
  currentWeek,
  onPrevWeek,
  onNextWeek,
  hasPrevWeek,
  hasNextWeek,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  hasPrevMonth,
  hasNextMonth,
  selectedZone,
  onOpenZonePicker,
  selectedContents,
  onToggleContent,
  onGenerate,
  renderBottomNav,
}: Screen1Props) {
  const reportTypesList: ReportType[] = ["Weekly", "Monthly", "Area-wise"];

  return (
    <View style={styles.screenWrapper}>
      {/* Top App Bar with Gradient */}
      <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} style={styles.headerGradient}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={onBackToHome} style={styles.headerCircleBtn}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>

            <View style={styles.headerTitleCenter}>
              <Ionicons
                name="document-text"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.headerTitleText}>Reports</Text>
            </View>

            {/* History Action Link */}
            <Pressable onPress={onOpenHistory} style={styles.historyLinkBtn}>
              <Ionicons name="time-outline" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.historyLinkText}>History</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.homeScrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. REPORT TYPE SECTION */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardSectionLabel}>REPORT TYPE</Text>
          <View style={styles.segmentedChipsRow}>
            {reportTypesList.map((type) => {
              const isSelected = reportType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => onSelectReportType(type)}
                  style={[
                    styles.segmentedChip,
                    isSelected ? styles.segmentedChipSelected : styles.segmentedChipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentedChipText,
                      isSelected ? styles.segmentedChipTextSelected : styles.segmentedChipTextUnselected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. FILTERS SECTION (Changes dynamically based on Report Type) */}
        <View style={[styles.cardContainer, { marginTop: 14 }]}>
          <Text style={styles.cardSectionLabel}>
            {reportType === "Weekly"
              ? "SELECT WEEK"
              : reportType === "Monthly"
              ? "SELECT MONTH"
              : "SELECT AREA / ZONE"}
          </Text>

          {/* Weekly Picker */}
          {reportType === "Weekly" && (
            <View style={styles.stepperPickerRow}>
              <Pressable
                onPress={onPrevWeek}
                disabled={!hasPrevWeek}
                style={[styles.stepperBtn, !hasPrevWeek && styles.stepperBtnDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={hasPrevWeek ? PRIMARY : TEXT_LIGHT}
                />
              </Pressable>
              <View style={styles.stepperCenterBox}>
                <Ionicons name="calendar-outline" size={16} color={PRIMARY} style={{ marginRight: 6 }} />
                <Text style={styles.stepperValueText}>{currentWeek}</Text>
              </View>
              <Pressable
                onPress={onNextWeek}
                disabled={!hasNextWeek}
                style={[styles.stepperBtn, !hasNextWeek && styles.stepperBtnDisabled]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={hasNextWeek ? PRIMARY : TEXT_LIGHT}
                />
              </Pressable>
            </View>
          )}

          {/* Monthly Picker */}
          {reportType === "Monthly" && (
            <View style={styles.stepperPickerRow}>
              <Pressable
                onPress={onPrevMonth}
                disabled={!hasPrevMonth}
                style={[styles.stepperBtn, !hasPrevMonth && styles.stepperBtnDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={hasPrevMonth ? PRIMARY : TEXT_LIGHT}
                />
              </Pressable>
              <View style={styles.stepperCenterBox}>
                <Ionicons name="calendar" size={16} color={PRIMARY} style={{ marginRight: 6 }} />
                <Text style={styles.stepperValueText}>{currentMonth}</Text>
              </View>
              <Pressable
                onPress={onNextMonth}
                disabled={!hasNextMonth}
                style={[styles.stepperBtn, !hasNextMonth && styles.stepperBtnDisabled]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={hasNextMonth ? PRIMARY : TEXT_LIGHT}
                />
              </Pressable>
            </View>
          )}

          {/* Area-wise Dropdown */}
          {reportType === "Area-wise" && (
            <Pressable onPress={onOpenZonePicker} style={styles.dropdownSelector}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.dropdownIconCircle}>
                  <Ionicons name="location" size={17} color={PRIMARY} />
                </View>
                <View>
                  <Text style={styles.dropdownSubLabel}>Assigned Health Zone</Text>
                  <Text style={styles.dropdownMainLabel}>{selectedZone}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
            </Pressable>
          )}

          {/* Divider */}
          <View style={styles.innerDivider} />

          {/* Secondary Filter: Report Content (Checkboxes / Multi-select) */}
          <View style={styles.contentHeaderRow}>
            <Text style={styles.cardSectionLabel}>REPORT CONTENT</Text>
            <Text style={styles.contentHelperText}>Include in summary</Text>
          </View>

          <View style={styles.contentOptionsGrid}>
            {REPORT_CONTENT_OPTIONS.map((item) => {
              const isChecked = selectedContents.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onToggleContent(item.id)}
                  style={[
                    styles.checkboxRow,
                    isChecked && styles.checkboxRowChecked,
                  ]}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      isChecked && styles.checkboxBoxChecked,
                    ]}
                  >
                    {isChecked && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.checkboxLabel,
                      isChecked && styles.checkboxLabelChecked,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. PRIMARY BUTTON: Generate Report */}
        <Pressable
          onPress={onGenerate}
          style={({ pressed }) => [
            styles.generatePrimaryBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Ionicons name="analytics-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.generatePrimaryBtnText}>Generate Report</Text>
        </Pressable>
      </ScrollView>

      {/* Shared Bottom Nav */}
      {renderBottomNav?.()}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 2: Report Preview
// ─────────────────────────────────────────────────────────────
interface Screen2Props {
  report: {
    title: string;
    periodOrZone: string;
    timestamp: string;
    type: ReportType;
    compliance: number;
    immunization: number;
    highRisk: number;
    missed: number;
    zoneName: string;
  };
  selectedContents: string[];
  isLoading: boolean;
  onBack: () => void;
  onShare: () => void;
  onDownload: () => void;
}

function Screen2ReportPreview({
  report,
  selectedContents,
  isLoading,
  onBack,
  onShare,
  onDownload,
}: Screen2Props) {
  return (
    <View style={styles.screenWrapper}>
      {/* Top App Bar */}
      <View style={styles.previewTopBar}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.previewTopBarContent}>
            <Pressable onPress={onBack} style={styles.previewBackBtn}>
              <Ionicons name="arrow-back" size={20} color={TEXT_MAIN} />
            </Pressable>
            <Text style={styles.previewTitleText} numberOfLines={1}>
              {report.title}
            </Text>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
      </View>

      {isLoading ? (
        /* Loading Skeleton */
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingTitle}>Compiling Official Health Return...</Text>
          <Text style={styles.loadingSubtitle}>
            Aggregating visit registries and maternal stats
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.previewScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryBadgeRow}>
              <View style={styles.summaryPill}>
                <Ionicons name="time" size={13} color={PRIMARY} style={{ marginRight: 4 }} />
                <Text style={styles.summaryPillText}>{report.periodOrZone}</Text>
              </View>
              <View style={styles.summaryTypeBadge}>
                <Text style={styles.summaryTypeBadgeText}>{report.type} Return</Text>
              </View>
            </View>

            <Text style={styles.summaryReportHeading}>{report.title}</Text>
            <Text style={styles.summaryTimestamp}>{report.timestamp}</Text>
          </View>

          {/* Key Indicator Mini-Cards (2-column grid, matching dashboard) */}
          <View style={styles.indicatorsSection}>
            <Text style={styles.sectionHeaderTitle}>KEY PERFORMANCE INDICATORS</Text>

            <View style={styles.indicatorGrid}>
              {/* Visit Compliance */}
              {selectedContents.includes("compliance") && (
                <View style={styles.indicatorCard}>
                  <View style={styles.indicatorCardTop}>
                    <Text style={styles.indicatorLabel}>VISIT COMPLIANCE</Text>
                    <View style={[styles.indicatorIconBox, { backgroundColor: SUCCESS_BG }]}>
                      <Ionicons name="checkmark-done" size={15} color={SUCCESS_TEXT} />
                    </View>
                  </View>
                  <Text style={styles.indicatorValue}>{report.compliance}%</Text>
                  <Text style={styles.indicatorSubtext}>District target: 80%</Text>
                </View>
              )}

              {/* Immunization Coverage */}
              {selectedContents.includes("immunization") && (
                <View style={styles.indicatorCard}>
                  <View style={styles.indicatorCardTop}>
                    <Text style={styles.indicatorLabel}>IMMUNIZATION</Text>
                    <View style={[styles.indicatorIconBox, { backgroundColor: PRIMARY_LIGHT }]}>
                      <Ionicons name="shield-checkmark" size={15} color={PRIMARY} />
                    </View>
                  </View>
                  <Text style={styles.indicatorValue}>{report.immunization}%</Text>
                  <Text style={styles.indicatorSubtext}>142 / 152 verified infants</Text>
                </View>
              )}

              {/* High-Risk Cases */}
              {selectedContents.includes("highRisk") && (
                <View style={styles.indicatorCard}>
                  <View style={styles.indicatorCardTop}>
                    <Text style={styles.indicatorLabel}>HIGH-RISK CASES</Text>
                    <View style={[styles.indicatorIconBox, { backgroundColor: WARNING_BG }]}>
                      <Ionicons name="alert" size={15} color={WARNING_TEXT} />
                    </View>
                  </View>
                  <Text style={styles.indicatorValue}>{report.highRisk}</Text>
                  <Text style={styles.indicatorSubtext}>Flagged for clinical review</Text>
                </View>
              )}

              {/* Missed Visits */}
              {selectedContents.includes("missed") && (
                <View style={styles.indicatorCard}>
                  <View style={styles.indicatorCardTop}>
                    <Text style={styles.indicatorLabel}>MISSED VISITS</Text>
                    <View style={[styles.indicatorIconBox, { backgroundColor: DANGER_BG }]}>
                      <Ionicons name="close-circle" size={15} color={DANGER_TEXT} />
                    </View>
                  </View>
                  <Text style={styles.indicatorValue}>{report.missed}</Text>
                  <Text style={styles.indicatorSubtext}>Overdue &gt; 14 days</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bar Chart Section (Zone Visit Compliance Bar Chart Style) */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartCardTitle}>ZONE VISIT COMPLIANCE (%)</Text>
              <Text style={styles.chartCardHint}>Division Breakdown</Text>
            </View>

            <View style={styles.barChartContainer}>
              {ZONES.filter((z) => z.id !== "all").map((zone) => {
                const maxBarHeight = 100;
                const barHeight = (zone.compliance / 100) * maxBarHeight;
                const isSelected =
                  report.type === "Area-wise" &&
                  report.periodOrZone.toLowerCase().includes(zone.name.toLowerCase());

                const barColor =
                  zone.compliance >= 80 ? PRIMARY : zone.compliance >= 70 ? WARNING : DANGER;

                return (
                  <View key={zone.id} style={styles.barColumn}>
                    <Text
                      style={[
                        styles.barValueText,
                        isSelected && { color: PRIMARY, fontWeight: "900" },
                      ]}
                    >
                      {zone.compliance}%
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: barHeight, backgroundColor: barColor },
                          isSelected && styles.barFillSelected,
                        ]}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.barZoneName,
                        isSelected && { color: TEXT_MAIN, fontWeight: "800" },
                      ]}
                    >
                      {zone.name}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartFooterRow}>
              <Text style={styles.chartFooterLabel}>Weighted Divisional Average</Text>
              <Text style={styles.chartFooterValue}>78%</Text>
            </View>
          </View>

          {/* Data Table Section (Exact numbers with alternating row shading) */}
          <View style={styles.tableCard}>
            <Text style={styles.chartCardTitle}>STATISTICAL BREAKDOWN</Text>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCol, { flex: 2 }]}>ZONE</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.5, textAlign: "center" }]}>
                COMPL.
              </Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.5, textAlign: "center" }]}>
                HIGH-RISK
              </Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.5, textAlign: "right" }]}>
                MISSED
              </Text>
            </View>

            {ZONES.map((zone, idx) => {
              const isEven = idx % 2 === 0;
              const isHighlight =
                report.type === "Area-wise" &&
                report.periodOrZone.toLowerCase().includes(zone.name.toLowerCase());

              return (
                <View
                  key={zone.id}
                  style={[
                    styles.tableRow,
                    isEven ? styles.tableRowEven : styles.tableRowOdd,
                    isHighlight && styles.tableRowHighlight,
                  ]}
                >
                  <Text
                    style={[
                      styles.tableCellZone,
                      { flex: 2 },
                      isHighlight && { color: PRIMARY, fontWeight: "800" },
                    ]}
                  >
                    {zone.name}
                  </Text>
                  <Text
                    style={[
                      styles.tableCellNormal,
                      { flex: 1.5, textAlign: "center" },
                      zone.compliance < 70 && { color: DANGER_TEXT, fontWeight: "700" },
                    ]}
                  >
                    {zone.compliance}%
                  </Text>
                  <Text
                    style={[
                      styles.tableCellNormal,
                      { flex: 1.5, textAlign: "center" },
                    ]}
                  >
                    {zone.highRisk}
                  </Text>
                  <Text
                    style={[
                      styles.tableCellNormal,
                      { flex: 1.5, textAlign: "right", fontWeight: "700" },
                    ]}
                  >
                    {zone.missed}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Sticky Bottom Action Bar */}
      <View style={styles.stickyBottomBar}>
        <SafeAreaView edges={["bottom"]}>
          <View style={styles.stickyActionsRow}>
            {/* Share Button (Secondary Outlined Purple) */}
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.shareSecondaryBtn,
                pressed && { backgroundColor: PRIMARY_LIGHT },
              ]}
            >
              <Ionicons name="share-social-outline" size={19} color={PRIMARY} style={{ marginRight: 6 }} />
              <Text style={styles.shareSecondaryBtnText}>Share</Text>
            </Pressable>

            {/* Download Button (Primary Filled Purple) */}
            <Pressable
              onPress={onDownload}
              style={({ pressed }) => [
                styles.downloadPrimaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="download-outline" size={19} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.downloadPrimaryBtnText}>Download</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 3: Download Format Selection (Bottom Sheet Modal)
// ─────────────────────────────────────────────────────────────
interface Screen3ModalProps {
  visible: boolean;
  onClose: () => void;
  downloadingFormat: DownloadFormat | null;
  successFormat: DownloadFormat | null;
  onSelectFormat: (format: DownloadFormat) => void;
}

function Screen3DownloadModal({
  visible,
  onClose,
  downloadingFormat,
  successFormat,
  onSelectFormat,
}: Screen3ModalProps) {
  const formats: {
    key: DownloadFormat;
    title: string;
    subtext: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    badge: string;
  }[] = [
    {
      key: "pdf",
      title: "PDF Document",
      subtext: "Best for printing or sharing",
      icon: "document-text",
      iconBg: DANGER_BG,
      iconColor: DANGER,
      badge: ".pdf",
    },
    {
      key: "excel",
      title: "Excel Sheet",
      subtext: "Best for data analysis",
      icon: "grid",
      iconBg: SUCCESS_BG,
      iconColor: SUCCESS_TEXT,
      badge: ".xlsx",
    },
    {
      key: "png",
      title: "Image (PNG)",
      subtext: "Chart snapshot only",
      icon: "image",
      iconBg: PRIMARY_LIGHT,
      iconColor: PRIMARY,
      badge: ".png",
    },
  ];

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetModalCard} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Title */}
          <Text style={styles.sheetTitle}>Download Report As</Text>
          <Text style={styles.sheetSubtitle}>Choose your preferred export file format</Text>

          {/* Format Rows */}
          <View style={{ gap: 10, marginTop: 16 }}>
            {formats.map((fmt) => {
              const isCurrentLoading = downloadingFormat === fmt.key;
              const isCurrentSuccess = successFormat === fmt.key;

              return (
                <Pressable
                  key={fmt.key}
                  disabled={downloadingFormat !== null || successFormat !== null}
                  onPress={() => onSelectFormat(fmt.key)}
                  style={({ pressed }) => [
                    styles.formatRowCard,
                    isCurrentSuccess && styles.formatRowSuccess,
                    pressed && { backgroundColor: "#F8FAFC" },
                  ]}
                >
                  {/* Left Icon with color accent */}
                  <View style={[styles.formatIconCircle, { backgroundColor: fmt.iconBg }]}>
                    <Ionicons name={fmt.icon} size={20} color={fmt.iconColor} />
                  </View>

                  {/* Middle Text Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.formatTitleText}>{fmt.title}</Text>
                      <View style={styles.formatBadge}>
                        <Text style={styles.formatBadgeText}>{fmt.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.formatSubtext}>{fmt.subtext}</Text>
                  </View>

                  {/* Right Status */}
                  <View style={{ alignItems: "flex-end" }}>
                    {isCurrentLoading ? (
                      <ActivityIndicator size="small" color={PRIMARY} />
                    ) : isCurrentSuccess ? (
                      <View style={styles.downloadedStatusPill}>
                        <Ionicons name="checkmark-circle" size={16} color={SUCCESS} style={{ marginRight: 4 }} />
                        <Text style={styles.downloadedStatusText}>Downloaded</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={TEXT_LIGHT} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Close button */}
          <Pressable
            onPress={onClose}
            disabled={downloadingFormat !== null}
            style={styles.sheetCancelBtn}
          >
            <Text style={styles.sheetCancelBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 4: Report History (Past Downloads)
// ─────────────────────────────────────────────────────────────
interface Screen4Props {
  onBack: () => void;
  reports: PastReport[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
  onSelectReport: (rep: PastReport) => void;
  onQuickDownload: (rep: PastReport) => void;
}

function Screen4ReportHistory({
  onBack,
  reports,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onSelectReport,
  onQuickDownload,
}: Screen4Props) {
  const filterChips = ["All", "Weekly", "Monthly", "Area-wise"];

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.period.toLowerCase().includes(searchQuery.toLowerCase());

      const matchFilter = filter === "All" || r.type === filter;
      return matchSearch && matchFilter;
    });
  }, [reports, searchQuery, filter]);

  const getFormatVisual = (fmt: DownloadFormat) => {
    switch (fmt) {
      case "pdf":
        return { icon: "document-text", bg: DANGER_BG, color: DANGER, label: "PDF" };
      case "excel":
        return { icon: "grid", bg: SUCCESS_BG, color: SUCCESS_TEXT, label: "XLS" };
      case "png":
        return { icon: "image", bg: PRIMARY_LIGHT, color: PRIMARY, label: "PNG" };
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top App Bar */}
      <View style={styles.previewTopBar}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.previewTopBarContent}>
            <Pressable onPress={onBack} style={styles.previewBackBtn}>
              <Ionicons name="arrow-back" size={20} color={TEXT_MAIN} />
            </Pressable>
            <Text style={styles.previewTitleText}>Report History</Text>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.historyScrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-outline" size={18} color={TEXT_MUTED} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search past reports"
            placeholderTextColor={TEXT_LIGHT}
            value={searchQuery}
            onChangeText={onSearchChange}
            style={styles.searchTextInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => onSearchChange("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={TEXT_LIGHT} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips Row */}
        <View style={styles.historyFilterChipsRow}>
          {filterChips.map((chip) => {
            const isSel = filter === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => onFilterChange(chip)}
                style={[
                  styles.historyFilterChip,
                  isSel && styles.historyFilterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.historyFilterChipText,
                    isSel && styles.historyFilterChipTextActive,
                  ]}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reports Count */}
        <Text style={styles.historyCountText}>
          PAST REPORTS ({filteredReports.length})
        </Text>

        {/* List of past report cards */}
        {filteredReports.length === 0 ? (
          <View style={styles.historyEmptyBox}>
            <Ionicons name="document-text-outline" size={36} color={TEXT_LIGHT} />
            <Text style={styles.historyEmptyTitle}>No reports found</Text>
            <Text style={styles.historyEmptySubtitle}>
              Try adjusting your search query or filters
            </Text>
          </View>
        ) : (
          filteredReports.map((rep) => {
            const vis = getFormatVisual(rep.format);
            return (
              <Pressable
                key={rep.id}
                onPress={() => onSelectReport(rep)}
                style={({ pressed }) => [
                  styles.historyCard,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                ]}
              >
                {/* File-type icon on left */}
                <View style={[styles.historyFileIconBox, { backgroundColor: vis.bg }]}>
                  <Ionicons name={vis.icon as any} size={20} color={vis.color} />
                  <Text style={[styles.historyFileBadge, { color: vis.color }]}>{vis.label}</Text>
                </View>

                {/* Report Info Middle */}
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={styles.historyCardName} numberOfLines={1}>
                    {rep.name}
                  </Text>
                  <Text style={styles.historyCardPeriod}>
                    {rep.period} • {rep.type}
                  </Text>
                  <Text style={styles.historyCardDate}>
                    Generated {rep.date} • {rep.size}
                  </Text>
                </View>

                {/* Right Re-download icon button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onQuickDownload(rep);
                  }}
                  style={({ pressed }) => [
                    styles.quickDownloadBtn,
                    pressed && { backgroundColor: PRIMARY_LIGHT },
                  ]}
                >
                  <Ionicons name="download-outline" size={18} color={PRIMARY} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ZONE SELECT MODAL (For Area-wise filter)
// ─────────────────────────────────────────────────────────────
function ZoneSelectModal({
  visible,
  currentZone,
  onSelectZone,
  onClose,
}: {
  visible: boolean;
  currentZone: string;
  onSelectZone: (zone: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetModalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Health Zone</Text>
          <Text style={styles.sheetSubtitle}>Choose a division to generate area report</Text>

          <View style={{ gap: 8, marginTop: 14 }}>
            {ZONES.map((zone) => {
              const isSel = currentZone === zone.name;
              return (
                <Pressable
                  key={zone.id}
                  onPress={() => onSelectZone(zone.name)}
                  style={[
                    styles.zoneOptionRow,
                    isSel && styles.zoneOptionRowActive,
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={isSel ? PRIMARY : TEXT_MUTED}
                    />
                    <Text
                      style={[
                        styles.zoneOptionName,
                        isSel && styles.zoneOptionNameActive,
                      ]}
                    >
                      {zone.name}
                    </Text>
                  </View>
                  {isSel && (
                    <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={styles.sheetCancelBtn}>
            <Text style={styles.sheetCancelBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  screenWrapper: {
    flex: 1,
  },

  // Toast
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Screen 1 Header
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitleText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  historyLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Screen 1 Content
  homeScrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  cardContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Segmented Chips (Weekly | Monthly | Area-wise)
  segmentedChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentedChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedChipSelected: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  segmentedChipUnselected: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  segmentedChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  segmentedChipTextSelected: {
    color: "#FFFFFF",
  },
  segmentedChipTextUnselected: {
    color: TEXT_MUTED,
  },

  // Stepper Picker (Left / Right Chevron with range in middle)
  stepperPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperCenterBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  stepperValueText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: TEXT_MAIN,
  },

  // Dropdown Selector (Area-wise)
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dropdownIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dropdownSubLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  dropdownMainLabel: {
    fontSize: 14.5,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginTop: 2,
  },

  innerDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },

  // Report Content Checkboxes
  contentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  contentHelperText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
  },
  contentOptionsGrid: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checkboxRowChecked: {
    backgroundColor: PRIMARY_TINT,
    borderColor: PRIMARY_LIGHT,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: CARD_BG,
  },
  checkboxBoxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  checkboxLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  checkboxLabelChecked: {
    color: TEXT_MAIN,
    fontWeight: "700",
  },

  // Primary Button
  generatePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 18,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  generatePrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "800",
  },

  // Screen 2 Preview Top Bar
  previewTopBar: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  previewTopBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitleText: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_MAIN,
    maxWidth: 240,
    textAlign: "center",
  },

  // Screen 2 Loading State
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginTop: 14,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 4,
  },

  // Screen 2 Preview Scroll Content
  previewScrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  summaryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  summaryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  summaryTypeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryTypeBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  summaryReportHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  summaryTimestamp: {
    fontSize: 12,
    color: TEXT_LIGHT,
    marginTop: 4,
  },

  // Indicators Section (2-column mini cards)
  indicatorsSection: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  indicatorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  indicatorCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  indicatorCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  indicatorLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.4,
  },
  indicatorIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorValue: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_MAIN,
  },
  indicatorSubtext: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Bar Chart Card
  chartCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  chartCardHint: {
    fontSize: 11.5,
    color: TEXT_LIGHT,
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingBottom: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  barTrack: {
    width: 22,
    height: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 11,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 11,
  },
  barFillSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  barZoneName: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginTop: 6,
  },
  chartFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  chartFooterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  chartFooterValue: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
  },

  // Table Card
  tableCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  tableHeaderCol: {
    fontSize: 10.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tableRowEven: {
    backgroundColor: CARD_BG,
  },
  tableRowOdd: {
    backgroundColor: "#F8FAFC",
  },
  tableRowHighlight: {
    backgroundColor: PRIMARY_TINT,
  },
  tableCellZone: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  tableCellNormal: {
    fontSize: 13,
    color: TEXT_MAIN,
  },

  // Sticky Bottom Action Bar
  stickyBottomBar: {
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  stickyActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  shareSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: "#F5F3FF",
  },
  shareSecondaryBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: PRIMARY,
  },
  downloadPrimaryBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadPrimaryBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Screen 3 Download Modal (Bottom Sheet)
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetModalCard: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    backgroundColor: "#CBD5E1",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_MAIN,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 3,
  },
  formatRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formatRowSuccess: {
    backgroundColor: SUCCESS_BG,
    borderColor: "#86EFAC",
  },
  formatIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  formatTitleText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
  },
  formatSubtext: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  downloadedStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  downloadedStatusText: {
    fontSize: 12,
    fontWeight: "800",
    color: SUCCESS_TEXT,
  },
  sheetCancelBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },

  // Screen 4 History Content
  historyScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_MAIN,
    padding: 0,
  },
  historyFilterChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  historyFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  historyFilterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  historyFilterChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  historyFilterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  historyCountText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  historyEmptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  historyEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginTop: 10,
  },
  historyEmptySubtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginTop: 3,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  historyFileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyFileBadge: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },
  historyCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  historyCardPeriod: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
    marginTop: 2,
  },
  historyCardDate: {
    fontSize: 11,
    color: TEXT_LIGHT,
    marginTop: 2,
  },
  quickDownloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Zone Option Rows in Modal
  zoneOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  zoneOptionRowActive: {
    backgroundColor: PRIMARY_LIGHT,
  },
  zoneOptionName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  zoneOptionNameActive: {
    color: PRIMARY,
    fontWeight: "800",
  },
});
