import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import BottomNavBar from "../components/BottomNavBar";
import { Button, C, Card, Chip, Field, Row, SectionTitle, s, usePalette } from "../components/ui";
import { useMothers } from "./PHM";

type QueuePatient = {
  token: number;
  childName: string;
  age: string;
  motherName: string;
  type: "Vaccination" | "Growth" | "Both";
  status: "done" | "now-serving" | "waiting";
};

const INITIAL_QUEUE: QueuePatient[] = [
  { token: 1, childName: "Ravindu Perera", age: "8m", motherName: "Chamari Perera", type: "Vaccination", status: "done" },
  { token: 2, childName: "Malithi Silva", age: "14m", motherName: "Sandya Silva", type: "Growth", status: "done" },
  { token: 3, childName: "Thishara Bandara", age: "6m", motherName: "Tharaka Bandara", type: "Vaccination", status: "done" },
  { token: 4, childName: "Senali Weerasinghe", age: "9m", motherName: "Nilanthi Weerasinghe", type: "Both", status: "now-serving" },
  { token: 5, childName: "Kavindi Rathnayake", age: "12m", motherName: "Kumari Rathnayake", type: "Vaccination", status: "waiting" },
];

const CARAMEL = "#AF5819";
const CARAMEL_DARK = "#964612";
const CARAMEL_LIGHT = "#FEF3C7";

export function NursingHome() {
  const { navigate, setShowLanguageModal, currentScreen } = useApp();
  const [queue, setQueue] = useState<QueuePatient[]>(INITIAL_QUEUE);

  const doneCount = queue.filter((x) => x.status === "done").length;
  const remainingCount = queue.filter((x) => x.status !== "done").length;
  const serving = queue.find((x) => x.status === "now-serving") || queue[3];

  const advancePatient = (token: number) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.token === token) {
          return { ...item, status: "done" };
        }
        if (item.token === token + 1 && item.status === "waiting") {
          return { ...item, status: "now-serving" };
        }
        return item;
      })
    );
  };

  return (
    <View style={nSt.container}>
      {/* Top Caramel Header */}
      <SafeAreaView edges={["top"]} style={nSt.headerSafe}>
        <View style={nSt.headerContent}>
          {/* Row 1: Profile & Action Icons */}
          <View style={nSt.profileRow}>
            <View style={nSt.avatarContainer}>
              <View style={nSt.avatarCircle}>
                <Text style={nSt.avatarLetter}>N</Text>
              </View>
              <View style={nSt.onlineDot} />
            </View>

            <View style={nSt.profileTextCol}>
              <Text style={nSt.greeting}>GOOD MORNING</Text>
              <Text style={nSt.profileName}>Nalini</Text>
            </View>

            <View style={nSt.headerIconsRow}>
              <Pressable
                onPress={() => setShowLanguageModal(true)}
                style={({ pressed }) => [nSt.headerIconButton, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="time-outline" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => navigate("settings")}
                style={({ pressed }) => [nSt.headerIconButton, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Row 2: Badges */}
          <View style={nSt.badgesRow}>
            <View style={nSt.clinicBadge}>
              <Ionicons name="location-sharp" size={13} color="#F87171" style={{ marginRight: 4 }} />
              <Text style={nSt.clinicBadgeText}>Buttala Health Clinic</Text>
            </View>
            <View style={nSt.roleBadge}>
              <Text style={nSt.roleBadgeText}>NURSING OFFICER</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Scrollable Body */}
      <ScrollView contentContainerStyle={nSt.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Row of 3 Metric Cards */}
        <View style={nSt.metricsRow}>
          <View style={nSt.metricCard}>
            <Text style={[nSt.metricNumber, { color: "#10B981" }]}>{doneCount || 3}</Text>
            <Text style={nSt.metricLabel}>Done</Text>
          </View>
          <View style={nSt.metricCard}>
            <Text style={[nSt.metricNumber, { color: "#D97706" }]}>{remainingCount || 4}</Text>
            <Text style={nSt.metricLabel}>Remaining</Text>
          </View>
          <View style={nSt.metricCard}>
            <Text style={[nSt.metricNumber, { color: "#6366F1" }]}>8m</Text>
            <Text style={nSt.metricLabel}>Avg time</Text>
          </View>
        </View>

        {/* NOW SERVING Hero Card */}
        {serving && (
          <View style={nSt.servingCard}>
            {/* Giant watermark number in the background */}
            <Text style={nSt.watermarkText}>{serving.token}</Text>

            {/* Indicator */}
            <View style={nSt.servingIndicatorRow}>
              <View style={nSt.servingDot} />
              <Text style={nSt.servingIndicatorText}>NOW SERVING</Text>
            </View>

            {/* Patient Info Row */}
            <View style={nSt.servingContentRow}>
              <View style={nSt.servingTokenBox}>
                <Text style={nSt.servingTokenText}>#{serving.token}</Text>
              </View>
              <View style={nSt.servingDetails}>
                <Text style={nSt.servingPatientName}>
                  {serving.childName} ({serving.age})
                </Text>
                <Text style={nSt.servingMotherName}>{serving.motherName}</Text>
                <View style={nSt.servingTagPill}>
                  <Text style={nSt.servingTagText}>{serving.type}</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <Pressable
              onPress={() => navigate("nursing-entry")}
              style={({ pressed }) => [nSt.startEntryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={nSt.startEntryBtnText}>Start Entry →</Text>
            </Pressable>
          </View>
        )}

        {/* Section Title */}
        <Text style={nSt.sectionHeader}>TODAY'S QUEUE</Text>

        {/* Queue Items List */}
        {queue.map((item) => {
          const isDone = item.status === "done";
          const isServing = item.status === "now-serving";

          return (
            <View key={item.token} style={nSt.queueCard}>
              <View style={nSt.queueCardLeft}>
                {/* Left Badge / Check Icon */}
                {isDone ? (
                  <View style={nSt.doneCheckCircle}>
                    <Ionicons name="checkmark" size={20} color="#94A3B8" />
                  </View>
                ) : isServing ? (
                  <View style={nSt.servingBadgeSquare}>
                    <Text style={nSt.servingBadgeText}>#{item.token}</Text>
                  </View>
                ) : (
                  <View style={nSt.waitingBadgeSquare}>
                    <Text style={nSt.waitingBadgeText}>#{item.token}</Text>
                  </View>
                )}

                {/* Patient Information */}
                <View style={nSt.patientInfoCol}>
                  <Text
                    style={[
                      nSt.patientTitle,
                      isDone ? { color: "#64748B", fontWeight: "600" } : { color: "#0F172A", fontWeight: "800" },
                    ]}
                  >
                    {item.childName} ({item.age})
                  </Text>
                  <View style={nSt.patientMetaRow}>
                    <View
                      style={[
                        nSt.typeTagPill,
                        item.type === "Vaccination" && { backgroundColor: "#E0F2FE" },
                        item.type === "Growth" && { backgroundColor: "#DCFCE7" },
                        item.type === "Both" && { backgroundColor: "#EDE9FE" },
                      ]}
                    >
                      <Text
                        style={[
                          nSt.typeTagText,
                          item.type === "Vaccination" && { color: "#0284C7" },
                          item.type === "Growth" && { color: "#16A34A" },
                          item.type === "Both" && { color: "#7C3AED" },
                        ]}
                      >
                        {item.type}
                      </Text>
                    </View>
                    <Text style={nSt.motherNameText}>{item.motherName}</Text>
                  </View>
                </View>
              </View>

              {/* Right Action Button */}
              {isServing ? (
                <Pressable
                  onPress={() => navigate("nursing-entry")}
                  style={({ pressed }) => [nSt.actionSquareButton, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="create-outline" size={19} color="#FFFFFF" />
                </Pressable>
              ) : isDone ? null : (
                <Pressable
                  onPress={() => advancePatient(item.token)}
                  style={({ pressed }) => [nSt.actionCircleButton, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="add" size={20} color="#64748B" />
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

const ALL_VACCINES = [
  { id: "bcg", name: "BCG" },
  { id: "opv0", name: "OPV-0" },
  { id: "penta1", name: "Penta-1 (DPT+HepB+Hib)" },
  { id: "opv1", name: "OPV-1" },
  { id: "pcv1", name: "PCV-1" },
  { id: "penta2", name: "Penta-2" },
  { id: "opv2", name: "OPV-2" },
  { id: "mmr1", name: "MMR-1", defaultChecked: true, timeStr: "Today, 10:34 AM" },
];

export function NursingEntry() {
  const { navigate, setShowLanguageModal, currentScreen, isOnline, refreshPending } = useApp();
  const [activeTab, setActiveTab] = useState<"immunization" | "growth">("immunization");

  // Immunization Form State
  const [selectedVaccines, setSelectedVaccines] = useState<Record<string, boolean>>({
    mmr1: true,
  });
  const [lotNumber, setLotNumber] = useState("LOT-2024-A");
  const [expiryDate, setExpiryDate] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Growth Monitoring Form State
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [headCircumference, setHeadCircumference] = useState("");
  const [muac, setMuac] = useState("");

  const toggleVaccine = (id: string) => {
    setSelectedVaccines((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = async () => {
    const payload =
      activeTab === "immunization"
        ? {
            type: "immunization",
            childId: "CH-2024-0091",
            childName: "Senali Weerasinghe",
            vaccines: Object.keys(selectedVaccines).filter((k) => selectedVaccines[k]),
            lotNumber,
            expiryDate,
            notes: clinicalNotes,
          }
        : {
            type: "growth",
            childId: "CH-2024-0091",
            childName: "Senali Weerasinghe",
            weight,
            height,
            headCircumference,
            muac,
            zScore: "Normal (+0.4 WAZ)",
            notes: clinicalNotes,
          };

    await queueRecord(payload);
    refreshPending();
    if (isOnline) flushPending().then(refreshPending).catch(() => {});
    Alert.alert("Success", "Entry saved successfully!", [
      { text: "OK", onPress: () => navigate("nursing-home") },
    ]);
  };

  return (
    <View style={nSt.container}>
      {/* Top Header */}
      <SafeAreaView edges={["top"]} style={nSt.headerSafe}>
        <View style={nSt.entryHeaderRow}>
          <Pressable
            onPress={() => navigate("nursing-home")}
            style={({ pressed }) => [nSt.backButtonCircle, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          <Text style={nSt.entryHeaderTitle}>New Entry</Text>

          <View style={nSt.headerIconsRow}>
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              style={({ pressed }) => [nSt.headerIconButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => navigate("settings")}
              style={({ pressed }) => [nSt.headerIconButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Form Body */}
      <ScrollView contentContainerStyle={nSt.scrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Patient Summary Card */}
        <View style={nSt.patientSummaryCard}>
          <View style={nSt.babyAvatarBox}>
            <Text style={{ fontSize: 26 }}>👶</Text>
          </View>
          <View style={nSt.patientSummaryDetails}>
            <Text style={nSt.patientSummaryName}>Senali Weerasinghe</Text>
            <Text style={nSt.patientSummarySub}>9 months · Female · CH-2024-0091</Text>
            <View style={nSt.activeTokenBadge}>
              <View style={nSt.tokenDot} />
              <Text style={nSt.activeTokenText}>Token #4 · Active</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector (Immunization vs Growth Monitoring) */}
        <View style={nSt.tabSelectorContainer}>
          <Pressable
            onPress={() => setActiveTab("immunization")}
            style={[nSt.tabItem, activeTab === "immunization" && nSt.tabItemActive]}
          >
            <Text
              style={[
                nSt.tabItemText,
                activeTab === "immunization" && { color: CARAMEL, fontWeight: "800" },
              ]}
            >
              Immunization
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("growth")}
            style={[nSt.tabItem, activeTab === "growth" && nSt.tabItemActive]}
          >
            <Text
              style={[
                nSt.tabItemText,
                activeTab === "growth" && { color: CARAMEL, fontWeight: "800" },
              ]}
            >
              Growth Monitoring
            </Text>
          </Pressable>
        </View>

        {activeTab === "immunization" ? (
          /* =================== IMMUNIZATION TAB =================== */
          <View>
            <Text style={nSt.inputSectionHeader}>VACCINES TO ADMINISTER</Text>

            {/* Vaccines List */}
            <View style={nSt.vaccinesListCard}>
              {ALL_VACCINES.map((vax, idx) => {
                const isChecked = !!selectedVaccines[vax.id];
                const isLast = idx === ALL_VACCINES.length - 1;

                return (
                  <Pressable
                    key={vax.id}
                    onPress={() => toggleVaccine(vax.id)}
                    style={[nSt.vaccineRow, isLast && { borderBottomWidth: 0 }]}
                  >
                    <View
                      style={[
                        nSt.checkboxSquare,
                        isChecked && { backgroundColor: CARAMEL, borderColor: CARAMEL },
                      ]}
                    >
                      {isChecked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                    </View>

                    <Text
                      style={[
                        nSt.vaccineNameText,
                        isChecked && { fontWeight: "800", color: "#0F172A" },
                      ]}
                    >
                      {vax.name}
                    </Text>

                    {isChecked && vax.timeStr && (
                      <Text style={nSt.vaccineTimestampText}>{vax.timeStr}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* LOT # / EXPIRY */}
            <Text style={nSt.inputSectionHeader}>LOT # / EXPIRY</Text>
            <View style={nSt.lotExpiryRow}>
              <View style={[nSt.textInputWrapper, { flex: 1 }]}>
                <TextInput
                  style={nSt.textInputField}
                  value={lotNumber}
                  onChangeText={setLotNumber}
                  placeholder="LOT-2024-A"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[nSt.textInputWrapper, { flex: 1, flexDirection: "row", alignItems: "center" }]}>
                <TextInput
                  style={[nSt.textInputField, { flex: 1 }]}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94A3B8"
                />
                <Ionicons name="calendar-outline" size={19} color="#334155" style={{ marginRight: 12 }} />
              </View>
            </View>

            {/* CLINICAL NOTES (OPTIONAL) */}
            <Text style={nSt.inputSectionHeader}>CLINICAL NOTES (OPTIONAL)</Text>
            <View style={nSt.notesInputWrapper}>
              <TextInput
                style={nSt.notesInputField}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                placeholder="Reactions, issues..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Save Entry Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [nSt.saveEntryMainBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={nSt.saveEntryMainBtnText}>Save Entry</Text>
            </Pressable>
          </View>
        ) : (
          /* =================== GROWTH MONITORING TAB =================== */
          <View>
            <Text style={nSt.inputSectionHeader}>PHYSICAL MEASUREMENTS</Text>

            {/* Weight */}
            <Text style={nSt.fieldLabelSmall}>WEIGHT (KG)</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 8.2"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>kg</Text>
            </View>

            {/* Length / Height */}
            <Text style={nSt.fieldLabelSmall}>LENGTH/HEIGHT (CM)</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 72"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>cm</Text>
            </View>

            {/* Head Circumference */}
            <Text style={nSt.fieldLabelSmall}>HEAD CIRCUMFERENCE (CM)</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={headCircumference}
                onChangeText={setHeadCircumference}
                placeholder="e.g. 44"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>cm</Text>
            </View>

            {/* MUAC */}
            <Text style={nSt.fieldLabelSmall}>MUAC (CM)</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={muac}
                onChangeText={setMuac}
                placeholder="e.g. 14.5"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>cm</Text>
            </View>

            {/* WHO z-score Result Card */}
            <View style={nSt.whoZscoreCard}>
              <View style={nSt.whoIconBox}>
                <Ionicons name="bar-chart" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={nSt.whoTitleText}>WHO z-score: Normal Range</Text>
                <Text style={nSt.whoSubText}>WAZ: +0.4 · HAZ: -0.2 · WHZ: +0.8</Text>
              </View>
            </View>

            {/* CLINICAL NOTES (OPTIONAL) */}
            <Text style={nSt.inputSectionHeader}>CLINICAL NOTES (OPTIONAL)</Text>
            <View style={nSt.notesInputWrapper}>
              <TextInput
                style={nSt.notesInputField}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                placeholder="Reactions, issues..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Save Entry Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [nSt.saveEntryMainBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={nSt.saveEntryMainBtnText}>Save Entry</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

export function NursingSearch() {
  const { navigate, setShowLanguageModal, currentScreen } = useApp();
  const [q, setQ] = useState("");
  const list = useMothers(q);

  return (
    <View style={nSt.container}>
      {/* Top Header */}
      <SafeAreaView edges={["top"]} style={nSt.headerSafe}>
        <View style={nSt.entryHeaderRow}>
          <Pressable
            onPress={() => navigate("nursing-home")}
            style={({ pressed }) => [nSt.backButtonCircle, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          <Text style={nSt.entryHeaderTitle}>Records Retrieval</Text>

          <View style={nSt.headerIconsRow}>
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              style={({ pressed }) => [nSt.headerIconButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => navigate("settings")}
              style={({ pressed }) => [nSt.headerIconButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={nSt.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={[nSt.textInputWrapper, { marginBottom: 14, flexDirection: "row", alignItems: "center" }]}>
          <Ionicons name="search-outline" size={19} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={[nSt.textInputField, { flex: 1 }]}
            placeholder="Search name, ID or phone..."
            placeholderTextColor="#94A3B8"
            value={q}
            onChangeText={setQ}
          />
        </View>

        <Text style={nSt.sectionHeader}>RECORD LIST ({list.length})</Text>

        {list.map((m) => (
          <View key={m.id} style={nSt.queueCard}>
            <View style={nSt.queueCardLeft}>
              <View style={[nSt.doneCheckCircle, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="folder-open" size={20} color={CARAMEL} />
              </View>
              <View style={nSt.patientInfoCol}>
                <Text style={[nSt.patientTitle, { fontWeight: "800", color: "#0F172A" }]}>{m.name}</Text>
                <Text style={nSt.motherNameText}>{m.id} · {m.village} · {m.weeks} wks</Text>
              </View>
            </View>

            <View
              style={[
                nSt.typeTagPill,
                m.risk === "high" ? { backgroundColor: "#FEE2E2" } : { backgroundColor: "#F1F5F9" },
              ]}
            >
              <Text
                style={[
                  nSt.typeTagText,
                  m.risk === "high" ? { color: "#DC2626" } : { color: "#64748B" },
                ]}
              >
                {m.risk.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

const nSt = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerSafe: {
    backgroundColor: CARAMEL,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: CARAMEL,
    position: "absolute",
    bottom: -1,
    right: -1,
  },
  profileTextCol: {
    flex: 1,
  },
  greeting: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerIconsRow: {
    flexDirection: "row",
    gap: 10,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  clinicBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.38)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  clinicBadgeText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 12,
    fontWeight: "700",
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.38)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 110,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metricNumber: {
    fontSize: 26,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 2,
  },
  servingCard: {
    backgroundColor: CARAMEL,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  watermarkText: {
    position: "absolute",
    right: 12,
    top: -14,
    fontSize: 124,
    fontWeight: "900",
    color: "rgba(0, 0, 0, 0.10)",
  },
  servingIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  servingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  servingIndicatorText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  servingContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  servingTokenBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  servingTokenText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  servingDetails: {
    flex: 1,
  },
  servingPatientName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  servingMotherName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    marginBottom: 6,
  },
  servingTagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  servingTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  startEntryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  startEntryBtnText: {
    color: CARAMEL,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  queueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  queueCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  doneCheckCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  servingBadgeSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CARAMEL,
    alignItems: "center",
    justifyContent: "center",
  },
  servingBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  waitingBadgeSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  waitingBadgeText: {
    color: CARAMEL,
    fontSize: 16,
    fontWeight: "900",
  },
  patientInfoCol: {
    flex: 1,
  },
  patientTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  patientMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  motherNameText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  actionSquareButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CARAMEL,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  entryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  entryHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  patientSummaryCard: {
    backgroundColor: "#FEF9EE",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  babyAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  patientSummaryDetails: {
    flex: 1,
  },
  patientSummaryName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  patientSummarySub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  activeTokenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  tokenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
    marginRight: 5,
  },
  activeTokenText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  tabSelectorContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  inputSectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  vaccinesListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
  },
  vaccineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vaccineNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  vaccineTimestampText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  lotExpiryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  textInputWrapper: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  textInputField: {
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },
  notesInputWrapper: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    height: 90,
    marginBottom: 16,
  },
  notesInputField: {
    fontSize: 14,
    color: "#0F172A",
    flex: 1,
    textAlignVertical: "top",
    padding: 0,
  },
  saveEntryMainBtn: {
    backgroundColor: CARAMEL,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  saveEntryMainBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  fieldLabelSmall: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 6,
  },
  measurementInputRow: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  measurementInputField: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },
  unitBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  whoZscoreCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  whoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  whoTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
    marginBottom: 2,
  },
  whoSubText: {
    fontSize: 12,
    color: "#059669",
  },
});

