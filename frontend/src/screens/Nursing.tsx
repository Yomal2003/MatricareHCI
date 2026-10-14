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

export type QueuePatient = {
  _id?: string;
  id?: string;
  token: number;
  childName: string;
  childId?: string;
  age: string;
  motherName: string;
  type: "Vaccination" | "Growth" | "Both";
  status: "done" | "now-serving" | "calling" | "waiting";
  notes?: string;
};

export type ActivePatient = {
  id?: string;
  token?: number;
  childName: string;
  childId: string;
  age: string;
  motherName: string;
  motherId?: string;
  type?: string;
  isPregnant?: boolean;
  weeks?: number;
};

let currentActivePatient: ActivePatient = {
  token: 4,
  childName: "Senali Weerasinghe",
  childId: "CH-2024-0091",
  age: "9 months",
  motherName: "Nilanthi Weerasinghe",
  type: "Both",
  isPregnant: false,
};

export function setActivePatient(patient: ActivePatient) {
  currentActivePatient = patient;
}

export function getActivePatient(): ActivePatient {
  return currentActivePatient;
}

const INITIAL_QUEUE: QueuePatient[] = [
  { token: 1, childName: "Ravindu Perera", age: "8m", motherName: "Chamari Perera", type: "Vaccination", status: "done" },
  { token: 2, childName: "Malithi Silva", age: "14m", motherName: "Sandya Silva", type: "Growth", status: "done" },
  { token: 3, childName: "Thishara Bandara", age: "6m", motherName: "Tharaka Bandara", type: "Vaccination", status: "done" },
  { token: 4, childName: "Senali Weerasinghe", age: "9m", motherName: "Nilanthi Weerasinghe", type: "Both", status: "now-serving" },
  { token: 5, childName: "Kavindi Rathnayake", age: "12m", motherName: "Kumari Rathnayake", type: "Vaccination", status: "waiting" },
  { token: 6, childName: "Hirunika Dissanayake", age: "4m", motherName: "Kalyani Dissanayake", type: "Vaccination", status: "waiting" },
];

const CARAMEL = "#AF5819";
const CARAMEL_DARK = "#964612";
const CARAMEL_LIGHT = "#FEF3C7";

export function NursingHome() {
  const { navigate, setShowLanguageModal } = useApp();
  const [queue, setQueue] = useState<QueuePatient[]>(INITIAL_QUEUE);
  const [callingPatient, setCallingPatient] = useState<QueuePatient | null>(null);
  const [activeHomeTab, setActiveHomeTab] = useState<"queue" | "requests">("queue");

  // Appointment Requests State for Clinic
  const [clinicRequests, setClinicRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [nurseStatusMsg, setNurseStatusMsg] = useState("");

  // Reschedule & Reject Modal State in Nursing
  const [nurseRescheduleTarget, setNurseRescheduleTarget] = useState<any | null>(null);
  const [nurseRescheduleDate, setNurseRescheduleDate] = useState("");
  const [nurseRescheduleNotes, setNurseRescheduleNotes] = useState("");
  const [nurseRejectTarget, setNurseRejectTarget] = useState<any | null>(null);
  const [nurseRejectReason, setNurseRejectReason] = useState("");

  // Add Patient to Queue Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [availableMothers, setAvailableMothers] = useState<any[]>([]);
  const [motherSearchQuery, setMotherSearchQuery] = useState("");
  const [selectedMotherForQueue, setSelectedMotherForQueue] = useState<any | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newMotherName, setNewMotherName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newType, setNewType] = useState<"Vaccination" | "Growth" | "Both">("Vaccination");

  // Load registered mothers for auto-suggestions
  const loadAvailableMothers = React.useCallback(async () => {
    try {
      const data = await api<any[]>("/mothers");
      if (Array.isArray(data)) setAvailableMothers(data);
    } catch {}
  }, []);

  // Load Queue from Server
  const loadQueue = React.useCallback(async () => {
    try {
      const data = await api<QueuePatient[]>("/queue");
      if (Array.isArray(data) && data.length > 0) {
        const seen = new Set();
        const unique = data.filter((item) => {
          const key = item._id || item.id || String(item.token);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setQueue(unique);
        const calling = unique.find((p) => p.status === "calling");
        if (calling) setCallingPatient(calling);
      }
    } catch {
      // Offline fallback to current state
    }
  }, []);

  // Load Appointment Requests for Clinic
  const loadClinicRequests = React.useCallback(async () => {
    setLoadingRequests(true);
    setRequestsError("");
    try {
      const list = await api<any[]>("/appointments?targetRole=nursing");
      if (Array.isArray(list)) setClinicRequests(list);
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : "Could not load clinic requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadClinicRequests();
    loadAvailableMothers();
    const interval = setInterval(() => {
      loadQueue();
      loadClinicRequests();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadQueue, loadClinicRequests, loadAvailableMothers]);

  const handleNurseAcceptRequest = async (appt: any) => {
    setRequestsError("");
    setNurseStatusMsg("");
    try {
      const res = await api<any>(`/appointments/${encodeURIComponent(appt._id)}/accept`, { method: "PATCH", body: {} });
      setNurseStatusMsg(`Clinic appointment confirmed for ${appt.mother?.name || "Patient"}. Added to today's live queue!`);
      setClinicRequests((prev) => prev.filter((r) => r._id !== appt._id));
      await loadClinicRequests();
      await loadQueue();
      setActiveHomeTab("queue");
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : "Failed to accept appointment.");
    }
  };

  const handleNurseRejectRequest = async () => {
    if (!nurseRejectTarget) return;
    setRequestsError("");
    try {
      await api(`/appointments/${encodeURIComponent(nurseRejectTarget._id)}/reject`, {
        method: "PATCH",
        body: { reason: nurseRejectReason.trim() || "Clinic capacity full on requested date" },
      });
      setNurseRejectTarget(null);
      setNurseRejectReason("");
      setNurseStatusMsg("Appointment request rejected.");
      await loadClinicRequests();
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : "Failed to reject appointment.");
    }
  };

  const handleNurseRescheduleRequest = async () => {
    if (!nurseRescheduleTarget || !nurseRescheduleDate.trim()) {
      Alert.alert("Date Required", "Please specify a new appointment date & time.");
      return;
    }
    setRequestsError("");
    try {
      await api(`/appointments/${encodeURIComponent(nurseRescheduleTarget._id)}/reschedule`, {
        method: "PATCH",
        body: { date: nurseRescheduleDate.trim(), notes: nurseRescheduleNotes.trim() },
      });
      setNurseRescheduleTarget(null);
      setNurseRescheduleDate("");
      setNurseRescheduleNotes("");
      setNurseStatusMsg("New appointment schedule sent to mother.");
      await loadClinicRequests();
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : "Failed to reschedule appointment.");
    }
  };

  const doneCount = queue.filter((x) => x.status === "done").length;
  const remainingCount = queue.filter((x) => x.status !== "done").length;
  const serving = queue.find((x) => x.status === "now-serving" || x.status === "calling") || queue.find((x) => x.status === "waiting");

  // Call Specific Token (Announce token call)
  const handleCallToken = async (item: QueuePatient) => {
    const key = item._id || item.id || String(item.token);
    try {
      await api(`/queue/${key}/call`, { method: "POST" });
    } catch (err) {
      console.warn("Queue call error:", err);
    }

    setCallingPatient(item);
    setQueue((prev) =>
      prev.map((q) =>
        q.token === item.token
          ? { ...q, status: "calling" }
          : q.status === "calling"
          ? { ...q, status: "waiting" }
          : q
      )
    );
    await loadQueue();
  };

  // Call Next Waiting Token
  const handleCallNextWaiting = async () => {
    const nextWaiting = queue.find((x) => x.status === "waiting");
    if (!nextWaiting) {
      Alert.alert("Queue", "No patients are currently waiting in the queue.");
      return;
    }
    await handleCallToken(nextWaiting);
  };

  // Advance Patient Status (to now-serving or done)
  const handleUpdateStatus = async (item: QueuePatient, newStatus: "now-serving" | "done") => {
    const key = item._id || item.id || String(item.token);
    try {
      await api(`/queue/${key}`, { method: "PATCH", body: { status: newStatus } });
    } catch (err) {
      console.warn("Queue update error:", err);
    }

    if (newStatus === "now-serving" || newStatus === "done") {
      if (callingPatient?.token === item.token) {
        setCallingPatient(null);
      }
    }

    setQueue((prev) =>
      prev.map((q) => {
        if (q.token === item.token) return { ...q, status: newStatus };
        if (newStatus === "now-serving" && (q.status === "now-serving" || q.status === "calling")) {
          return { ...q, status: "done" };
        }
        return q;
      })
    );
    await loadQueue();
  };

  // Start Clinical Entry for selected patient
  const handleStartEntry = (item: QueuePatient) => {
    const isPregnant = Boolean(
      item.notes?.toLowerCase().includes("pregnant") ||
      item.notes?.toLowerCase().includes("prenatal") ||
      item.childName?.toLowerCase().startsWith("baby of") ||
      item.age?.toLowerCase().includes("gestation") ||
      item.age?.toLowerCase().includes("pre-natal") ||
      item.age?.toLowerCase().includes("unborn")
    );
    const parsedWeeks = item.age?.match(/(\d+)\s*w/i)?.[1];
    setActivePatient({
      id: item._id || item.id,
      token: item.token,
      childName: item.childName,
      childId: item.childId || `CH-2024-${String(item.token + 85).padStart(4, "0")}`,
      age: item.age,
      motherName: item.motherName,
      motherId: (item as any).motherId || (item as any).mother?._id || (item as any).mother?.code,
      type: item.type,
      isPregnant,
      weeks: parsedWeeks ? Number(parsedWeeks) : undefined,
    });
    navigate("nursing-entry");
  };

  // Select a suggested mother for queue
  const handleSelectMotherForQueue = (m: any) => {
    setSelectedMotherForQueue(m);
    setNewMotherName(m.name);
    if (m.status === "pregnant") {
      setNewChildName(`Baby of ${m.name}`);
      setNewAge(m.weeks ? `${m.weeks}w gestation` : "28w gestation");
      setNewType("Vaccination");
    } else {
      setNewChildName("");
      setNewAge("6m");
      setNewType("Vaccination");
    }
  };

  const handleClearSelectedMother = () => {
    setSelectedMotherForQueue(null);
    setNewMotherName("");
    setNewChildName("");
    setNewAge("");
  };

  // Add Patient to Queue Handler
  const handleAddToQueue = async () => {
    if (!newChildName.trim()) {
      Alert.alert("Validation", "Please enter the child's name or select a registered mother.");
      return;
    }

    const payload = {
      childName: newChildName.trim(),
      motherName: newMotherName.trim() || (selectedMotherForQueue?.name ?? "Mother"),
      age: newAge.trim() || (selectedMotherForQueue?.status === "pregnant" ? "28w gestation" : "6 months"),
      type: newType,
      mother: selectedMotherForQueue?._id || selectedMotherForQueue?.id,
    };

    try {
      const created = await api<QueuePatient>("/queue", { method: "POST", body: payload });
      if (created) {
        setQueue((prev) => [...prev, created]);
        Alert.alert("Token Issued", `Token #${created.token} issued to ${created.childName}.`);
      }
    } catch {
      const nextTok = queue.length > 0 ? Math.max(...queue.map((q) => q.token)) + 1 : 1;
      const fallbackEntry: QueuePatient = {
        token: nextTok,
        childName: newChildName.trim(),
        motherName: newMotherName.trim() || "Mother",
        age: newAge.trim() || "6 months",
        type: newType,
        status: "waiting",
      };
      setQueue((prev) => [...prev, fallbackEntry]);
      Alert.alert("Token Issued", `Token #${nextTok} issued (Offline mode).`);
    }

    setAddModalOpen(false);
    setSelectedMotherForQueue(null);
    setMotherSearchQuery("");
    setNewChildName("");
    setNewMotherName("");
    setNewAge("");
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
        {/* Token Calling Announcement Banner */}
        {callingPatient && (
          <View style={nSt.callBannerContainer}>
            <View style={nSt.callBannerHeader}>
              <View style={nSt.callBannerIconBox}>
                <Ionicons name="volume-high" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={nSt.callBannerTitle}>
                  NOW CALLING TOKEN #{callingPatient.token} 📢
                </Text>
                <Text style={nSt.callBannerSub}>
                  {callingPatient.childName} ({callingPatient.age}) · Mother: {callingPatient.motherName}
                </Text>
                <Text style={nSt.callBannerRoom}>CLINIC ROOM 1 · VACCINATION & GROWTH CHECK</Text>
              </View>
            </View>
            <View style={nSt.callBannerBtnRow}>
              <Pressable
                onPress={() => handleUpdateStatus(callingPatient, "now-serving")}
                style={({ pressed }) => [nSt.callBannerBtnServe, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="hand-right" size={15} color="#FFFFFF" />
                <Text style={nSt.callBannerBtnServeText}>Now Serving</Text>
              </Pressable>
              <Pressable
                onPress={() => handleStartEntry(callingPatient)}
                style={({ pressed }) => [nSt.callBannerBtnEntry, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="create" size={15} color="#AF5819" />
                <Text style={nSt.callBannerBtnEntryText}>Start Entry →</Text>
              </Pressable>
              <Pressable
                onPress={() => setCallingPatient(null)}
                style={({ pressed }) => [nSt.callBannerBtnDismiss, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Row of 3 Metric Cards */}
        <View style={nSt.metricsRow}>
          <View style={nSt.metricCard}>
            <Text style={[nSt.metricNumber, { color: "#10B981" }]}>{doneCount}</Text>
            <Text style={nSt.metricLabel}>Done</Text>
          </View>
          <View style={nSt.metricCard}>
            <Text style={[nSt.metricNumber, { color: "#D97706" }]}>{remainingCount}</Text>
            <Text style={nSt.metricLabel}>Remaining</Text>
          </View>
          <View style={nSt.metricCard}>
            <Text style={[nSt.metricNumber, { color: "#6366F1" }]}>8m</Text>
            <Text style={nSt.metricLabel}>Avg time</Text>
          </View>
        </View>

        {/* Quick Action Buttons Row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <Pressable
            onPress={handleCallNextWaiting}
            style={({ pressed }) => [nSt.callNextQuickBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="megaphone" size={16} color="#FFFFFF" />
            <Text style={nSt.callNextQuickBtnText}>Call Next Patient</Text>
          </Pressable>

          <Pressable
            onPress={() => setAddModalOpen(true)}
            style={({ pressed }) => [nSt.addQueueQuickBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="person-add" size={16} color="#AF5819" />
            <Text style={nSt.addQueueQuickBtnText}>+ Add to Queue</Text>
          </Pressable>
        </View>

        {/* NOW SERVING Hero Card */}
        {serving && (
          <View style={nSt.servingCard}>
            {/* Giant watermark number in the background */}
            <Text style={nSt.watermarkText}>{serving.token}</Text>

            {/* Indicator */}
            <View style={nSt.servingIndicatorRow}>
              <View style={nSt.servingDot} />
              <Text style={nSt.servingIndicatorText}>
                {serving.status === "calling" ? "CALLING PATIENT" : "CURRENTLY SERVING"}
              </Text>
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
                <Text style={nSt.servingMotherName}>Mother: {serving.motherName}</Text>
                <View style={nSt.servingTagPill}>
                  <Text style={nSt.servingTagText}>{serving.type}</Text>
                </View>
              </View>
            </View>

            {/* CTA Buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => handleStartEntry(serving)}
                style={({ pressed }) => [nSt.startEntryBtn, { flex: 1 }, pressed && { opacity: 0.9 }]}
              >
                <Text style={nSt.startEntryBtnText}>Start Entry →</Text>
              </Pressable>
              {serving.status !== "done" && (
                <Pressable
                  onPress={() => handleUpdateStatus(serving, "done")}
                  style={({ pressed }) => [nSt.markDoneHeroBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={nSt.markDoneHeroBtnText}>Done</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Tab Toggle: Today's Queue vs Appointment Requests */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <Pressable
            onPress={() => setActiveHomeTab("queue")}
            style={[
              nSt.areaSelectChip,
              activeHomeTab === "queue" && nSt.areaSelectChipActive,
              { flex: 1, alignItems: "center", paddingVertical: 10 },
            ]}
          >
            <Text style={[nSt.areaSelectChipText, activeHomeTab === "queue" && nSt.areaSelectChipTextActive]}>
              📋 Live Queue ({queue.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveHomeTab("requests")}
            style={[
              nSt.areaSelectChip,
              activeHomeTab === "requests" && nSt.areaSelectChipActive,
              { flex: 1, alignItems: "center", paddingVertical: 10 },
            ]}
          >
            <Text style={[nSt.areaSelectChipText, activeHomeTab === "requests" && nSt.areaSelectChipTextActive]}>
              📅 Clinic Requests ({clinicRequests.length})
            </Text>
          </Pressable>
        </View>

        {activeHomeTab === "queue" ? (
          <>
            {/* Section Title */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[nSt.sectionHeader, { marginBottom: 0 }]}>TODAY'S QUEUE ({queue.length})</Text>
              <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Tap speaker to call token</Text>
            </View>

            {/* Queue Items List */}
            {queue.map((item, idx) => {
              const isDone = item.status === "done";
              const isServing = item.status === "now-serving";
              const isCalling = item.status === "calling";

              return (
                <View key={item._id || item.id || `queue-token-${item.token}-${idx}`} style={[nSt.queueCard, isCalling && nSt.queueCardCalling]}>
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
                    ) : isCalling ? (
                      <View style={[nSt.servingBadgeSquare, { backgroundColor: "#EA580C" }]}>
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

                  {/* Action Buttons for Queue Card */}
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    {!isDone && (
                      <Pressable
                        onPress={() => handleCallToken(item)}
                        style={({ pressed }) => [
                          nSt.callTokenIconBtn,
                          isCalling && { backgroundColor: "#EA580C" },
                          pressed && { opacity: 0.75 },
                        ]}
                        accessibilityLabel="Call Token"
                      >
                        <Ionicons name="volume-high" size={17} color={isCalling ? "#FFFFFF" : "#AF5819"} />
                      </Pressable>
                    )}

                    {isServing ? (
                      <>
                        <Pressable
                          onPress={() => handleStartEntry(item)}
                          style={({ pressed }) => [nSt.actionSquareButton, pressed && { opacity: 0.8 }]}
                          accessibilityLabel="Clinical Entry"
                        >
                          <Ionicons name="create-outline" size={19} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleUpdateStatus(item, "done")}
                          style={({ pressed }) => [
                            nSt.actionCircleButton,
                            { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
                            pressed && { opacity: 0.8 },
                          ]}
                          accessibilityLabel="Mark Done"
                        >
                          <Ionicons name="checkmark-done" size={17} color="#16A34A" />
                        </Pressable>
                      </>
                    ) : isCalling ? (
                      <>
                        <Pressable
                          onPress={() => handleUpdateStatus(item, "now-serving")}
                          style={({ pressed }) => [
                            nSt.actionCircleButton,
                            { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
                            pressed && { opacity: 0.8 },
                          ]}
                          accessibilityLabel="Now Serving"
                        >
                          <Ionicons name="play" size={16} color="#D97706" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleStartEntry(item)}
                          style={({ pressed }) => [nSt.actionSquareButton, pressed && { opacity: 0.8 }]}
                          accessibilityLabel="Clinical Entry"
                        >
                          <Ionicons name="create-outline" size={19} color="#FFFFFF" />
                        </Pressable>
                      </>
                    ) : isDone ? (
                      <Pressable
                        onPress={() => handleStartEntry(item)}
                        style={({ pressed }) => [nSt.actionCircleButton, pressed && { opacity: 0.8 }]}
                        accessibilityLabel="Review Record"
                      >
                        <Ionicons name="eye-outline" size={17} color="#64748B" />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleUpdateStatus(item, "now-serving")}
                        style={({ pressed }) => [nSt.actionCircleButton, pressed && { opacity: 0.8 }]}
                        accessibilityLabel="Serve Now"
                      >
                        <Ionicons name="play" size={16} color="#AF5819" />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          /* ================= CLINIC APPOINTMENT REQUESTS ================= */
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[nSt.sectionHeader, { marginBottom: 0 }]}>APPOINTMENT REQUESTS ({clinicRequests.length})</Text>
              <Pressable onPress={loadClinicRequests}>
                <Ionicons name="refresh" size={18} color={CARAMEL} />
              </Pressable>
            </View>

            {requestsError ? <Text style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{requestsError}</Text> : null}
            {nurseStatusMsg ? <Text style={{ color: "#16A34A", fontSize: 12, marginBottom: 8, fontWeight: "700" }}>{nurseStatusMsg}</Text> : null}

            {loadingRequests && !clinicRequests.length ? (
              <Text style={{ color: "#64748B", fontSize: 13 }}>Loading clinic requests…</Text>
            ) : clinicRequests.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 35 }}>
                <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
                <Text style={{ color: "#64748B", marginTop: 8, fontWeight: "600" }}>
                  No clinic appointments requested at this time.
                </Text>
              </View>
            ) : (
              clinicRequests.map((appt) => {
                const status = appt.status;
                return (
                  <View key={appt._id} style={nSt.clinicalRecCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={nSt.clinicalRecChild}>{appt.type}</Text>
                      <View style={[nSt.typeTagPill, { backgroundColor: status === "pending" ? "#FEF3C7" : status === "confirmed" ? "#DCFCE7" : "#FEE2E2" }]}>
                        <Text style={[nSt.typeTagText, { color: status === "pending" ? "#B45309" : status === "confirmed" ? "#15803D" : "#B91C1C" }]}>
                          {status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: "#0F172A", fontWeight: "700", marginTop: 4 }}>
                      Mother: {appt.mother?.name || "Mother Patient"} · {new Date(appt.date).toLocaleString()}
                    </Text>
                    {appt.place ? <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Location: {appt.place}</Text> : null}
                    {appt.notes ? <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Notes: {appt.notes}</Text> : null}

                    {status === "pending" ? (
                      <View style={{ flexDirection: "row", gap: 7, marginTop: 10 }}>
                        <Pressable
                          onPress={() => void handleNurseAcceptRequest(appt)}
                          style={[nSt.clinicalRecEditBtn, { backgroundColor: "#DCFCE7", flex: 1, alignItems: "center" }]}
                        >
                          <Text style={[nSt.clinicalRecEditText, { color: "#15803D" }]}>✓ Accept</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setNurseRescheduleTarget(appt);
                            setNurseRescheduleDate(appt.date ? new Date(appt.date).toISOString().slice(0, 16) : "");
                            setNurseRescheduleNotes("");
                          }}
                          style={[nSt.clinicalRecEditBtn, { backgroundColor: "#FEF3C7", flex: 1, alignItems: "center" }]}
                        >
                          <Text style={[nSt.clinicalRecEditText, { color: "#B45309" }]}>⏳ Set Other Time</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setNurseRejectTarget(appt);
                            setNurseRejectReason("");
                          }}
                          style={[nSt.clinicalRecDeleteBtn, { flex: 1, alignItems: "center" }]}
                        >
                          <Text style={nSt.clinicalRecDeleteText}>✕ Reject</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= NURSE RESCHEDULE MODAL ================= */}
      <Modal visible={nurseRescheduleTarget !== null} animationType="slide" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxWidth: 420 }]}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={nSt.modalTitle}>Set Alternate Clinic Time</Text>
                <Text style={nSt.modalSubTitle}>Propose new date & time to mother</Text>
              </View>
              <Pressable onPress={() => setNurseRescheduleTarget(null)} style={nSt.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={nSt.editFieldLabel}>NEW DATE & TIME (YYYY-MM-DDTHH:MM)</Text>
              <TextInput
                style={nSt.editTextInput}
                value={nurseRescheduleDate}
                onChangeText={setNurseRescheduleDate}
                placeholder="2026-10-20T10:00"
              />
              <Text style={nSt.editFieldLabel}>CLINIC INSTRUCTION / REMARKS</Text>
              <TextInput
                style={[nSt.editTextInput, { height: 60 }]}
                value={nurseRescheduleNotes}
                onChangeText={setNurseRescheduleNotes}
                placeholder="e.g. Please bring Child Health Development record book"
                multiline
              />
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setNurseRescheduleTarget(null)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleNurseRescheduleRequest} style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: CARAMEL }]}>
                <Text style={nSt.modalSubmitBtnText}>Send New Time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= NURSE REJECT MODAL ================= */}
      <Modal visible={nurseRejectTarget !== null} animationType="fade" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxWidth: 400 }]}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={[nSt.modalTitle, { color: "#DC2626" }]}>Reject Clinic Appointment</Text>
                <Text style={nSt.modalSubTitle}>Notify mother with rejection reason</Text>
              </View>
              <Pressable onPress={() => setNurseRejectTarget(null)} style={nSt.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
            <Text style={nSt.editFieldLabel}>REASON FOR REJECTION*</Text>
            <TextInput
              style={[nSt.editTextInput, { height: 60 }]}
              value={nurseRejectReason}
              onChangeText={setNurseRejectReason}
              placeholder="e.g. Clinic at maximum capacity for vaccines today"
              multiline
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setNurseRejectTarget(null)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleNurseRejectRequest} style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: "#DC2626" }]}>
                <Text style={nSt.modalSubmitBtnText}>Confirm Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= ADD TO QUEUE MODAL ================= */}
      <Modal visible={addModalOpen} animationType="slide" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxWidth: 460, maxHeight: "90%" }]}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={nSt.modalTitle}>Issue Clinic Token</Text>
                <Text style={nSt.modalSubTitle}>Auto-suggest mother or add walk-in patient</Text>
              </View>
              <Pressable
                onPress={() => {
                  setAddModalOpen(false);
                  setSelectedMotherForQueue(null);
                  setMotherSearchQuery("");
                }}
                style={nSt.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Mother Auto-Suggest Section */}
              <Text style={nSt.editFieldLabel}>SELECT REGISTERED MOTHER (AUTO-FILL)</Text>
              <TextInput
                style={[nSt.editTextInput, { marginBottom: 8 }]}
                value={motherSearchQuery}
                onChangeText={setMotherSearchQuery}
                placeholder="🔍 Search by mother name, code (e.g. Chamari, M-1042)..."
              />

              {/* Mother Suggestion Chips / List */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {availableMothers
                    .filter((m) => {
                      if (!motherSearchQuery.trim()) return true;
                      const q = motherSearchQuery.toLowerCase();
                      return (
                        (m.name || "").toLowerCase().includes(q) ||
                        (m.code || m.id || "").toLowerCase().includes(q) ||
                        (m.village || "").toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 8)
                    .map((m) => {
                      const isSelected = (selectedMotherForQueue?._id || selectedMotherForQueue?.id) === (m._id || m.id);
                      const isPreg = m.status === "pregnant";
                      return (
                        <Pressable
                          key={m._id || m.id}
                          onPress={() => handleSelectMotherForQueue(m)}
                          style={[
                            nSt.areaSelectChip,
                            isSelected && nSt.areaSelectChipActive,
                            { paddingVertical: 6, paddingHorizontal: 10 },
                          ]}
                        >
                          <Text style={[nSt.areaSelectChipText, isSelected && nSt.areaSelectChipTextActive]}>
                            {isPreg ? "🤰" : "👶"} {m.name} ({m.code || m.id})
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>

              {/* Selected Mother Status Callout */}
              {selectedMotherForQueue ? (
                <View
                  style={{
                    backgroundColor: selectedMotherForQueue.status === "pregnant" ? "#FEF3C7" : "#E0F2FE",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: selectedMotherForQueue.status === "pregnant" ? "#F59E0B" : "#38BDF8",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text
                      style={{
                        fontWeight: "800",
                        fontSize: 12,
                        color: selectedMotherForQueue.status === "pregnant" ? "#92400E" : "#0369A1",
                      }}
                    >
                      {selectedMotherForQueue.status === "pregnant"
                        ? `🤰 PREGNANT MOTHER (${selectedMotherForQueue.weeks || 28} WEEKS)`
                        : "👶 DELIVERED MOTHER"}
                    </Text>
                    <Pressable onPress={handleClearSelectedMother}>
                      <Text style={{ fontSize: 11, color: "#EF4444", fontWeight: "700" }}>✕ Clear</Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                    {selectedMotherForQueue.status === "pregnant"
                      ? `Baby is not yet born. Patient auto-set to "Baby of ${selectedMotherForQueue.name}" for maternal clinic & tetanus toxoid.`
                      : `Mother is postnatal. Registered child details can be provided below.`}
                  </Text>
                </View>
              ) : null}

              <Text style={nSt.editFieldLabel}>
                {selectedMotherForQueue?.status === "pregnant" ? "PATIENT / BABY LABEL (UNBORN)" : "CHILD NAME*"}
              </Text>
              <TextInput
                style={nSt.editTextInput}
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="e.g. Baby of Chamari Perera"
              />

              <Text style={nSt.editFieldLabel}>MOTHER'S NAME</Text>
              <TextInput
                style={nSt.editTextInput}
                value={newMotherName}
                onChangeText={setNewMotherName}
                placeholder="e.g. Chamari Perera"
              />

              <Text style={nSt.editFieldLabel}>AGE / GESTATIONAL WEEKS</Text>
              <TextInput
                style={nSt.editTextInput}
                value={newAge}
                onChangeText={setNewAge}
                placeholder="e.g. 28w gestation or 6m"
              />

              <Text style={nSt.editFieldLabel}>CLINIC SERVICE TYPE</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 14 }}>
                {(["Vaccination", "Growth", "Both"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setNewType(t)}
                    style={[
                      nSt.areaSelectChip,
                      newType === t && nSt.areaSelectChipActive,
                      { flex: 1, alignItems: "center" },
                    ]}
                  >
                    <Text style={[nSt.areaSelectChipText, newType === t && nSt.areaSelectChipTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => {
                  setAddModalOpen(false);
                  setSelectedMotherForQueue(null);
                  setMotherSearchQuery("");
                }}
                style={[nSt.modalCancelBtn, { flex: 1 }]}
              >
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddToQueue} style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: CARAMEL }]}>
                <Text style={nSt.modalSubmitBtnText}>Issue Token</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

const ALL_VACCINES = [
  { id: "bcg", name: "BCG (Tuberculosis)", timeStr: "At Birth" },
  { id: "opv0", name: "OPV-0 (Oral Polio)", timeStr: "At Birth" },
  { id: "penta1", name: "Penta-1 (DPT+HepB+Hib)", timeStr: "2 Months" },
  { id: "opv1", name: "OPV-1", timeStr: "2 Months" },
  { id: "pcv1", name: "PCV-1 (Pneumococcal)", timeStr: "2 Months" },
  { id: "penta2", name: "Penta-2", timeStr: "4 Months" },
  { id: "opv2", name: "OPV-2", timeStr: "4 Months" },
  { id: "penta3", name: "Penta-3", timeStr: "6 Months" },
  { id: "mmr1", name: "MMR-1 (Measles/Mumps/Rubella)", defaultChecked: true, timeStr: "9 Months" },
];

const MATERNAL_VACCINES = [
  { id: "tt1", name: "TT-1 (Tetanus Toxoid 1st Dose)", timeStr: "12 Weeks / Booking" },
  { id: "tt2", name: "TT-2 (Tetanus Toxoid 2nd Dose)", defaultChecked: true, timeStr: "16 - 20 Weeks" },
  { id: "tt3", name: "TT-3 (Tetanus Toxoid 3rd Dose)", timeStr: "Subsequent Pregnancy / 6 Mo" },
  { id: "tt_booster", name: "TT Booster (Tetanus Booster)", timeStr: "Subsequent Dose" },
  { id: "rubella", name: "Rubella (Pre-natal MMR/MR)", timeStr: "Pre-pregnancy / ANC Booking" },
  { id: "influenza", name: "Influenza (Maternal Seasonal)", timeStr: "Any Trimester" },
];

const MATERNAL_DANGER_FLAGS = [
  "High BP (≥140/90)",
  "Vaginal Bleeding",
  "Severe Swelling / Edema",
  "Reduced Fetal Movements",
  "Severe Headache / Blurred Vision",
  "Fever / Chills",
];

const URINE_RESULTS = ["Nil (Normal)", "Trace", "+1 Albumin", "+2 Albumin", "Sugar Present"];

export function NursingEntry() {
  const { navigate, setShowLanguageModal, isOnline, refreshPending } = useApp();
  const activePatient = getActivePatient();

  const isPregnant = Boolean(
    activePatient.isPregnant ||
    activePatient.childName?.toLowerCase().startsWith("baby of") ||
    activePatient.age?.toLowerCase().includes("gestation") ||
    activePatient.age?.toLowerCase().includes("pre-natal") ||
    activePatient.age?.toLowerCase().includes("unborn")
  );

  const [activeTab, setActiveTab] = useState<string>(isPregnant ? "anc" : "immunization");

  useEffect(() => {
    if (isPregnant && (activeTab === "immunization" || activeTab === "growth")) {
      setActiveTab("anc");
    } else if (!isPregnant && (activeTab === "anc" || activeTab === "maternal-vax")) {
      setActiveTab("immunization");
    }
  }, [isPregnant]);

  // Maternal ANC Form State (When child not yet delivered)
  const [ancWeight, setAncWeight] = useState("62.5");
  const [ancBp, setAncBp] = useState("118/76");
  const [ancHb, setAncHb] = useState("11.8");
  const [ancSfh, setAncSfh] = useState("28");
  const [ancFhr, setAncFhr] = useState("142");
  const [ancWeeks, setAncWeeks] = useState(activePatient.weeks ? String(activePatient.weeks) : "28");
  const [ancUrine, setAncUrine] = useState("Nil (Normal)");
  const [ancDangerFlags, setAncDangerFlags] = useState<string[]>([]);
  const [ancNotes, setAncNotes] = useState("");
  const [selectedMaternalVaccines, setSelectedMaternalVaccines] = useState<Record<string, boolean>>({
    tt2: true,
  });

  // Pediatric Form State (When child already born)
  const [selectedVaccines, setSelectedVaccines] = useState<Record<string, boolean>>({
    mmr1: true,
  });
  const [lotNumber, setLotNumber] = useState("LOT-2024-A");
  const [expiryDate, setExpiryDate] = useState("12/2027");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [weight, setWeight] = useState("8.4");
  const [height, setHeight] = useState("73");
  const [headCircumference, setHeadCircumference] = useState("44.5");
  const [muac, setMuac] = useState("14.5");

  // Recent Clinical Records State
  const [recentTab, setRecentTab] = useState<"vaccines" | "growth" | "visits">(isPregnant ? "visits" : "vaccines");
  const [recentImmunizations, setRecentImmunizations] = useState<any[]>([]);
  const [recentGrowthList, setRecentGrowthList] = useState<any[]>([]);
  const [recentVisitsList, setRecentVisitsList] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Edit Clinical Record Modal State
  const [editRecordModalOpen, setEditRecordModalOpen] = useState(false);
  const [editingRecordType, setEditingRecordType] = useState<"vaccine" | "growth" | "visit">("vaccine");
  const [editingRecordId, setEditingRecordId] = useState("");
  const [editLot, setEditLot] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editBp, setEditBp] = useState("");
  const [editHb, setEditHb] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const toggleVaccine = (id: string) => {
    setSelectedVaccines((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMaternalVaccine = (id: string) => {
    setSelectedMaternalVaccines((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDangerFlag = (flag: string) => {
    setAncDangerFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  // Load Recent Clinical Records
  const loadRecentRecords = React.useCallback(async () => {
    setRecordsLoading(true);
    try {
      const [vaxRes, growthRes, visitRes] = await Promise.all([
        api<any[]>("/records/immunizations").catch(() => []),
        api<any[]>("/records/growth").catch(() => []),
        api<any[]>("/records/visits").catch(() => []),
      ]);
      setRecentImmunizations(Array.isArray(vaxRes) ? vaxRes : []);
      setRecentGrowthList(Array.isArray(growthRes) ? growthRes : []);
      setRecentVisitsList(Array.isArray(visitRes) ? visitRes : []);
    } catch {
      // offline
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "records") {
      loadRecentRecords();
    }
  }, [activeTab, loadRecentRecords]);

  // Robust display name helper for clinical records
  const getRecordDisplayName = (item: any, fallback = "Patient") => {
    if (item.child && typeof item.child === "object" && item.child.name) {
      return item.child.name;
    }
    if (item.childName) return item.childName;
    if (item.mother && typeof item.mother === "object" && item.mother.name) {
      return item.child?.isUnborn !== false ? `Baby of ${item.mother.name}` : item.mother.name;
    }
    if (item.motherName) return `Baby of ${item.motherName}`;
    return fallback;
  };

  // Handle Save New Entry
  const handleSave = async () => {
    if (isPregnant) {
      if (activeTab === "anc") {
        if (!ancWeight.trim() && !ancBp.trim()) {
          Alert.alert("Validation", "Please record at least maternal weight or blood pressure.");
          return;
        }

        const visitPayload = {
          type: "Clinic ANC Visit",
          motherId: activePatient.motherId || activePatient.childId,
          motherName: activePatient.motherName,
          childName: activePatient.childName,
          weight: ancWeight.trim() ? Number(ancWeight) : undefined,
          bp: ancBp.trim() || undefined,
          hb: ancHb.trim() ? Number(ancHb) : undefined,
          sfh: ancSfh.trim() ? Number(ancSfh) : undefined,
          fhr: ancFhr.trim() ? Number(ancFhr) : undefined,
          gestationalWeeks: ancWeeks.trim() ? Number(ancWeeks) : undefined,
          riskFlags: ancDangerFlags,
          notes: `[SFH: ${ancSfh || "—"}cm | FHR: ${ancFhr || "—"}bpm | Urine: ${ancUrine}] ${ancNotes}`.trim(),
        };

        try {
          await api("/records/visits", { method: "POST", body: visitPayload });
        } catch {
          await queueRecord(visitPayload);
        }

        if (activePatient.id) {
          api(`/queue/${activePatient.id}`, { method: "PATCH", body: { status: "done" } }).catch(() => {});
        }

        refreshPending();
        if (isOnline) flushPending().then(refreshPending).catch(() => {});

        Alert.alert(
          "ANC Checkup Saved",
          `Maternal ANC vitals recorded for ${activePatient.motherName} (${activePatient.childName}). Live vitals updated for Mother and PHM.`,
          [{ text: "OK", onPress: () => navigate("nursing-home") }]
        );
        return;
      }

      if (activeTab === "maternal-vax") {
        const chosen = Object.keys(selectedMaternalVaccines).filter((k) => selectedMaternalVaccines[k]);
        if (chosen.length === 0) {
          Alert.alert("Validation", "Please select at least one maternal vaccine to administer.");
          return;
        }

        const vaxPayload = {
          type: "immunization",
          motherId: activePatient.motherId || activePatient.childId,
          motherName: activePatient.motherName,
          childName: activePatient.childName,
          vaccines: chosen.map((id) => MATERNAL_VACCINES.find((v) => v.id === id)?.name || id),
          lotNumber,
          expiryDate,
          notes: clinicalNotes,
        };

        try {
          await api("/records/immunizations", { method: "POST", body: vaxPayload });
        } catch {
          await queueRecord(vaxPayload);
        }

        if (activePatient.id) {
          api(`/queue/${activePatient.id}`, { method: "PATCH", body: { status: "done" } }).catch(() => {});
        }

        refreshPending();
        if (isOnline) flushPending().then(refreshPending).catch(() => {});

        Alert.alert(
          "Maternal Vaccine Logged",
          `Maternal vaccine record saved for ${activePatient.motherName} (${activePatient.childName}). Live records updated for Mother and PHM.`,
          [{ text: "OK", onPress: () => navigate("nursing-home") }]
        );
        return;
      }
    } else {
      // Child Born logic
      const chosenVaccines = Object.keys(selectedVaccines).filter((k) => selectedVaccines[k]);

      if (activeTab === "immunization" && chosenVaccines.length === 0) {
        Alert.alert("Validation", "Please select at least one vaccine to administer.");
        return;
      }

      if (activeTab === "growth" && !weight.trim()) {
        Alert.alert("Validation", "Weight measurement is required for growth monitoring.");
        return;
      }

      if (activeTab === "immunization") {
        const vaxPayload = {
          type: "immunization",
          childId: activePatient.childId,
          childName: activePatient.childName,
          motherName: activePatient.motherName,
          vaccines: chosenVaccines,
          lotNumber,
          expiryDate,
          notes: clinicalNotes,
        };

        try {
          await api("/records/immunizations", { method: "POST", body: vaxPayload });
        } catch {
          await queueRecord(vaxPayload);
        }
      } else {
        const growthPayload = {
          type: "growth",
          childId: activePatient.childId,
          childName: activePatient.childName,
          motherName: activePatient.motherName,
          weight: Number(weight),
          height: Number(height),
          headCircumference: Number(headCircumference),
          muac: Number(muac),
          zScore: "Normal (+0.4 WAZ)",
          notes: clinicalNotes,
        };

        try {
          await api("/records/growth", { method: "POST", body: growthPayload });
        } catch {
          await queueRecord(growthPayload);
        }
      }

      if (activePatient.id) {
        api(`/queue/${activePatient.id}`, { method: "PATCH", body: { status: "done" } }).catch(() => {});
      }

      refreshPending();
      if (isOnline) flushPending().then(refreshPending).catch(() => {});

      Alert.alert(
        "Entry Saved Successfully",
        `${activeTab === "immunization" ? "Pediatric immunization" : "Growth monitoring"} record logged for ${activePatient.childName}. Live records updated for Mother and PHM.`,
        [{ text: "OK", onPress: () => navigate("nursing-home") }]
      );
    }
  };

  // Open Edit Modal for a Record
  const openEditClinicalRecord = (record: any, type: "vaccine" | "growth" | "visit") => {
    setEditingRecordType(type);
    setEditingRecordId(record._id || record.id);
    setEditNotes(record.notes || "");
    if (type === "vaccine") {
      setEditLot(record.lotNumber || record.batch || "");
      setEditExpiry(record.expiryDate || "");
    } else if (type === "growth") {
      setEditWeight(String(record.weight || ""));
      setEditHeight(String(record.height || ""));
    } else {
      setEditWeight(String(record.weight || ""));
      setEditBp(record.bp || "");
      setEditHb(String(record.hb || ""));
    }
    setEditRecordModalOpen(true);
  };

  // Save Edited Clinical Record
  const handleSaveEditedRecord = async () => {
    if (!editingRecordId) return;

    try {
      if (editingRecordType === "vaccine") {
        await api(`/records/immunizations/${editingRecordId}`, {
          method: "PATCH",
          body: {
            batch: editLot.trim() || undefined,
            lotNumber: editLot.trim() || undefined,
            expiryDate: editExpiry.trim() || undefined,
            notes: editNotes,
          },
        });
      } else if (editingRecordType === "growth") {
        await api(`/records/growth/${editingRecordId}`, {
          method: "PATCH",
          body: {
            weight: editWeight.trim() ? Number(editWeight) : undefined,
            height: editHeight.trim() ? Number(editHeight) : undefined,
            length: editHeight.trim() ? Number(editHeight) : undefined,
            notes: editNotes,
          },
        });
      } else {
        await api(`/records/visits/${editingRecordId}`, {
          method: "PATCH",
          body: {
            weight: editWeight.trim() ? Number(editWeight) : undefined,
            bp: editBp.trim() || undefined,
            hb: editHb.trim() ? Number(editHb) : undefined,
            notes: editNotes,
          },
        });
      }
      setEditRecordModalOpen(false);
      Alert.alert("Success", "Record updated successfully in database.");
      await loadRecentRecords();
    } catch {
      Alert.alert("Error", "Could not update record at this time.");
    }
  };

  // Delete Clinical Record
  const handleDeleteClinicalRecord = (recordId: string, type: "vaccine" | "growth" | "visit") => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete this ${type === "vaccine" ? "immunization" : type === "growth" ? "growth" : "maternal visit"} entry?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (type === "vaccine") {
                await api(`/records/immunizations/${recordId}`, { method: "DELETE" });
              } else if (type === "growth") {
                await api(`/records/growth/${recordId}`, { method: "DELETE" });
              } else {
                await api(`/records/visits/${recordId}`, { method: "DELETE" });
              }
              Alert.alert("Deleted", "Clinical entry deleted successfully.");
              loadRecentRecords();
            } catch {
              Alert.alert("Error", "Could not delete record.");
            }
          },
        },
      ]
    );
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

          <Text style={nSt.entryHeaderTitle}>
            {isPregnant ? "Antenatal Maternal Care" : "Child Clinical Entry"}
          </Text>

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
        {/* Dynamic Patient Summary Card */}
        <View style={nSt.patientSummaryCard}>
          <View style={[nSt.babyAvatarBox, isPregnant && { backgroundColor: "#FEF3C7" }]}>
            <Text style={{ fontSize: 26 }}>{isPregnant ? "🤰" : "👶"}</Text>
          </View>
          <View style={nSt.patientSummaryDetails}>
            <Text style={nSt.patientSummaryName}>{activePatient.childName}</Text>
            <Text style={nSt.patientSummarySub}>
              {isPregnant ? `🤰 Pre-natal · ${activePatient.age}` : `👶 Born Child · ${activePatient.age}`} · Mother: {activePatient.motherName} · {activePatient.childId}
            </Text>
            <View style={nSt.activeTokenBadge}>
              <View style={[nSt.tokenDot, isPregnant && { backgroundColor: "#D97706" }]} />
              <Text style={nSt.activeTokenText}>
                Token #{activePatient.token || 4} · {isPregnant ? "Antenatal Clinic" : "Pediatric Clinic"}
              </Text>
            </View>
          </View>
        </View>

        {/* 3-Way Tab Selector (Differentiated between Pregnant vs Delivered Child) */}
        <View style={nSt.tabSelectorContainer}>
          {isPregnant ? (
            <>
              <Pressable
                onPress={() => setActiveTab("anc")}
                style={[nSt.tabItem, activeTab === "anc" && nSt.tabItemActive]}
              >
                <Text style={[nSt.tabItemText, activeTab === "anc" && { color: CARAMEL, fontWeight: "800" }]}>
                  🤰 Maternal ANC Vitals
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("maternal-vax")}
                style={[nSt.tabItem, activeTab === "maternal-vax" && nSt.tabItemActive]}
              >
                <Text style={[nSt.tabItemText, activeTab === "maternal-vax" && { color: CARAMEL, fontWeight: "800" }]}>
                  💉 Tetanus Toxoid (TT)
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => setActiveTab("immunization")}
                style={[nSt.tabItem, activeTab === "immunization" && nSt.tabItemActive]}
              >
                <Text style={[nSt.tabItemText, activeTab === "immunization" && { color: CARAMEL, fontWeight: "800" }]}>
                  💉 Immunization
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("growth")}
                style={[nSt.tabItem, activeTab === "growth" && nSt.tabItemActive]}
              >
                <Text style={[nSt.tabItemText, activeTab === "growth" && { color: CARAMEL, fontWeight: "800" }]}>
                  📊 Growth Check
                </Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={() => setActiveTab("records")}
            style={[nSt.tabItem, activeTab === "records" && nSt.tabItemActive]}
          >
            <Text style={[nSt.tabItemText, activeTab === "records" && { color: CARAMEL, fontWeight: "800" }]}>
              📋 Clinical Records
            </Text>
          </Pressable>
        </View>

        {/* ================= PREGNANT MOTHER: MATERNAL ANC VITALS TAB ================= */}
        {isPregnant && activeTab === "anc" ? (
          <View>
            <Text style={nSt.inputSectionHeader}>MATERNAL VITALS & EXAMINATION</Text>

            {/* Maternal Weight & Blood Pressure */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={nSt.fieldLabelSmall}>MATERNAL WEIGHT (KG)*</Text>
                <View style={nSt.measurementInputRow}>
                  <TextInput
                    style={nSt.measurementInputField}
                    value={ancWeight}
                    onChangeText={setAncWeight}
                    placeholder="e.g. 62.5"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={nSt.unitBadgeText}>kg</Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={nSt.fieldLabelSmall}>BLOOD PRESSURE (MMHG)*</Text>
                <View style={nSt.measurementInputRow}>
                  <TextInput
                    style={nSt.measurementInputField}
                    value={ancBp}
                    onChangeText={setAncBp}
                    placeholder="e.g. 118/76"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={nSt.unitBadgeText}>mmHg</Text>
                </View>
              </View>
            </View>

            {/* Hemoglobin & Gestational Weeks */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={nSt.fieldLabelSmall}>HEMOGLOBIN (HB G/DL)</Text>
                <View style={nSt.measurementInputRow}>
                  <TextInput
                    style={nSt.measurementInputField}
                    value={ancHb}
                    onChangeText={setAncHb}
                    placeholder="e.g. 11.8"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={nSt.unitBadgeText}>g/dL</Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={nSt.fieldLabelSmall}>GESTATIONAL AGE</Text>
                <View style={nSt.measurementInputRow}>
                  <TextInput
                    style={nSt.measurementInputField}
                    value={ancWeeks}
                    onChangeText={setAncWeeks}
                    placeholder="e.g. 28"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                  <Text style={nSt.unitBadgeText}>wks</Text>
                </View>
              </View>
            </View>

            {/* Fundal Height & Fetal Heart Rate */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={nSt.fieldLabelSmall}>FUNDAL HEIGHT (SFH CM)</Text>
                <View style={nSt.measurementInputRow}>
                  <TextInput
                    style={nSt.measurementInputField}
                    value={ancSfh}
                    onChangeText={setAncSfh}
                    placeholder="e.g. 28"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={nSt.unitBadgeText}>cm</Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={nSt.fieldLabelSmall}>FETAL HEART RATE (FHR)</Text>
                <View style={nSt.measurementInputRow}>
                  <TextInput
                    style={nSt.measurementInputField}
                    value={ancFhr}
                    onChangeText={setAncFhr}
                    placeholder="e.g. 142"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                  <Text style={nSt.unitBadgeText}>bpm</Text>
                </View>
              </View>
            </View>

            {/* Urine Albumin & Sugar Chips */}
            <Text style={nSt.inputSectionHeader}>URINE TEST RESULT</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {URINE_RESULTS.map((res) => {
                const isSel = ancUrine === res;
                return (
                  <Pressable
                    key={res}
                    onPress={() => setAncUrine(res)}
                    style={[
                      nSt.areaSelectChip,
                      isSel && { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
                    ]}
                  >
                    <Text
                      style={[
                        nSt.areaSelectChipText,
                        isSel && { color: "#B45309", fontWeight: "800" },
                      ]}
                    >
                      {isSel ? "✓ " : ""}{res}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Danger Flags Checkbox Chips */}
            <Text style={nSt.inputSectionHeader}>DANGER SIGNS / RISK WARNINGS</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {MATERNAL_DANGER_FLAGS.map((flag) => {
                const on = ancDangerFlags.includes(flag);
                return (
                  <Pressable
                    key={flag}
                    onPress={() => toggleDangerFlag(flag)}
                    style={[
                      nSt.areaSelectChip,
                      on && { backgroundColor: "#FEE2E2", borderColor: "#DC2626" },
                    ]}
                  >
                    <Text
                      style={[
                        nSt.areaSelectChipText,
                        on && { color: "#DC2626", fontWeight: "800" },
                      ]}
                    >
                      {on ? "⚠️ " : ""}{flag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Clinical Notes */}
            <Text style={nSt.inputSectionHeader}>CLINICAL OBSERVATIONS & DIETARY GUIDANCE</Text>
            <View style={nSt.notesInputWrapper}>
              <TextInput
                style={nSt.notesInputField}
                value={ancNotes}
                onChangeText={setAncNotes}
                placeholder="Iron & folic acid intake, calcium supplements, fetal movements..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [nSt.saveEntryMainBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={nSt.saveEntryMainBtnText}>Save Maternal ANC Record</Text>
            </Pressable>
          </View>
        ) : isPregnant && activeTab === "maternal-vax" ? (
          /* ================= PREGNANT MOTHER: TETANUS TOXOID (TT) TAB ================= */
          <View>
            <Text style={nSt.inputSectionHeader}>MATERNAL IMMUNIZATION SCHEDULE</Text>

            <View style={nSt.vaccinesListCard}>
              {MATERNAL_VACCINES.map((vax, idx) => {
                const isChecked = !!selectedMaternalVaccines[vax.id];
                const isLast = idx === MATERNAL_VACCINES.length - 1;

                return (
                  <Pressable
                    key={vax.id}
                    onPress={() => toggleMaternalVaccine(vax.id)}
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

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          nSt.vaccineNameText,
                          isChecked && { fontWeight: "800", color: "#0F172A" },
                        ]}
                      >
                        {vax.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>Schedule: {vax.timeStr}</Text>
                    </View>
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
                  placeholder="LOT-2024-TT"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[nSt.textInputWrapper, { flex: 1, flexDirection: "row", alignItems: "center" }]}>
                <TextInput
                  style={[nSt.textInputField, { flex: 1 }]}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="mm/yyyy"
                  placeholderTextColor="#94A3B8"
                />
                <Ionicons name="calendar-outline" size={19} color="#334155" style={{ marginRight: 12 }} />
              </View>
            </View>

            {/* Clinical Observations */}
            <Text style={nSt.inputSectionHeader}>OBSERVATIONS & ADVERSE EVENT CHECK</Text>
            <View style={nSt.notesInputWrapper}>
              <TextInput
                style={nSt.notesInputField}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                placeholder="Tolerance, injection site observations, advice to return if fever..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [nSt.saveEntryMainBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={nSt.saveEntryMainBtnText}>Log Maternal Vaccination</Text>
            </Pressable>
          </View>
        ) : !isPregnant && activeTab === "immunization" ? (
          /* ================= DELIVERED CHILD: IMMUNIZATION TAB ================= */
          <View>
            <Text style={nSt.inputSectionHeader}>PEDIATRIC VACCINES TO ADMINISTER</Text>

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

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          nSt.vaccineNameText,
                          isChecked && { fontWeight: "800", color: "#0F172A" },
                        ]}
                      >
                        {vax.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>Schedule: {vax.timeStr}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

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
                  placeholder="mm/yyyy"
                  placeholderTextColor="#94A3B8"
                />
                <Ionicons name="calendar-outline" size={19} color="#334155" style={{ marginRight: 12 }} />
              </View>
            </View>

            <Text style={nSt.inputSectionHeader}>CLINICAL OBSERVATIONS (OPTIONAL)</Text>
            <View style={nSt.notesInputWrapper}>
              <TextInput
                style={nSt.notesInputField}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                placeholder="Adverse reactions, tolerance, fever check..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [nSt.saveEntryMainBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={nSt.saveEntryMainBtnText}>Log Pediatric Vaccination</Text>
            </Pressable>
          </View>
        ) : !isPregnant && activeTab === "growth" ? (
          /* ================= DELIVERED CHILD: GROWTH MONITORING TAB ================= */
          <View>
            <Text style={nSt.inputSectionHeader}>CHILD PHYSICAL MEASUREMENTS</Text>

            <Text style={nSt.fieldLabelSmall}>WEIGHT (KG)*</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 8.4"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>kg</Text>
            </View>

            <Text style={nSt.fieldLabelSmall}>LENGTH / HEIGHT (CM)</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 73"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>cm</Text>
            </View>

            <Text style={nSt.fieldLabelSmall}>HEAD CIRCUMFERENCE (CM)</Text>
            <View style={nSt.measurementInputRow}>
              <TextInput
                style={nSt.measurementInputField}
                value={headCircumference}
                onChangeText={setHeadCircumference}
                placeholder="e.g. 44.5"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
              <Text style={nSt.unitBadgeText}>cm</Text>
            </View>

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

            <View style={nSt.whoZscoreCard}>
              <View style={nSt.whoIconBox}>
                <Ionicons name="bar-chart" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={nSt.whoTitleText}>WHO Growth Standards: Normal Range</Text>
                <Text style={nSt.whoSubText}>WAZ: +0.4 · HAZ: -0.2 · WHZ: +0.8 (Age {activePatient.age})</Text>
              </View>
            </View>

            <Text style={nSt.inputSectionHeader}>DIET & CLINICAL NOTES (OPTIONAL)</Text>
            <View style={nSt.notesInputWrapper}>
              <TextInput
                style={nSt.notesInputField}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                placeholder="Dietary practices, feeding, developmental milestones..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [nSt.saveEntryMainBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="save" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={nSt.saveEntryMainBtnText}>Save Growth Record</Text>
            </Pressable>
          </View>
        ) : (
          /* ================= RECENT CLINICAL RECORDS TAB ================= */
          <View>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
              <Pressable
                onPress={() => setRecentTab("vaccines")}
                style={[
                  nSt.areaSelectChip,
                  recentTab === "vaccines" && nSt.areaSelectChipActive,
                  { flex: 1, alignItems: "center", paddingHorizontal: 6 },
                ]}
              >
                <Text style={[nSt.areaSelectChipText, recentTab === "vaccines" && nSt.areaSelectChipTextActive, { fontSize: 11 }]}>
                  💉 Vaccines ({recentImmunizations.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRecentTab("growth")}
                style={[
                  nSt.areaSelectChip,
                  recentTab === "growth" && nSt.areaSelectChipActive,
                  { flex: 1, alignItems: "center", paddingHorizontal: 6 },
                ]}
              >
                <Text style={[nSt.areaSelectChipText, recentTab === "growth" && nSt.areaSelectChipTextActive, { fontSize: 11 }]}>
                  📏 Growth ({recentGrowthList.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRecentTab("visits")}
                style={[
                  nSt.areaSelectChip,
                  recentTab === "visits" && nSt.areaSelectChipActive,
                  { flex: 1, alignItems: "center", paddingHorizontal: 6 },
                ]}
              >
                <Text style={[nSt.areaSelectChipText, recentTab === "visits" && nSt.areaSelectChipTextActive, { fontSize: 11 }]}>
                  🩺 Maternal ({recentVisitsList.length})
                </Text>
              </Pressable>
            </View>

            {recordsLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ color: "#64748B", fontSize: 12 }}>Loading live records from database...</Text>
              </View>
            ) : recentTab === "vaccines" ? (
              recentImmunizations.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <Ionicons name="shield-outline" size={38} color="#CBD5E1" />
                  <Text style={{ color: "#64748B", marginTop: 8, fontWeight: "600" }}>
                    No recent vaccine entries recorded yet.
                  </Text>
                </View>
              ) : (
                recentImmunizations.map((item) => (
                  <View key={item._id || item.id} style={nSt.clinicalRecCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={nSt.clinicalRecChild}>{getRecordDisplayName(item, "Vaccine Recipient")}</Text>
                      <Text style={nSt.clinicalRecDate}>
                        {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: CARAMEL, fontWeight: "700", marginTop: 4 }}>
                      Vaccine: {Array.isArray(item.vaccines) ? item.vaccines.join(", ") : item.vaccine || "Administered"}
                    </Text>
                    {item.batch || item.lotNumber ? (
                      <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                        Batch/Lot: {item.batch || item.lotNumber} {item.expiryDate ? `· Exp: ${item.expiryDate}` : ""}
                      </Text>
                    ) : null}
                    {item.mother?.village ? (
                      <Text style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                        Mother: {item.mother?.name || "Registered"} · {item.mother.village}
                      </Text>
                    ) : null}
                    {item.notes ? (
                      <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Notes: {item.notes}</Text>
                    ) : null}

                    {/* Edit & Delete Action Buttons */}
                    <View style={nSt.clinicalRecActionRow}>
                      <Pressable
                        onPress={() => openEditClinicalRecord(item, "vaccine")}
                        style={({ pressed }) => [nSt.clinicalRecEditBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="create-outline" size={14} color="#0284C7" />
                        <Text style={nSt.clinicalRecEditText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteClinicalRecord(item._id || item.id, "vaccine")}
                        style={({ pressed }) => [nSt.clinicalRecDeleteBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={nSt.clinicalRecDeleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )
            ) : recentTab === "growth" ? (
              recentGrowthList.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <Ionicons name="bar-chart-outline" size={38} color="#CBD5E1" />
                  <Text style={{ color: "#64748B", marginTop: 8, fontWeight: "600" }}>
                    No recent growth monitoring records found.
                  </Text>
                </View>
              ) : (
                recentGrowthList.map((item) => (
                  <View key={item._id || item.id} style={nSt.clinicalRecCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={nSt.clinicalRecChild}>{getRecordDisplayName(item, "Child Patient")}</Text>
                      <Text style={nSt.clinicalRecDate}>
                        {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#16A34A", fontWeight: "700", marginTop: 4 }}>
                      Weight: {item.weight} kg {item.height ? `· Length: ${item.height} cm` : ""}
                    </Text>
                    {item.headCircumference ? (
                      <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                        Head Circ: {item.headCircumference} cm {item.muac ? `· MUAC: ${item.muac} cm` : ""}
                      </Text>
                    ) : null}
                    {item.notes ? (
                      <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Notes: {item.notes}</Text>
                    ) : null}

                    {/* Edit & Delete Action Buttons */}
                    <View style={nSt.clinicalRecActionRow}>
                      <Pressable
                        onPress={() => openEditClinicalRecord(item, "growth")}
                        style={({ pressed }) => [nSt.clinicalRecEditBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="create-outline" size={14} color="#0284C7" />
                        <Text style={nSt.clinicalRecEditText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteClinicalRecord(item._id || item.id, "growth")}
                        style={({ pressed }) => [nSt.clinicalRecDeleteBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={nSt.clinicalRecDeleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )
            ) : recentVisitsList.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <Ionicons name="document-text-outline" size={38} color="#CBD5E1" />
                <Text style={{ color: "#64748B", marginTop: 8, fontWeight: "600" }}>
                  No recent maternal clinic or field visits found.
                </Text>
              </View>
            ) : (
              recentVisitsList.map((item) => (
                <View key={item._id || item.id} style={nSt.clinicalRecCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={nSt.clinicalRecChild}>
                      {item.mother?.name || item.motherName || "Mother Patient"} {item.mother?.village ? `· ${item.mother.village}` : ""}
                    </Text>
                    <Text style={nSt.clinicalRecDate}>
                      {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: "#0F766E", fontWeight: "700", marginTop: 4 }}>
                    {item.type || "Clinical ANC Visit"} {item.mother?.code ? `· ID: ${item.mother.code}` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: "#334155", fontWeight: "600" }}>
                      Weight: {item.weight ? `${item.weight} kg` : "—"}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#334155", fontWeight: "600" }}>
                      BP: {item.bp || "—"}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#334155", fontWeight: "600" }}>
                      Hb: {item.hb ? `${item.hb} g/dL` : "—"}
                    </Text>
                  </View>
                  {Array.isArray(item.riskFlags) && item.riskFlags.length > 0 ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {item.riskFlags.map((flag: string) => (
                        <View key={flag} style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, color: "#DC2626", fontWeight: "700" }}>⚠️ {flag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {item.notes ? (
                    <Text style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>Notes: {item.notes}</Text>
                  ) : null}

                  {/* Edit & Delete Action Buttons */}
                  <View style={nSt.clinicalRecActionRow}>
                    <Pressable
                      onPress={() => openEditClinicalRecord(item, "visit")}
                      style={({ pressed }) => [nSt.clinicalRecEditBtn, pressed && { opacity: 0.8 }]}
                    >
                      <Ionicons name="create-outline" size={14} color="#0284C7" />
                      <Text style={nSt.clinicalRecEditText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteClinicalRecord(item._id || item.id, "visit")}
                      style={({ pressed }) => [nSt.clinicalRecDeleteBtn, pressed && { opacity: 0.8 }]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={nSt.clinicalRecDeleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= EDIT CLINICAL RECORD MODAL ================= */}
      <Modal visible={editRecordModalOpen} animationType="slide" transparent>
        <View style={nSt.modalOverlay}>
          <View style={[nSt.modalContainer, { maxWidth: 420 }]}>
            <View style={nSt.modalHeaderRow}>
              <View>
                <Text style={nSt.modalTitle}>
                  {editingRecordType === "vaccine"
                    ? "Edit Vaccine Record"
                    : editingRecordType === "growth"
                    ? "Edit Growth Record"
                    : "Edit Maternal Visit"}
                </Text>
                <Text style={nSt.modalSubTitle}>Update clinical values in central system</Text>
              </View>
              <Pressable onPress={() => setEditRecordModalOpen(false)} style={nSt.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {editingRecordType === "vaccine" ? (
                <>
                  <Text style={nSt.editFieldLabel}>LOT / BATCH NUMBER</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editLot}
                    onChangeText={setEditLot}
                    placeholder="LOT-XXXX"
                  />
                  <Text style={nSt.editFieldLabel}>EXPIRY DATE</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editExpiry}
                    onChangeText={setEditExpiry}
                    placeholder="mm/yyyy"
                  />
                </>
              ) : editingRecordType === "growth" ? (
                <>
                  <Text style={nSt.editFieldLabel}>WEIGHT (KG)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    placeholder="e.g. 8.4"
                    keyboardType="numeric"
                  />
                  <Text style={nSt.editFieldLabel}>HEIGHT / LENGTH (CM)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editHeight}
                    onChangeText={setEditHeight}
                    placeholder="e.g. 73"
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <Text style={nSt.editFieldLabel}>WEIGHT (KG)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    placeholder="e.g. 62.5"
                    keyboardType="numeric"
                  />
                  <Text style={nSt.editFieldLabel}>BLOOD PRESSURE (MMHG)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editBp}
                    onChangeText={setEditBp}
                    placeholder="e.g. 120/80"
                  />
                  <Text style={nSt.editFieldLabel}>HEMOGLOBIN (HB G/DL)</Text>
                  <TextInput
                    style={nSt.editTextInput}
                    value={editHb}
                    onChangeText={setEditHb}
                    placeholder="e.g. 11.8"
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={nSt.editFieldLabel}>CLINICAL OBSERVATIONS</Text>
              <TextInput
                style={[nSt.editTextInput, { height: 70, textAlignVertical: "top" }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Observations, dosage remarks, maternal advice..."
                multiline
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setEditRecordModalOpen(false)} style={[nSt.modalCancelBtn, { flex: 1 }]}>
                <Text style={nSt.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveEditedRecord} style={[nSt.modalSubmitBtn, { flex: 1, backgroundColor: CARAMEL }]}>
                <Text style={nSt.modalSubmitBtnText}>Update Record</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  const [regBloodGroup, setRegBloodGroup] = useState("Not tested");
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

  // Load Live Records from Server (Children & Registered Mothers)
  const loadLiveRecords = React.useCallback(async () => {
    try {
      const [liveChildren, liveMothers, midwives] = await Promise.all([
        api<any[]>("/children").catch(() => []),
        api<any[]>("/mothers").catch(() => []),
        api<MidwifeData[]>("/users/midwives").catch(() => []),
      ]);

      if (Array.isArray(midwives) && midwives.length > 0) {
        setMidwivesList(midwives);
      }

      const serverRecords: ChildRecord[] = [];
      const motherIdsWithChild = new Set<string>();

      if (Array.isArray(liveChildren)) {
        for (const c of liveChildren) {
          const m = c.mother;
          if (m?._id) motherIdsWithChild.add(String(m._id));
          if (m?.code) motherIdsWithChild.add(String(m.code));

          const isUnborn = c.isUnborn === true || c.status === "unborn";
          const ageStr = isUnborn
            ? `Pre-natal · ${c.gestationalWeeks || m?.weeks || 28}w gestation`
            : c.dob
            ? `${Math.max(1, Math.round((Date.now() - new Date(c.dob).getTime()) / (30 * 864e5)))} months`
            : "Infant";

          serverRecords.push({
            id: c._id || c.code,
            name: c.name || (m?.name ? `Baby of ${m.name}` : "Baby"),
            age: ageStr,
            chNumber: c.code,
            motherName: m?.name || "Mother",
            motherCode: m?.code,
            motherVillage: m?.village || m?.phmArea,
            motherArea: m?.phmArea || m?.village,
            assignedMidwife: m?.assignedPhm,
            status: isUnborn ? "attention" : "complete",
            isUnborn,
            unbornStatus: isUnborn ? "unborn" : "born",
            edd: c.edd ? new Date(c.edd).toLocaleDateString() : (m?.edd ? new Date(m.edd).toLocaleDateString() : undefined),
            gestationalWeeks: c.gestationalWeeks || m?.weeks || 28,
            immunization: {
              completedCount: isUnborn ? 0 : 4,
              totalCount: 8,
              items: [
                { name: "BCG", status: isUnborn ? "pending" : "done" },
                { name: "OPV-0", status: isUnborn ? "pending" : "done" },
                { name: "Penta-1", status: isUnborn ? "pending" : "done" },
                { name: "OPV-1", status: isUnborn ? "pending" : "done" },
                { name: "PCV-1", status: "pending" },
                { name: "Penta-2", status: "pending" },
                { name: "Penta-3", status: "pending" },
                { name: "MMR-1", status: "pending" },
              ],
            },
            growth: {
              weight: isUnborn ? "Awaiting birth" : (c.birthWeight ? `${c.birthWeight} kg` : "7.5 kg"),
              length: isUnborn ? "Awaiting birth" : (c.birthLength ? `${c.birthLength} cm` : "68 cm"),
              waz: isUnborn ? "Pre-natal record" : "Normal (+0.2)",
            },
          });
        }
      }

      if (Array.isArray(liveMothers)) {
        for (const m of liveMothers) {
          const mKey = String(m._id || m.id || m.code);
          if (motherIdsWithChild.has(mKey) || motherIdsWithChild.has(String(m.code))) continue;
          const isPregnant = m.status === "pregnant" || (m.weeks && m.weeks <= 40);

          serverRecords.push({
            id: `m-child-${m.code || m._id}`,
            name: `Baby of ${m.name}`,
            age: isPregnant ? `Pre-natal · ${m.weeks || 28}w gestation` : "Infant",
            chNumber: `CH-REG-${(m.code || "").replace("M-", "")}`,
            motherName: m.name,
            motherCode: m.code,
            motherVillage: m.village || m.phmArea,
            motherArea: m.phmArea || m.village,
            assignedMidwife: m.assignedPhm,
            status: "attention",
            isUnborn: isPregnant,
            unbornStatus: isPregnant ? "unborn" : "born",
            edd: m.edd ? new Date(m.edd).toLocaleDateString() : "Pending",
            gestationalWeeks: m.weeks || 28,
            immunization: {
              completedCount: 0,
              totalCount: 8,
              items: [
                { name: "BCG", status: "pending" },
                { name: "OPV-0", status: "pending" },
                { name: "Penta-1", status: "pending" },
                { name: "OPV-1", status: "pending" },
                { name: "PCV-1", status: "pending" },
                { name: "Penta-2", status: "pending" },
                { name: "Penta-3", status: "pending" },
                { name: "MMR-1", status: "pending" },
              ],
            },
            growth: {
              weight: "Awaiting birth",
              length: "Awaiting birth",
              waz: "Pre-natal record",
            },
          });
        }
      }

      if (serverRecords.length > 0) {
        setRecords((prev) => {
          const codes = new Set(serverRecords.map((r) => r.chNumber.toLowerCase()));
          const extra = prev.filter((r) => !codes.has(r.chNumber.toLowerCase()));
          return [...serverRecords, ...extra];
        });
      }
    } catch {}
  }, []);

  // Load Midwives & Server Records on mount
  useEffect(() => {
    loadLiveRecords();
  }, [loadLiveRecords]);

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
      bloodGroup: regBloodGroup !== "Not tested" ? regBloodGroup : undefined,
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
    setRegBloodGroup("Not tested");

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

  const handleSaveEdit = async () => {
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

    try {
      const codeOrId = selectedRecord.chNumber || selectedRecord.id;
      const cleanWeight = parseFloat(editWeight.replace(/[^0-9.]/g, ""));
      const cleanLength = parseFloat(editLength.replace(/[^0-9.]/g, ""));

      // 1. Update child record in backend
      await api(`/children/${encodeURIComponent(codeOrId)}`, {
        method: "PATCH",
        body: {
          name: editName.trim(),
          birthWeight: !isNaN(cleanWeight) ? cleanWeight : undefined,
          birthLength: !isNaN(cleanLength) ? cleanLength : undefined,
          notes: `[WAZ: ${editWaz.trim() || "Normal"}] ${editAge ? `Age: ${editAge}` : ""}`.trim(),
          motherName: editMother.trim() || undefined,
        },
      });

      // 2. If weight or length was updated, also append to Growth records
      if (!isNaN(cleanWeight)) {
        api("/records/growth", {
          method: "POST",
          body: {
            childId: selectedRecord.id,
            childCode: selectedRecord.chNumber,
            childName: editName.trim(),
            motherName: editMother.trim(),
            weight: cleanWeight,
            height: !isNaN(cleanLength) ? cleanLength : undefined,
            notes: `WAZ: ${editWaz.trim() || "Normal"} (Updated via Nurse Edit)`,
          },
        }).catch(() => {});
      }

      // 3. Update mother name if motherCode exists
      if (editMother.trim() && selectedRecord.motherCode) {
        api(`/mothers/${encodeURIComponent(selectedRecord.motherCode)}`, {
          method: "PATCH",
          body: { name: editMother.trim() },
        }).catch(() => {});
      }

      setEditModalVisible(false);
      Alert.alert("Success", `Child record for ${updated.name} has been updated in database.`);
      await loadLiveRecords();
    } catch (err) {
      setEditModalVisible(false);
      Alert.alert("Updated (Offline)", `Record updated locally on device.`);
    }
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

            {/* Quick Action: Open Clinic Entry in Nursing */}
            <Pressable
              onPress={() => {
                const isPreg = Boolean(
                  selectedRecord.isUnborn ||
                  selectedRecord.name?.toLowerCase().startsWith("baby of") ||
                  selectedRecord.age?.toLowerCase().includes("pre-natal") ||
                  selectedRecord.age?.toLowerCase().includes("gestation")
                );
                setActivePatient({
                  id: selectedRecord.id,
                  token: 1,
                  childName: selectedRecord.name,
                  childId: selectedRecord.chNumber,
                  age: selectedRecord.age,
                  motherName: selectedRecord.motherName,
                  motherId: selectedRecord.motherCode,
                  type: "Both",
                  isPregnant: isPreg,
                  weeks: selectedRecord.gestationalWeeks,
                });
                setSelectedRecord(null);
                navigate("nursing-entry");
              }}
              style={({ pressed }) => [
                nSt.saveEntryMainBtn,
                { backgroundColor: selectedRecord.isUnborn ? "#D97706" : CARAMEL, marginBottom: 12 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name={selectedRecord.isUnborn ? "medkit" : "shield-checkmark"} size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={nSt.saveEntryMainBtnText}>
                {selectedRecord.isUnborn ? "🩺 Open Antenatal Clinic Entry" : "💉 Open Child Clinic Entry"}
              </Text>
            </Pressable>

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

                  {/* Blood Group Selection Chips */}
                  <Text style={nSt.editFieldLabel}>BLOOD GROUP (OPTIONAL / LAB TEST)</Text>
                  <View style={[nSt.areaChipList, { marginBottom: 12 }]}>
                    {["Not tested", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => {
                      const isSel = regBloodGroup === bg;
                      return (
                        <Pressable
                          key={bg}
                          onPress={() => setRegBloodGroup(bg)}
                          style={[
                            nSt.areaSelectChip,
                            isSel && { backgroundColor: "#079DB8", borderColor: "#079DB8" },
                          ]}
                        >
                          <Text style={[nSt.areaSelectChipText, isSel && { color: "#FFFFFF", fontWeight: "800" }]}>
                            {bg}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

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
  callBannerContainer: { marginBottom: 14, padding: 14, borderRadius: 16, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74" },
  callBannerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  callBannerIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#EA580C" },
  callBannerTitle: { color: "#9A3412", fontSize: 13, fontWeight: "800" },
  callBannerSub: { color: "#C2410C", fontSize: 11, marginTop: 2 },
  callBannerRoom: { color: "#9A3412", fontSize: 9, fontWeight: "700", marginTop: 8 },
  callBannerBtnRow: { flexDirection: "row", gap: 7, marginTop: 11 },
  callBannerBtnServe: { flex: 1, minHeight: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EA580C" },
  callBannerBtnServeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  callBannerBtnEntry: { flex: 1, minHeight: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#0F766E" },
  callBannerBtnEntryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  callBannerBtnDismiss: { width: 34, minHeight: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FFEDD5" },
  callNextQuickBtn: { flex: 1, minHeight: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#AF5819" },
  callNextQuickBtnText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  addQueueQuickBtn: { flex: 1, minHeight: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#F59E0B" },
  addQueueQuickBtnText: { color: "#AF5819", fontSize: 10, fontWeight: "800" },
  markDoneHeroBtn: { minHeight: 40, paddingHorizontal: 14, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#059669" },
  markDoneHeroBtnText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  queueCardCalling: { borderColor: "#FB923C", backgroundColor: "#FFF7ED" },
  callTokenIconBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" },
  clinicalRecCard: { padding: 12, marginBottom: 9, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  clinicalRecChild: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
  clinicalRecDate: { color: "#64748B", fontSize: 10, marginTop: 3 },
  clinicalRecActionRow: { flexDirection: "row", gap: 7, marginTop: 9 },
  clinicalRecEditBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: "#EFF6FF" },
  clinicalRecEditText: { color: "#2563EB", fontSize: 10, fontWeight: "800" },
  clinicalRecDeleteBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: "#FEF2F2" },
  clinicalRecDeleteText: { color: "#DC2626", fontSize: 10, fontWeight: "800" },
});
