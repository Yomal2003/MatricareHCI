import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import BottomNavBar from "../components/BottomNavBar";
import MidwifeProfileModal, { MidwifeData } from "../components/MidwifeProfileModal";
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

type ChildRecord = {
  id: string;
  name: string;
  age: string;
  chNumber: string;
  motherName: string;
  motherCode?: string;
  motherVillage?: string;
  motherArea?: string;
  assignedMidwife?: MidwifeData;
  status: "complete" | "attention";
  isUnborn?: boolean;
  unbornStatus?: "unborn" | "born";
  edd?: string;
  gestationalWeeks?: number;
  deliveryHospital?: string;
  immunization: {
    completedCount: number;
    totalCount: number;
    items: {
      name: string;
      status: "done" | "pending";
      date?: string;
    }[];
  };
  growth: {
    weight: string;
    length: string;
    waz: string;
  };
};

const SRI_LANKA_AREAS = [
  "Buttala",
  "Buttala West",
  "Pelwatte",
  "Malwatte",
  "Wellawaya",
  "Okkampitiya",
  "Madulla",
  "Siyambalanduwa",
  "Kandegama",
];

const DEFAULT_MIDWIVES: MidwifeData[] = [
  {
    id: "1",
    name: "Kamani Rathnayake",
    staffId: "PHM001",
    phone: "0772345678",
    badge: "Senior PHM · Buttala Division",
    area: "Buttala",
    locations: ["Buttala", "Buttala West", "Pelwatte"],
    clinic: "Buttala MOH Clinic",
    qualifications: "Registered Public Health Midwife · SLMC #3482",
    experienceYears: 8,
  },
  {
    id: "2",
    name: "Sujatha Wickramasinghe",
    staffId: "PHM002",
    phone: "0713456789",
    badge: "PHM · Wellawaya Division",
    area: "Wellawaya",
    locations: ["Wellawaya", "Malwatte", "Kandegama"],
    clinic: "Wellawaya Health Center",
    qualifications: "Registered Public Health Midwife · SLMC #4120",
    experienceYears: 6,
  },
  {
    id: "3",
    name: "Nirmala Senaviratne",
    staffId: "PHM003",
    phone: "0764567890",
    badge: "PHM · Okkampitiya Division",
    area: "Okkampitiya",
    locations: ["Okkampitiya", "Madulla", "Siyambalanduwa"],
    clinic: "Okkampitiya Rural Clinic",
    qualifications: "Registered Public Health Midwife · SLMC #4890",
    experienceYears: 5,
  },
];

const INITIAL_CHILD_RECORDS: ChildRecord[] = [
  {
    id: "1",
    name: "Ravindu Perera",
    age: "8 months",
    chNumber: "CH-2024-0088",
    motherName: "Chamari Perera",
    motherCode: "M-1042",
    motherVillage: "Buttala",
    motherArea: "Buttala",
    assignedMidwife: DEFAULT_MIDWIVES[0],
    status: "complete",
    isUnborn: false,
    unbornStatus: "born",
    immunization: {
      completedCount: 7,
      totalCount: 8,
      items: [
        { name: "BCG", status: "done", date: "Mar 3, 2024" },
        { name: "OPV-0", status: "done", date: "Mar 3, 2024" },
        { name: "Penta-1", status: "done", date: "Apr 15, 2024" },
        { name: "OPV-1", status: "done", date: "Apr 15, 2024" },
        { name: "PCV-1", status: "done", date: "Apr 15, 2024" },
        { name: "Penta-2", status: "done", date: "May 28, 2024" },
        { name: "Penta-3", status: "done", date: "Jul 10, 2024" },
        { name: "MMR-1", status: "pending" },
      ],
    },
    growth: {
      weight: "8.2 kg",
      length: "72 cm",
      waz: "+0.4 (Normal)",
    },
  },
  {
    id: "2",
    name: "Malithi Silva",
    age: "14 months",
    chNumber: "CH-2024-0075",
    motherName: "Sandya Silva",
    motherCode: "M-1039",
    motherVillage: "Pelwatte",
    motherArea: "Pelwatte",
    assignedMidwife: DEFAULT_MIDWIVES[0],
    status: "complete",
    isUnborn: false,
    unbornStatus: "born",
    immunization: {
      completedCount: 8,
      totalCount: 8,
      items: [
        { name: "BCG", status: "done", date: "Jan 12, 2024" },
        { name: "OPV-0", status: "done", date: "Jan 12, 2024" },
        { name: "Penta-1", status: "done", date: "Feb 20, 2024" },
        { name: "OPV-1", status: "done", date: "Feb 20, 2024" },
        { name: "PCV-1", status: "done", date: "Feb 20, 2024" },
        { name: "Penta-2", status: "done", date: "Apr 02, 2024" },
        { name: "Penta-3", status: "done", date: "May 15, 2024" },
        { name: "MMR-1", status: "done", date: "Oct 10, 2024" },
      ],
    },
    growth: {
      weight: "9.6 kg",
      length: "78 cm",
      waz: "+0.1 (Normal)",
    },
  },
  {
    id: "3",
    name: "Senali Weerasinghe",
    age: "9 months",
    chNumber: "CH-2024-0091",
    motherName: "Nilanthi Weerasinghe",
    motherCode: "M-1046",
    motherVillage: "Pelwatte",
    motherArea: "Pelwatte",
    assignedMidwife: DEFAULT_MIDWIVES[0],
    status: "attention",
    isUnborn: false,
    unbornStatus: "born",
    immunization: {
      completedCount: 6,
      totalCount: 8,
      items: [
        { name: "BCG", status: "done", date: "Feb 10, 2024" },
        { name: "OPV-0", status: "done", date: "Feb 10, 2024" },
        { name: "Penta-1", status: "done", date: "Mar 25, 2024" },
        { name: "OPV-1", status: "done", date: "Mar 25, 2024" },
        { name: "PCV-1", status: "done", date: "Mar 25, 2024" },
        { name: "Penta-2", status: "done", date: "May 10, 2024" },
        { name: "Penta-3", status: "pending" },
        { name: "MMR-1", status: "pending" },
      ],
    },
    growth: {
      weight: "7.9 kg",
      length: "70 cm",
      waz: "-0.2 (Normal)",
    },
  },
  {
    id: "4",
    name: "Kavindi Rathnayake",
    age: "12 months",
    chNumber: "CH-2024-0102",
    motherName: "Kumari Rathnayake",
    motherCode: "M-1047",
    motherVillage: "Madulla",
    motherArea: "Madulla",
    assignedMidwife: DEFAULT_MIDWIVES[2],
    status: "attention",
    isUnborn: false,
    unbornStatus: "born",
    immunization: {
      completedCount: 6,
      totalCount: 8,
      items: [
        { name: "BCG", status: "done", date: "Nov 05, 2023" },
        { name: "OPV-0", status: "done", date: "Nov 05, 2023" },
        { name: "Penta-1", status: "done", date: "Dec 18, 2023" },
        { name: "OPV-1", status: "done", date: "Dec 18, 2023" },
        { name: "PCV-1", status: "done", date: "Dec 18, 2023" },
        { name: "Penta-2", status: "done", date: "Feb 04, 2024" },
        { name: "Penta-3", status: "pending" },
        { name: "MMR-1", status: "pending" },
      ],
    },
    growth: {
      weight: "8.5 kg",
      length: "74 cm",
      waz: "-0.8 (Mild Risk)",
    },
  },
  {
    id: "5",
    name: "Baby of Thilini",
    age: "Pre-natal · EDD: Nov 15, 2026",
    chNumber: "CH-2024-0118",
    motherName: "Thilini Jayawardena",
    motherCode: "M-1048",
    motherVillage: "Pelwatte",
    motherArea: "Pelwatte",
    assignedMidwife: DEFAULT_MIDWIVES[0],
    status: "attention",
    isUnborn: true,
    unbornStatus: "unborn",
    edd: "Nov 15, 2026",
    gestationalWeeks: 32,
    immunization: {
      completedCount: 0,
      totalCount: 8,
      items: [
        { name: "BCG (At Birth)", status: "pending" },
        { name: "OPV-0 (At Birth)", status: "pending" },
        { name: "Penta-1 (2 Mo)", status: "pending" },
        { name: "OPV-1 (2 Mo)", status: "pending" },
        { name: "PCV-1 (2 Mo)", status: "pending" },
        { name: "Penta-2 (4 Mo)", status: "pending" },
        { name: "Penta-3 (6 Mo)", status: "pending" },
        { name: "MMR-1 (9 Mo)", status: "pending" },
      ],
    },
    growth: {
      weight: "Awaiting birth",
      length: "Awaiting birth",
      waz: "Pre-natal record",
    },
  },
];

const QUICK_DELETE_REASONS = [
  "Duplicate entry",
  "Transferred clinic",
  "Data entry mistake",
  "Incorrect ID",
];

export function NursingSearch() {
  const { navigate, setShowLanguageModal } = useApp();
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<ChildRecord[]>(INITIAL_CHILD_RECORDS);
  const [selectedRecord, setSelectedRecord] = useState<ChildRecord | null>(null);
  const [midwivesList, setMidwivesList] = useState<MidwifeData[]>(DEFAULT_MIDWIVES);

  // Profile Viewer Modal
  const [profileMidwife, setProfileMidwife] = useState<MidwifeData | null>(null);

  // Registration Modal State
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regStep, setRegStep] = useState<"mother" | "child">("mother");
  const [regMotherName, setRegMotherName] = useState("");
  const [regNic, setRegNic] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regVillage, setRegVillage] = useState("");
  const [regArea, setRegArea] = useState("Pelwatte");
  const [regStage, setRegStage] = useState<"pregnant" | "postnatal">("pregnant");
  const [regLmpWeeks, setRegLmpWeeks] = useState("28");
  const [regEdd, setRegEdd] = useState("Nov 2026");

  // Child Registration Fields
  const [regChildIsUnborn, setRegChildIsUnborn] = useState(true);
  const [regChildName, setRegChildName] = useState("");
  const [regChildDob, setRegChildDob] = useState("");
  const [regChildSex, setRegChildSex] = useState<"male" | "female">("male");
  const [regBirthWeight, setRegBirthWeight] = useState("3.2");
  const [regBirthLength, setRegBirthLength] = useState("50");

  // Record Birth Modal State (for Unborn children)
  const [birthModalOpen, setBirthModalOpen] = useState(false);
  const [birthChildName, setBirthChildName] = useState("");
  const [birthDob, setBirthDob] = useState("Today, 09:30 AM");
  const [birthSex, setBirthSex] = useState<"male" | "female">("male");
  const [birthWeight, setBirthWeight] = useState("3.3");
  const [birthLength, setBirthLength] = useState("51");
  const [birthHospital, setBirthHospital] = useState("Monaragala Base Hospital");

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editMother, setEditMother] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editLength, setEditLength] = useState("");
  const [editWaz, setEditWaz] = useState("");
  const [editVaxList, setEditVaxList] = useState<{ name: string; status: "done" | "pending"; date?: string }[]>([]);

  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [auditNotice, setAuditNotice] = useState("");

  // Load Midwives & Server Records on mount
  useEffect(() => {
    api<MidwifeData[]>("/users/midwives")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setMidwivesList(res);
      })
      .catch(() => {});
  }, []);

  // Intelligent Midwife auto-suggestion based on entered area
  const suggestedMidwife = React.useMemo(() => {
    const areaLower = regArea.toLowerCase().trim();
    const match = midwivesList.find((mw) => {
      if (mw.area && mw.area.toLowerCase().includes(areaLower)) return true;
      if (mw.locations && mw.locations.some((l) => l.toLowerCase().includes(areaLower))) return true;
      return false;
    });
    return match || midwivesList[0] || DEFAULT_MIDWIVES[0];
  }, [regArea, midwivesList]);

  const filtered = records.filter((item) => {
    const s = q.toLowerCase();
    return (
      item.name.toLowerCase().includes(s) ||
      item.chNumber.toLowerCase().includes(s) ||
      item.motherName.toLowerCase().includes(s)
    );
  });

  // Handle Mother & Child Registration
  const handleCompleteRegistration = async () => {
    if (!regMotherName.trim()) {
      Alert.alert("Validation", "Mother's name is required.");
      return;
    }

    const motherPayload = {
      name: regMotherName.trim(),
      nic: regNic.trim(),
      phone: regPhone.trim(),
      village: regVillage.trim() || regArea,
      phmArea: regArea,
      status: regStage,
      assignedPhm: suggestedMidwife.id || suggestedMidwife._id,
      lmp: regStage === "pregnant" ? new Date(Date.now() - Number(regLmpWeeks || 28) * 7 * 864e5) : undefined,
      edd: regStage === "pregnant" ? new Date(Date.now() + 12 * 7 * 864e5) : undefined,
    };

    let serverMotherCode = `M-${1050 + records.length}`;
    try {
      const res = await api<{ code: string }>("/mothers", { method: "POST", body: motherPayload });
      if (res?.code) serverMotherCode = res.code;
    } catch {
      // Local fallback
    }

    const newChCode = `CH-2024-${String(120 + records.length).padStart(4, "0")}`;
    const isUnbornRecord = regStage === "pregnant" && regChildIsUnborn;
    const finalChildName = isUnbornRecord
      ? (regChildName.trim() || `Baby of ${regMotherName.trim()}`)
      : (regChildName.trim() || "Newborn Baby");

    const newRecord: ChildRecord = {
      id: String(Date.now()),
      name: finalChildName,
      age: isUnbornRecord ? `Pre-natal · EDD: ${regEdd}` : "0 months",
      chNumber: newChCode,
      motherName: regMotherName.trim(),
      motherCode: serverMotherCode,
      motherVillage: regVillage || regArea,
      motherArea: regArea,
      assignedMidwife: suggestedMidwife,
      status: isUnbornRecord ? "attention" : "complete",
      isUnborn: isUnbornRecord,
      unbornStatus: isUnbornRecord ? "unborn" : "born",
      edd: isUnbornRecord ? regEdd : undefined,
      gestationalWeeks: isUnbornRecord ? Number(regLmpWeeks || 28) : undefined,
      immunization: {
        completedCount: isUnbornRecord ? 0 : 2,
        totalCount: 8,
        items: [
          { name: "BCG", status: isUnbornRecord ? "pending" : "done", date: isUnbornRecord ? undefined : "Today" },
          { name: "OPV-0", status: isUnbornRecord ? "pending" : "done", date: isUnbornRecord ? undefined : "Today" },
          { name: "Penta-1", status: "pending" },
          { name: "OPV-1", status: "pending" },
          { name: "PCV-1", status: "pending" },
          { name: "Penta-2", status: "pending" },
          { name: "Penta-3", status: "pending" },
          { name: "MMR-1", status: "pending" },
        ],
      },
      growth: {
        weight: isUnbornRecord ? "Awaiting birth" : `${regBirthWeight || 3.2} kg`,
        length: isUnbornRecord ? "Awaiting birth" : `${regBirthLength || 50} cm`,
        waz: isUnbornRecord ? "Pre-natal record" : "+0.2 (Normal)",
      },
    };

    // Attempt pushing to server /children endpoint
    api("/children", {
      method: "POST",
      body: {
        motherCode: serverMotherCode,
        code: newChCode,
        name: finalChildName,
        isUnborn: isUnbornRecord,
        status: isUnbornRecord ? "unborn" : "born",
        birthWeight: Number(regBirthWeight || 3.2),
        birthLength: Number(regBirthLength || 50),
      },
    }).catch(() => {});

    setRecords((prev) => [newRecord, ...prev]);
    setRegModalOpen(false);
    setRegMotherName("");
    setRegNic("");
    setRegPhone("");
    setRegChildName("");

    Alert.alert(
      "Registration Complete",
      isUnbornRecord
        ? `Mother ${motherPayload.name} registered. Pre-natal record created for ${finalChildName}. Assigned Midwife: ${suggestedMidwife.name} (${regArea}).`
        : `Mother and child ${finalChildName} registered successfully under ${suggestedMidwife.name}.`
    );
  };

  // Record Birth for an Unborn Child
  const handleRecordBirth = async () => {
    if (!selectedRecord) return;
    if (!birthChildName.trim()) {
      Alert.alert("Validation", "Child's official name is required upon birth.");
      return;
    }

    const officialName = birthChildName.trim();
    const updated: ChildRecord = {
      ...selectedRecord,
      name: officialName,
      age: "0 months",
      isUnborn: false,
      unbornStatus: "born",
      status: "complete",
      growth: {
        weight: `${birthWeight.trim() || 3.3} kg`,
        length: `${birthLength.trim() || 51} cm`,
        waz: "+0.3 (Normal)",
      },
      immunization: {
        completedCount: 2,
        totalCount: 8,
        items: [
          { name: "BCG", status: "done", date: "Today (At Birth)" },
          { name: "OPV-0", status: "done", date: "Today (At Birth)" },
          { name: "Penta-1", status: "pending" },
          { name: "OPV-1", status: "pending" },
          { name: "PCV-1", status: "pending" },
          { name: "Penta-2", status: "pending" },
          { name: "Penta-3", status: "pending" },
          { name: "MMR-1", status: "pending" },
        ],
      },
    };

    api(`/children/${selectedRecord.chNumber}/birth`, {
      method: "POST",
      body: {
        name: officialName,
        dob: new Date(),
        sex: birthSex,
        birthWeight: Number(birthWeight || 3.3),
        birthLength: Number(birthLength || 51),
        birthHospital,
      },
    }).catch(() => {});

    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
    setBirthModalOpen(false);
    setBirthChildName("");

    Alert.alert("Birth Recorded!", `Child health record for ${officialName} is now fully active with at-birth BCG & OPV-0 initiated.`);
  };

  const openEditModal = (rec: ChildRecord) => {
    setEditName(rec.name);
    setEditAge(rec.age);
    setEditMother(rec.motherName);
    setEditWeight(rec.growth.weight);
    setEditLength(rec.growth.length);
    setEditWaz(rec.growth.waz);
    setEditVaxList(rec.immunization.items.map((i) => ({ ...i })));
    setEditModalVisible(true);
  };

  const toggleVaxStatus = (index: number) => {
    setEditVaxList((prev) => {
      const next = [...prev];
      const target = next[index];
      if (target.status === "done") {
        next[index] = { ...target, status: "pending", date: undefined };
      } else {
        const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        next[index] = { ...target, status: "done", date: todayStr };
      }
      return next;
    });
  };

  const handleSaveEdit = () => {
    if (!selectedRecord) return;
    if (!editName.trim()) {
      Alert.alert("Validation", "Child name cannot be empty.");
      return;
    }

    const completedCount = editVaxList.filter((v) => v.status === "done").length;
    const totalCount = editVaxList.length;
    const isComplete = completedCount === totalCount;

    const updated: ChildRecord = {
      ...selectedRecord,
      name: editName.trim(),
      age: editAge.trim() || selectedRecord.age,
      motherName: editMother.trim() || selectedRecord.motherName,
      status: isComplete ? "complete" : "attention",
      growth: {
        weight: editWeight.trim() || selectedRecord.growth.weight,
        length: editLength.trim() || selectedRecord.growth.length,
        waz: editWaz.trim() || selectedRecord.growth.waz,
      },
      immunization: {
        completedCount,
        totalCount,
        items: editVaxList,
      },
    };

    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
    setEditModalVisible(false);
    Alert.alert("Saved", `Record for ${updated.name} has been updated.`);
  };

  const openDeleteModal = () => {
    setDeleteReason("");
    setDeleteError("");
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteReason.trim()) {
      setDeleteError("A comment explaining the reason for deletion is mandatory.");
      return;
    }
    if (!selectedRecord) return;

    const targetName = selectedRecord.name;
    const reasonText = deleteReason.trim();

    api(`/children/${selectedRecord.chNumber}`, {
      method: "DELETE",
      body: { reason: reasonText },
    }).catch(() => {});

    setRecords((prev) => prev.filter((r) => r.id !== selectedRecord.id));
    setDeleteModalVisible(false);
    setSelectedRecord(null);
    setAuditNotice(`Record for "${targetName}" was deleted. Reason: ${reasonText}`);
    setTimeout(() => {
      setAuditNotice("");
    }, 6000);
  };

  return (
    <View style={nSt.container}>
      {/* Top Header */}
      <SafeAreaView edges={["top"]} style={nSt.headerSafe}>
        <View style={nSt.entryHeaderRow}>
          <Pressable
            onPress={() => (selectedRecord ? setSelectedRecord(null) : navigate("nursing-home"))}
            style={({ pressed }) => [nSt.backButtonCircle, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          <Text style={nSt.entryHeaderTitle}>Child Records</Text>

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
        {/* Deletion Audit Toast */}
        {!!auditNotice && (
          <View style={nSt.auditToastBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={nSt.auditToastText}>{auditNotice}</Text>
          </View>
        )}

        {selectedRecord ? (
          /* =================== DETAILED RECORD VIEW =================== */
          <View>
            {/* Back to Search Link */}
            <Pressable onPress={() => setSelectedRecord(null)} style={nSt.backToSearchBtn}>
              <Ionicons name="chevron-back" size={16} color={CARAMEL} />
              <Text style={nSt.backToSearchText}>Back to Search</Text>
            </Pressable>

            {/* Child Summary Card */}
            <View style={nSt.detailHeaderCard}>
              <View style={nSt.recordCardLeft}>
                <View style={nSt.recordAvatarBox}>
                  <Text style={{ fontSize: 26 }}>{selectedRecord.isUnborn ? "🤰" : "👶"}</Text>
                </View>
                <View style={nSt.recordInfoCol}>
                  <Text style={nSt.recordChildName}>{selectedRecord.name}</Text>
                  <Text style={nSt.recordSubInfo}>
                    {selectedRecord.chNumber} · {selectedRecord.age}
                  </Text>
                  <Text style={nSt.recordMotherInfo}>Mother: {selectedRecord.motherName}</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  nSt.detailStatusPill,
                  selectedRecord.isUnborn
                    ? { backgroundColor: "#FEF3C7" }
                    : selectedRecord.status === "complete"
                    ? { backgroundColor: "#DCFCE7" }
                    : { backgroundColor: "#FEF3C7" },
                ]}
              >
                <Text
                  style={[
                    nSt.detailStatusPillText,
                    selectedRecord.isUnborn
                      ? { color: "#D97706" }
                      : selectedRecord.status === "complete"
                      ? { color: "#16A34A" }
                      : { color: "#D97706" },
                  ]}
                >
                  {selectedRecord.isUnborn
                    ? "Pre-natal 🤰"
                    : selectedRecord.status === "complete"
                    ? "Complete ✓"
                    : "Attention ⚠"}
                </Text>
              </View>
            </View>

            {/* Assigned Midwife Card with Profile Link */}
            {selectedRecord.assignedMidwife && (
              <View style={nSt.midwifeAssignedBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 20 }}>👩‍⚕️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
                      PHM: {selectedRecord.assignedMidwife.name}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: "#64748B" }}>
                      {selectedRecord.assignedMidwife.badge || selectedRecord.assignedMidwife.area}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setProfileMidwife(selectedRecord.assignedMidwife || null)}
                  style={nSt.viewProfileBtn}
                >
                  <Text style={nSt.viewProfileBtnText}>View Profile</Text>
                </Pressable>
              </View>
            )}

            {/* If Unborn: Pre-natal Pregnancy Status Card & Record Birth Action */}
            {selectedRecord.isUnborn ? (
              <View>
                <View style={nSt.unbornCardBanner}>
                  <Text style={nSt.unbornCardTitle}>Pre-natal Child Record (Pregnancy Stage)</Text>
                  <Text style={nSt.unbornCardText}>
                    This child has not been born yet and is currently linked with mother {selectedRecord.motherName}'s
                    antenatal profile (EDD: {selectedRecord.edd || "Pending"}). Tap below when delivery happens to register
                    the child's official name and birth measurements.
                  </Text>
                </View>

                {/* Primary Action: Record Birth Event */}
                <Pressable
                  onPress={() => setBirthModalOpen(true)}
                  style={({ pressed }) => [nSt.recordBirthBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text style={nSt.recordBirthBtnText}>👶 Record Birth Event</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Immunization History Card */}
            <View style={nSt.detailSectionCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>
                  Immunization History
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: CARAMEL }}>
                  {selectedRecord.immunization.completedCount}/{selectedRecord.immunization.totalCount} complete
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={nSt.progressBarTrack}>
                <View
                  style={[
                    nSt.progressBarFill,
                    {
                      width: `${(selectedRecord.immunization.completedCount /
                        selectedRecord.immunization.totalCount) *
                        100}%`,
                    },
                  ]}
                />
              </View>

              {/* Vaccine Checklist Rows */}
              {selectedRecord.immunization.items.map((item, idx) => {
                const isLast = idx === selectedRecord.immunization.items.length - 1;
                const isDone = item.status === "done";

                return (
                  <View
                    key={item.name}
                    style={[nSt.vaxHistoryRow, isLast && { borderBottomWidth: 0 }]}
                  >
                    <View
                      style={[
                        nSt.vaxStatusIconBox,
                        isDone ? { backgroundColor: "#DCFCE7" } : { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={14} color="#16A34A" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={13} color="#D97706" />
                      )}
                    </View>

                    <Text style={nSt.vaxNameText}>{item.name}</Text>

                    <Text
                      style={[
                        nSt.vaxDateText,
                        !isDone && { color: "#D97706", fontWeight: "600" },
                      ]}
                    >
                      {item.date || "Pending"}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Growth Metrics Card */}
            <View style={nSt.detailSectionCard}>
              <View style={nSt.growthMetricRow}>
                <Text style={nSt.growthMetricLabel}>Latest Weight</Text>
                <Text style={nSt.growthMetricValue}>{selectedRecord.growth.weight}</Text>
              </View>

              <View style={nSt.growthMetricRow}>
                <Text style={nSt.growthMetricLabel}>Latest Length</Text>
                <Text style={nSt.growthMetricValue}>{selectedRecord.growth.length}</Text>
              </View>

              <View style={[nSt.growthMetricRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
                <Text style={nSt.growthMetricLabel}>WAZ</Text>
                <Text style={nSt.growthMetricValue}>{selectedRecord.growth.waz}</Text>
              </View>
            </View>

            {/* Actions: Edit & Delete Record */}
            <View style={nSt.detailActionRow}>
              <Pressable
                onPress={() => openEditModal(selectedRecord)}
                style={({ pressed }) => [nSt.detailEditBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={nSt.detailEditBtnText}>Edit Record</Text>
              </Pressable>

              <Pressable
                onPress={openDeleteModal}
                style={({ pressed }) => [nSt.detailDeleteBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text style={nSt.detailDeleteBtnText}>Delete Record</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* =================== LIST VIEW =================== */
          <View>
            {/* Search Input Bar */}
            <View style={nSt.childSearchBar}>
              <Ionicons name="search-outline" size={19} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={nSt.childSearchInput}
                placeholder="Child name, ID or mother..."
                placeholderTextColor="#94A3B8"
                value={q}
                onChangeText={setQ}
              />
            </View>

            {/* Notice Banner & "+ Register Mother & Child" Button */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <View style={[nSt.noticeBanner, { flex: 1, marginBottom: 0 }]}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#D97706" />
                <Text style={nSt.noticeBannerText}>Nurse Access: tap child to view, edit, or delete</Text>
              </View>
              <Pressable
                onPress={() => {
                  setRegStep("mother");
                  setRegModalOpen(true);
                }}
                style={({ pressed }) => [nSt.registerNewBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="person-add" size={15} color="#FFFFFF" />
                <Text style={nSt.registerNewBtnText}>+ Register</Text>
              </Pressable>
            </View>

            {/* Child Records List */}
            {filtered.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                <Text style={{ marginTop: 10, fontSize: 15, fontWeight: "700", color: "#64748B" }}>
                  No matching child records found
                </Text>
              </View>
            ) : (
              filtered.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedRecord(item)}
                  style={({ pressed }) => [nSt.recordCard, pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] }]}
                >
                  <View style={nSt.recordCardLeft}>
                    <View style={nSt.recordAvatarBox}>
                      <Text style={{ fontSize: 26 }}>{item.isUnborn ? "🤰" : "👶"}</Text>
                    </View>
                    <View style={nSt.recordInfoCol}>
                      <Text style={nSt.recordChildName}>{item.name}</Text>
                      <Text style={nSt.recordSubInfo}>
                        {item.age} · {item.chNumber}
                      </Text>
                      <Text style={nSt.recordMotherInfo}>Mother: {item.motherName}</Text>
                    </View>
                  </View>

                  {/* Right Status Icon & Chevron */}
                  <View style={nSt.recordCardRight}>
                    {item.isUnborn ? (
                      <View style={[nSt.statusCircleAttention, { backgroundColor: "#FEF3C7" }]}>
                        <Ionicons name="time" size={13} color="#D97706" />
                      </View>
                    ) : item.status === "complete" ? (
                      <View style={nSt.statusCircleComplete}>
                        <Ionicons name="checkmark" size={16} color="#16A34A" />
                      </View>
                    ) : (
                      <View style={nSt.statusCircleAttention}>
                        <Ionicons name="warning" size={13} color="#D97706" />
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= REGISTER MOTHER & CHILD MODAL ================= */}
      <Modal visible={regModalOpen} animationType="slide" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxHeight: "90%" }]}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={nSt.modalTitle}>Register Mother & Child</Text>
                <Text style={nSt.modalSubTitle}>MOH Clinic Intake & Midwife Area Allocation</Text>
              </View>
              <Pressable onPress={() => setRegModalOpen(false)} style={nSt.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Segment Tabs: Step 1 Mother | Step 2 Child */}
            <View style={nSt.segmentTabRow}>
              <Pressable
                onPress={() => setRegStep("mother")}
                style={[nSt.segmentTabBtn, regStep === "mother" && nSt.segmentTabBtnActive]}
              >
                <Text style={[nSt.segmentTabBtnText, regStep === "mother" && nSt.segmentTabBtnTextActive]}>
                  1. Mother Details
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRegStep("child")}
                style={[nSt.segmentTabBtn, regStep === "child" && nSt.segmentTabBtnActive]}
              >
                <Text style={[nSt.segmentTabBtnText, regStep === "child" && nSt.segmentTabBtnTextActive]}>
                  2. Child Registration
                </Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {regStep === "mother" ? (
                /* Step 1: Mother Form */
                <View>
                  <Text style={nSt.editFieldLabel}>MOTHER'S FULL NAME*</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={regMotherName}
                    onChangeText={setRegMotherName}
                    placeholder="e.g. Anoma Wickramasinghe"
                  />

                  <View style={nSt.editTwoColRow}>
                    <View style={nSt.editCol}>
                      <Text style={nSt.editFieldLabel}>NATIONAL ID (NIC)</Text>
                      <TextInput
                        style={nSt.editTextInput}
                        value={regNic}
                        onChangeText={setRegNic}
                        placeholder="e.g. 199371002341"
                      />
                    </View>
                    <View style={nSt.editCol}>
                      <Text style={nSt.editFieldLabel}>PHONE NUMBER</Text>
                      <TextInput
                        style={nSt.editTextInput}
                        value={regPhone}
                        onChangeText={setRegPhone}
                        placeholder="07xxxxxxxx"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <Text style={nSt.editFieldLabel}>VILLAGE / ADDRESS</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={regVillage}
                    onChangeText={setRegVillage}
                    placeholder="e.g. Pelwatte West, Colony 3"
                  />

                  {/* Area / Division Selection with Quick Chips */}
                  <Text style={nSt.editFieldLabel}>PHM AREA / DIVISION (FOR MIDWIFE ALLOCATION)</Text>
                  <View style={nSt.areaChipList}>
                    {SRI_LANKA_AREAS.map((areaName) => {
                      const isSel = regArea === areaName;
                      return (
                        <Pressable
                          key={areaName}
                          onPress={() => setRegArea(areaName)}
                          style={[nSt.areaSelectChip, isSel && nSt.areaSelectChipActive]}
                        >
                          <Text style={[nSt.areaSelectChipText, isSel && nSt.areaSelectChipTextActive]}>
                            {areaName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Automatic Midwife Suggestion Box */}
                  <View style={nSt.suggestedMidwifeBox}>
                    <View style={nSt.suggestedMidwifeHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>👩‍⚕️</Text>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: "#B45309" }}>
                          SUGGESTED MIDWIFE (BASED ON {regArea.toUpperCase()})
                        </Text>
                      </View>
                      <Pressable onPress={() => setProfileMidwife(suggestedMidwife)}>
                        <Text style={nSt.viewProfileLink}>View Profile ›</Text>
                      </Pressable>
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>
                      {suggestedMidwife.name} ({suggestedMidwife.staffId})
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                      {suggestedMidwife.badge} · Tel: {suggestedMidwife.phone}
                    </Text>
                  </View>

                  {/* Pregnancy Stage Selector */}
                  <Text style={nSt.editFieldLabel}>CURRENT MATERNAL STAGE</Text>
                  <View style={nSt.stagePickerRow}>
                    <Pressable
                      onPress={() => {
                        setRegStage("pregnant");
                        setRegChildIsUnborn(true);
                      }}
                      style={[nSt.stagePickerBtn, regStage === "pregnant" && nSt.stagePickerBtnActive]}
                    >
                      <Text style={[nSt.stagePickerBtnText, regStage === "pregnant" && nSt.stagePickerBtnTextActive]}>
                        🤰 Currently Pregnant (Pre-natal)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRegStage("postnatal");
                        setRegChildIsUnborn(false);
                      }}
                      style={[nSt.stagePickerBtn, regStage === "postnatal" && nSt.stagePickerBtnActive]}
                    >
                      <Text style={[nSt.stagePickerBtnText, regStage === "postnatal" && nSt.stagePickerBtnTextActive]}>
                        👶 Delivered (Postnatal)
                      </Text>
                    </Pressable>
                  </View>

                  {regStage === "pregnant" ? (
                    <View style={nSt.editTwoColRow}>
                      <View style={nSt.editCol}>
                        <Text style={nSt.editFieldLabel}>GESTATIONAL WEEKS</Text>
                        <TextInput
                          style={nSt.editTextInput}
                          value={regLmpWeeks}
                          onChangeText={setRegLmpWeeks}
                          placeholder="e.g. 28 weeks"
                        />
                      </View>
                      <View style={nSt.editCol}>
                        <Text style={nSt.editFieldLabel}>EXPECTED DELIVERY (EDD)</Text>
                        <TextInput
                          style={nSt.editTextInput}
                          value={regEdd}
                          onChangeText={setRegEdd}
                          placeholder="e.g. Nov 2026"
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* Step 2: Child Form */
                <View>
                  {regStage === "pregnant" ? (
                    <View>
                      <View style={nSt.unbornCardBanner}>
                        <Text style={nSt.unbornCardTitle}>Pre-natal Child Record</Text>
                        <Text style={nSt.unbornCardText}>
                          Because the child has not been born yet, they do not have an official name. The child will be
                          registered as "Baby of {regMotherName || "Mother"}" linked with the mother's antenatal records.
                          Once delivery occurs, use "Record Birth" to record the official name and birth metrics.
                        </Text>
                      </View>

                      <Text style={nSt.editFieldLabel}>WORKING LABEL (OPTIONAL)</Text>
                      <TextInput
                        style={nSt.editTextInput}
                        value={regChildName}
                        onChangeText={setRegChildName}
                        placeholder={`Baby of ${regMotherName || "Mother"}`}
                      />
                    </View>
                  ) : (
                    <View>
                      <Text style={nSt.editFieldLabel}>CHILD'S FULL NAME*</Text>
                      <TextInput
                        style={nSt.editTextInput}
                        value={regChildName}
                        onChangeText={setRegChildName}
                        placeholder="e.g. Kavindu Jayawardena"
                      />

                      <View style={nSt.editTwoColRow}>
                        <View style={nSt.editCol}>
                          <Text style={nSt.editFieldLabel}>DATE OF BIRTH</Text>
                          <TextInput
                            style={nSt.editTextInput}
                            value={regChildDob}
                            onChangeText={setRegChildDob}
                            placeholder="e.g. Sep 12, 2024"
                          />
                        </View>
                        <View style={nSt.editCol}>
                          <Text style={nSt.editFieldLabel}>GENDER</Text>
                          <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                            <Pressable
                              onPress={() => setRegChildSex("male")}
                              style={[
                                nSt.areaSelectChip,
                                regChildSex === "male" && nSt.areaSelectChipActive,
                                { flex: 1, alignItems: "center" },
                              ]}
                            >
                              <Text style={[nSt.areaSelectChipText, regChildSex === "male" && nSt.areaSelectChipTextActive]}>
                                Male
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => setRegChildSex("female")}
                              style={[
                                nSt.areaSelectChip,
                                regChildSex === "female" && nSt.areaSelectChipActive,
                                { flex: 1, alignItems: "center" },
                              ]}
                            >
                              <Text style={[nSt.areaSelectChipText, regChildSex === "female" && nSt.areaSelectChipTextActive]}>
                                Female
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>

                      <View style={nSt.editTwoColRow}>
                        <View style={nSt.editCol}>
                          <Text style={nSt.editFieldLabel}>BIRTH WEIGHT (KG)</Text>
                          <TextInput
                            style={nSt.editTextInput}
                            value={regBirthWeight}
                            onChangeText={setRegBirthWeight}
                            placeholder="e.g. 3.2"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={nSt.editCol}>
                          <Text style={nSt.editFieldLabel}>BIRTH LENGTH (CM)</Text>
                          <TextInput
                            style={nSt.editTextInput}
                            value={regBirthLength}
                            onChangeText={setRegBirthLength}
                            placeholder="e.g. 50"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              {regStep === "mother" ? (
                <>
                  <Pressable onPress={() => setRegModalOpen(false)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                    <Text style={nSt.modalCancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!regMotherName.trim()) {
                        Alert.alert("Required", "Mother's name is required before proceeding.");
                        return;
                      }
                      setRegStep("child");
                    }}
                    style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: CARAMEL }]}
                  >
                    <Text style={nSt.modalSubmitBtnText}>Next: Child ›</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setRegStep("mother")} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                    <Text style={nSt.modalCancelBtnText}>‹ Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCompleteRegistration}
                    style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: CARAMEL }]}
                  >
                    <Text style={nSt.modalSubmitBtnText}>Complete Intake</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= RECORD BIRTH MODAL (FOR UNBORN CHILDREN) ================= */}
      <Modal visible={birthModalOpen} animationType="slide" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxWidth: 440 }]}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={nSt.modalTitle}>👶 Record Newborn Birth</Text>
                <Text style={nSt.modalSubTitle}>
                  Mother: {selectedRecord?.motherName} ({selectedRecord?.chNumber})
                </Text>
              </View>
              <Pressable onPress={() => setBirthModalOpen(false)} style={nSt.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={nSt.editFieldLabel}>OFFICIAL CHILD NAME*</Text>
              <TextInput
                style={nSt.editTextInput}
                value={birthChildName}
                onChangeText={setBirthChildName}
                placeholder="e.g. Kavindu Jayawardena"
              />

              <View style={nSt.editTwoColRow}>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>DATE / TIME OF BIRTH</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={birthDob}
                    onChangeText={setBirthDob}
                    placeholder="e.g. Today, 09:30 AM"
                  />
                </View>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>GENDER</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    <Pressable
                      onPress={() => setBirthSex("male")}
                      style={[
                        nSt.areaSelectChip,
                        birthSex === "male" && nSt.areaSelectChipActive,
                        { flex: 1, alignItems: "center" },
                      ]}
                    >
                      <Text style={[nSt.areaSelectChipText, birthSex === "male" && nSt.areaSelectChipTextActive]}>
                        Male
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setBirthSex("female")}
                      style={[
                        nSt.areaSelectChip,
                        birthSex === "female" && nSt.areaSelectChipActive,
                        { flex: 1, alignItems: "center" },
                      ]}
                    >
                      <Text style={[nSt.areaSelectChipText, birthSex === "female" && nSt.areaSelectChipTextActive]}>
                        Female
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={nSt.editTwoColRow}>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>BIRTH WEIGHT (KG)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={birthWeight}
                    onChangeText={setBirthWeight}
                    placeholder="e.g. 3.3"
                    keyboardType="numeric"
                  />
                </View>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>BIRTH LENGTH (CM)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={birthLength}
                    onChangeText={setBirthLength}
                    placeholder="e.g. 51"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={nSt.editFieldLabel}>DELIVERY HOSPITAL / CLINIC</Text>
              <TextInput
                style={nSt.editTextInput}
                value={birthHospital}
                onChangeText={setBirthHospital}
                placeholder="e.g. Monaragala Base Hospital"
              />

              <View
                style={{
                  backgroundColor: "#ECFDF5",
                  padding: 10,
                  borderRadius: 12,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "#A7F3D0",
                }}
              >
                <Text style={{ fontSize: 11.5, color: "#047857", fontWeight: "700" }}>
                  ✓ Sri Lanka National Immunization Schedule: At-birth BCG and OPV-0 vaccines will be automatically
                  initialized upon saving.
                </Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setBirthModalOpen(false)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRecordBirth}
                style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: "#059669" }]}
              >
                <Text style={nSt.modalSubmitBtnText}>Activate Record</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= EDIT RECORD MODAL ================= */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={nSt.modalOverlay}>
          <View style={nSt.modalContainer}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={nSt.modalTitle}>Edit Child Record</Text>
                <Text style={nSt.modalSubTitle}>{selectedRecord?.chNumber}</Text>
              </View>
              <Pressable onPress={() => setEditModalVisible(false)} style={nSt.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={nSt.editFieldLabel}>CHILD NAME</Text>
              <TextInput
                style={nSt.editTextInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
              />

              <View style={nSt.editTwoColRow}>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>AGE</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editAge}
                    onChangeText={setEditAge}
                    placeholder="e.g. 8 months"
                  />
                </View>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>MOTHER'S NAME</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editMother}
                    onChangeText={setEditMother}
                    placeholder="Mother Name"
                  />
                </View>
              </View>

              <Text style={[nSt.editFieldLabel, { marginTop: 16 }]}>GROWTH METRICS</Text>
              <View style={nSt.editTwoColRow}>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>WEIGHT</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    placeholder="e.g. 8.2 kg"
                  />
                </View>
                <View style={nSt.editCol}>
                  <Text style={nSt.editFieldLabel}>LENGTH</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editLength}
                    onChangeText={setEditLength}
                    placeholder="e.g. 72 cm"
                  />
                </View>
              </View>
              <Text style={nSt.editFieldLabel}>WAZ STATUS</Text>
              <TextInput
                style={nSt.editTextInput}
                value={editWaz}
                onChangeText={setEditWaz}
                placeholder="e.g. +0.4 (Normal)"
              />

              <Text style={[nSt.editFieldLabel, { marginTop: 16 }]}>
                IMMUNIZATION DOSES (TAP TO TOGGLE)
              </Text>
              {editVaxList.map((vax, idx) => {
                const isDone = vax.status === "done";
                return (
                  <Pressable
                    key={vax.name}
                    onPress={() => toggleVaxStatus(idx)}
                    style={nSt.vaxEditToggleRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0F172A" }}>
                        {vax.name}
                      </Text>
                      {isDone && !!vax.date && (
                        <Text style={{ fontSize: 11.5, color: "#64748B" }}>Date: {vax.date}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        nSt.vaxToggleBtn,
                        isDone ? { backgroundColor: "#DCFCE7" } : { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <Ionicons
                        name={isDone ? "checkmark-circle" : "time-outline"}
                        size={15}
                        color={isDone ? "#16A34A" : "#D97706"}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isDone ? "#16A34A" : "#D97706",
                        }}
                      >
                        {isDone ? "Completed" : "Pending"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={() => setEditModalVisible(false)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: CARAMEL }]}>
                <Text style={nSt.modalSubmitBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= DELETE CONFIRMATION MODAL WITH MANDATORY COMMENT ================= */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxWidth: 440 }]}>
            <View style={nSt.deleteAlertIconBox}>
              <Ionicons name="trash" size={26} color="#DC2626" />
            </View>

            <Text style={[nSt.modalTitle, { textAlign: "center", marginBottom: 6 }]}>
              Delete Child Record
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginBottom: 14 }}>
              Are you sure you want to delete the clinical record for{" "}
              <Text style={{ fontWeight: "700", color: "#0F172A" }}>{selectedRecord?.name}</Text> (
              {selectedRecord?.chNumber})? This action cannot be reversed.
            </Text>

            <Text style={nSt.editFieldLabel}>
              REASON FOR DELETION (MANDATORY COMMENT)*
            </Text>

            {/* Quick chips to quickly select reason */}
            <View style={nSt.quickChipsRow}>
              {QUICK_DELETE_REASONS.map((chip) => {
                const isSelected = deleteReason === chip;
                return (
                  <Pressable
                    key={chip}
                    onPress={() => {
                      setDeleteReason(chip);
                      setDeleteError("");
                    }}
                    style={[nSt.quickChip, isSelected && nSt.quickChipActive]}
                  >
                    <Text style={[nSt.quickChipText, isSelected && nSt.quickChipTextActive]}>
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={[
                nSt.deleteInputMulti,
                !!deleteError && { borderColor: "#DC2626" },
              ]}
              multiline
              numberOfLines={3}
              value={deleteReason}
              onChangeText={(t) => {
                setDeleteReason(t);
                if (deleteError) setDeleteError("");
              }}
              placeholder="Explain why this record is being deleted (required)..."
              placeholderTextColor="#94A3B8"
            />

            {!!deleteError && (
              <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "600", marginTop: 4 }}>
                {deleteError}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={() => setDeleteModalVisible(false)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={[
                  nSt.modalSubmitBtn,
                  { flex: 1, backgroundColor: "#DC2626" },
                  !deleteReason.trim() && { opacity: 0.5 },
                ]}
              >
                <Text style={nSt.modalSubmitBtnText}>Confirm Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MIDWIFE PROFILE MODAL ================= */}
      <MidwifeProfileModal
        visible={!!profileMidwife}
        onClose={() => setProfileMidwife(null)}
        midwife={profileMidwife}
      />

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
    backgroundColor: "rgba(255, 255, 255, 0.18)",
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
    backgroundColor: "rgba(255, 255, 255, 0.18)",
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
    backgroundColor: "rgba(255, 255, 255, 0.18)",
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
    backgroundColor: "rgba(255, 255, 255, 0.18)",
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

  /* --- Nursing Records (Search & Details) --- */
  childSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  childSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    padding: 0,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  noticeBannerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#B45309",
    flex: 1,
  },
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  recordCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  recordAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  recordInfoCol: {
    flex: 1,
    gap: 2,
  },
  recordChildName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  recordSubInfo: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  recordMotherInfo: {
    fontSize: 12,
    color: "#94A3B8",
  },
  recordCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusCircleComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCircleAttention: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  backToSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backToSearchText: {
    fontSize: 14,
    fontWeight: "700",
    color: CARAMEL,
  },
  detailHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  detailStatusPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  detailSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    marginTop: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 3,
  },
  vaxHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  vaxStatusIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vaxNameText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  vaxDateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  growthMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  growthMetricLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#64748B",
  },
  growthMetricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  /* Action Buttons (Edit & Delete) */
  detailActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  detailEditBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: CARAMEL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: CARAMEL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  detailEditBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  detailDeleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailDeleteBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  editTextInput: {
    height: 46,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  editTwoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  editCol: {
    flex: 1,
  },
  vaxEditToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  vaxToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalCancelBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  modalSubmitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Delete Modal Specifics */
  deleteAlertIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    marginTop: 2,
  },
  quickChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickChipActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  quickChipTextActive: {
    color: "#B45309",
    fontWeight: "700",
  },
  deleteInputMulti: {
    height: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  auditToastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  auditToastText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#991B1B",
    flex: 1,
    lineHeight: 18,
  },

  /* Registration & Pre-natal UI */
  registerNewBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: CARAMEL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: CARAMEL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  registerNewBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  midwifeAssignedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  viewProfileBtn: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewProfileBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  unbornCardBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  unbornCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B45309",
    marginBottom: 4,
  },
  unbornCardText: {
    fontSize: 12.5,
    color: "#92400E",
    lineHeight: 18,
  },
  recordBirthBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  recordBirthBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTabRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segmentTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentTabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentTabBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentTabBtnTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  suggestedMidwifeBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
  },
  suggestedMidwifeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  viewProfileLink: {
    color: CARAMEL,
    fontSize: 12,
    fontWeight: "700",
  },
  areaChipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 8,
  },
  areaSelectChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  areaSelectChipActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  areaSelectChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  areaSelectChipTextActive: {
    color: "#B45309",
    fontWeight: "700",
  },
  stagePickerRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 6,
  },
  stagePickerBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  stagePickerBtnActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  stagePickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  stagePickerBtnTextActive: {
    color: "#B45309",
    fontWeight: "800",
  },
});

