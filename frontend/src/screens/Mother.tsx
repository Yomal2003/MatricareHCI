import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useApp } from "../context";
import { T } from "../types";
import { api } from "../api/client";
import Shell from "../components/Shell";
import { Button, Card, Chip, Row, SectionTitle, s, usePalette } from "../components/ui";
import Svg, { Circle } from "react-native-svg";

const HEALTH_TIPS = [
  { id: "water", icon: "💧", text: "Drink 2 litres of water daily" },
  { id: "folic-acid", icon: "💊", text: "Take folic acid tablets daily" },
  { id: "walking", icon: "🚶", text: "Walk 30 minutes each day" },
  { id: "clinic", icon: "🏥", text: "Attend all clinic visits on time" },
  { id: "diet", icon: "🥗", text: "Eat a balanced diet" },
  { id: "sleep", icon: "😴", text: "Get enough rest and sleep" },
  { id: "nutrition", icon: "🥛", text: "Include nutritious foods in your diet" },
  { id: "provider-advice", icon: "🩺", text: "Follow your healthcare provider's advice" },
];

export function MotherHome() {
  const { language, navigate, user, setShowLanguageModal, toggleOnline, isOnline } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const t = T[language];
  const [summaryData, setSummaryData] = useState<any>(null);
  const [next, setNext] = useState<any>(null);
  const [liveQueue, setLiveQueue] = useState<any>(null);
  const [dismissedToken, setDismissedToken] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const q = await api<any>("/me/queue");
      if (q) setLiveQueue(q);
    } catch {}
  }, []);

  useEffect(() => {
    api("/me/summary")
      .then((r: any) => {
        if (r) {
          setSummaryData(r);
          setNext(r.nextAppt || null);
          if (r.queue) setLiveQueue(r.queue);
        }
      })
      .catch(() => {});

    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const motherObj = summaryData?.mother;
  const isPostnatal = motherObj?.status === "postnatal";
  const weeks = summaryData?.weeks ?? (motherObj?.weeks || (isPostnatal ? 0 : 28));
  const eddDate = motherObj?.edd ? new Date(motherObj.edd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (isPostnatal ? "Delivered" : "Not recorded");
  const bloodGroup = motherObj?.bloodGroup && motherObj.bloodGroup !== "Not tested" && motherObj.bloodGroup !== "Unknown" ? motherObj.bloodGroup : "Not tested";
  const gravida = motherObj?.gravida ? `G${motherObj.gravida} P1` : "G1";
  const hbValue = motherObj?.vitals?.hb ? `${motherObj.vitals.hb} g/dL` : "—";
  const areaName = motherObj?.phmArea || motherObj?.village || "Buttala · Monaragala";

  const healthTipCardWidth = Math.min(170, Math.max(128, (windowWidth - 56) / 2.15));
  const firstName = motherObj?.name?.trim().split(/\s+/)[0] || user?.name?.trim().split(/\s+/)[0] || "Mother";
  const firstLetter = firstName.charAt(0).toUpperCase();

  return (
    <Shell
      title={t.home}
      backgroundColor="#F4F7F8"
      header={
        <View style={motherStyles.dashboardHeader}>
          <View style={motherStyles.headerTop}>
            <View style={motherStyles.avatar}>
              <Text style={motherStyles.avatarText}>{firstLetter}</Text>
            </View>
            <View style={motherStyles.greeting}>
              <Text style={motherStyles.greetingLabel}>GOOD DAY</Text>
              <Text numberOfLines={1} style={motherStyles.greetingName}>{firstName}</Text>
            </View>
            <Pressable
              accessibilityLabel="Change language"
              onPress={() => setShowLanguageModal(true)}
              style={({ pressed }) => [motherStyles.headerButton, pressed && motherStyles.pressed]}
            >
              <Ionicons name="globe-outline" size={17} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityLabel="Settings"
              onPress={() => navigate("settings")}
              style={({ pressed }) => [motherStyles.headerButton, pressed && motherStyles.pressed]}
            >
              <Ionicons name="settings-outline" size={17} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityLabel={isOnline ? "Go offline" : "Go online"}
              onPress={toggleOnline}
              style={({ pressed }) => [motherStyles.headerButton, pressed && motherStyles.pressed]}
            >
              <Ionicons name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"} size={17} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={motherStyles.headerPills}>
            <View style={motherStyles.locationPill}>
              <Ionicons name="location" size={12} color="#FF6481" />
              <Text style={motherStyles.pillText}>{areaName}</Text>
            </View>
            <View style={motherStyles.rolePill}><Text style={motherStyles.pillText}>PATIENT ({motherObj?.code || "M-1043"})</Text></View>
          </View>
        </View>
      }
    >
      <Card style={motherStyles.pregnancyCard}>
        <View style={motherStyles.pregnancyTop}>
          <View style={motherStyles.progressRing}>
            <Svg width={68} height={68}>
              <Circle cx={34} cy={34} r={30} stroke="#DFF2F7" strokeWidth={5} fill="none" />
              <Circle
                cx={34}
                cy={34}
                r={30}
                stroke="#079DB8"
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - Math.min(40, weeks) / 40)}`}
                rotation={-90}
                origin="34, 34"
              />
            </Svg>
            <View style={motherStyles.ringLabel}>
              <Text style={motherStyles.ringWeeks}>{weeks}</Text>
              <Text style={motherStyles.ringUnit}>WKS</Text>
            </View>
          </View>
          <View style={motherStyles.pregnancyDetails}>
            <View style={motherStyles.pregnancyBadge}>
              <Text style={motherStyles.pregnancyBadgeText}>{isPostnatal ? "👶 Postnatal" : "🤰 Pregnancy"}</Text>
            </View>
            <Text style={motherStyles.pregnancyTitle}>{weeks} Weeks {isPostnatal ? "Postnatal Care" : "Pregnant"}</Text>
            <Text style={motherStyles.edd}>EDD: {eddDate}</Text>
            <View style={motherStyles.progressLabels}>
              <Text style={motherStyles.progressCaption}>Progress</Text>
              <Text style={motherStyles.progressCaption}>{weeks}/40 wks</Text>
            </View>
            <View style={motherStyles.progressTrack}>
              <View style={[motherStyles.progressFill, { width: `${Math.min(100, (weeks / 40) * 100)}%` }]} />
            </View>
          </View>
        </View>
        <View style={motherStyles.stats}>
          {[
            [bloodGroup, "Blood Group"],
            [gravida, "G/P"],
            [hbValue, "Hb"],
          ].map(([value, label]) => (
            <View key={label} style={motherStyles.stat}>
              <Text style={motherStyles.statValue}>{value}</Text>
              <Text style={motherStyles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* LIVE CLINIC QUEUE STATUS CARD */}
      <View style={motherStyles.sectionHeading}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={[motherStyles.liveDot, (liveQueue?.isBeingCalled || liveQueue?.currentlyCalling) ? motherStyles.liveDotActive : null]} />
          <Text style={motherStyles.sectionTitle}>LIVE CLINIC QUEUE</Text>
        </View>
        <Pressable onPress={fetchQueue} hitSlop={8}>
          <Text style={motherStyles.seeAll}>Live Sync 🔄</Text>
        </Pressable>
      </View>

      {liveQueue?.isBeingCalled ? (
        <Card style={motherStyles.activeCallingCard}>
          <View style={motherStyles.activeCallingContent}>
            <View style={motherStyles.activeCallingPulse}>
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={motherStyles.activeCallingBadge}>CALLING NOW</Text>
                <Text style={motherStyles.activeCallingToken}>Token #{liveQueue.myToken?.token}</Text>
              </View>
              <Text style={motherStyles.activeCallingTitle}>The Nurse is Calling You Inside!</Text>
              <Text style={motherStyles.activeCallingSub}>
                {liveQueue.myToken?.clinic || "Clinic Station"} · {liveQueue.myToken?.name || firstName}
              </Text>
            </View>
            <Pressable
              onPress={() => setDismissedToken(liveQueue.myToken?.token)}
              style={({ pressed }) => [motherStyles.acknowledgedBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={motherStyles.acknowledgedBtnText}>Enter</Text>
            </Pressable>
          </View>
        </Card>
      ) : liveQueue?.hasToken ? (
        <Card style={motherStyles.queueCard}>
          <View style={motherStyles.queueContent}>
            <View style={motherStyles.queueTokenCircle}>
              <Text style={motherStyles.queueTokenLabel}>YOUR TOKEN</Text>
              <Text style={motherStyles.queueTokenValue}>#{liveQueue.myToken?.token}</Text>
            </View>
            <View style={motherStyles.queueDetails}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={motherStyles.queuePatient}>{liveQueue.myToken?.name || "Patient"}</Text>
                <View style={[
                  motherStyles.queueStatusBadge,
                  liveQueue.myToken?.status === "now-serving" ? { backgroundColor: "#DCFCE7" } :
                  liveQueue.myToken?.status === "done" ? { backgroundColor: "#E0F2FE" } : { backgroundColor: "#FEF3C7" }
                ]}>
                  <Text style={[
                    motherStyles.queueStatusText,
                    liveQueue.myToken?.status === "now-serving" ? { color: "#16A34A" } :
                    liveQueue.myToken?.status === "done" ? { color: "#0284C7" } : { color: "#D97706" }
                  ]}>
                    {liveQueue.myToken?.status === "now-serving" ? "IN ROOM 🩺" :
                     liveQueue.myToken?.status === "done" ? "COMPLETED ✓" : "WAITING ⏳"}
                  </Text>
                </View>
              </View>
              <Text style={motherStyles.queueSubText}>
                {liveQueue.myToken?.status === "waiting"
                  ? (liveQueue.waitingAhead > 0 ? `${liveQueue.waitingAhead} patient${liveQueue.waitingAhead > 1 ? "s" : ""} ahead of you` : "You are next in line!")
                  : liveQueue.myToken?.status === "now-serving"
                  ? "Currently inside consultation room"
                  : "Visit completed for today"}
              </Text>
              {liveQueue.currentlyCalling && (
                <View style={motherStyles.queueClinicCallBar}>
                  <Ionicons name="volume-medium-outline" size={13} color="#079DB8" />
                  <Text style={motherStyles.queueClinicCallText}>
                    Clinic Serving: <Text style={{ fontWeight: "800" }}>Token #{liveQueue.currentlyCalling.token}</Text> ({liveQueue.currentlyCalling.name})
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      ) : liveQueue?.currentlyCalling ? (
        <Card style={motherStyles.queueCard}>
          <View style={motherStyles.queueClinicActiveRow}>
            <View style={motherStyles.queueActiveIconBox}>
              <Ionicons name="business-outline" size={20} color="#079DB8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={motherStyles.queueClinicHeading}>Clinic Live Session</Text>
              <Text style={motherStyles.queueClinicServing}>
                Now Calling: <Text style={{ fontWeight: "800", color: "#E11D48" }}>Token #{liveQueue.currentlyCalling.token}</Text> · {liveQueue.currentlyCalling.name}
              </Text>
              <Text style={motherStyles.queueClinicLoc}>{liveQueue.currentlyCalling.clinic || areaName}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <View style={motherStyles.sectionHeading}>
        <Text style={motherStyles.sectionTitle}>NEXT APPOINTMENT</Text>
        <Pressable onPress={() => navigate("mother-appointments")} hitSlop={8}>
          <Text style={motherStyles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {next ? (
        <Card style={motherStyles.appointmentCard}>
          <View style={motherStyles.appointmentAccent} />
          <View style={motherStyles.appointmentContent}>
            <View style={motherStyles.appointmentHeading}>
              <View style={motherStyles.appointmentText}>
                <Text style={motherStyles.appointmentTitle}>{next.type || "Clinic Visit"}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {next.status && (
                  <View style={[motherStyles.apptStatusPill, { backgroundColor: next.status === "confirmed" ? "#DCFCE7" : next.status === "rescheduled" ? "#FFEDD5" : "#EEF2FF" }]}>
                    <Text style={{ fontSize: 9.5, fontWeight: "800", color: next.status === "confirmed" ? "#16A34A" : next.status === "rescheduled" ? "#C2410C" : "#4F46E5" }}>
                      {next.status === "confirmed" ? "CONFIRMED" : next.status === "rescheduled" ? "RESCHEDULED" : "PENDING"}
                    </Text>
                  </View>
                )}
                <View style={motherStyles.calendarIcon}>
                  <Ionicons name="calendar-outline" size={19} color="#079DB8" />
                </View>
              </View>
            </View>
            <View style={motherStyles.appointmentDetail}>
              <Ionicons name="calendar" size={13} color="#8793B4" />
              <Text style={motherStyles.appointmentSub}>{formatAppointmentDate(next.date)}</Text>
            </View>
            <View style={motherStyles.appointmentDetail}>
              <Ionicons name="time-outline" size={13} color="#8793B4" />
              <Text style={motherStyles.appointmentSub}>{next.time || "Scheduled Time"}</Text>
            </View>
            <View style={motherStyles.appointmentDetail}>
              <Ionicons name="location" size={13} color="#FF6481" />
              <Text style={motherStyles.appointmentSub}>{next.place || "MOH Clinic"}</Text>
            </View>
            <Pressable
              onPress={() => navigate("mother-appointments")}
              style={({ pressed }) => [motherStyles.reminderButton, pressed && motherStyles.pressed]}
            >
              <Text style={motherStyles.reminderButtonText}>Manage Appointments</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card style={motherStyles.noApptCard}>
          <View style={motherStyles.noApptContent}>
            <View style={motherStyles.noApptIconBox}>
              <Ionicons name="calendar-outline" size={24} color="#079DB8" />
            </View>
            <View style={{ flex: 1, paddingRight: 8, paddingLeft: 10 }}>
              <Text style={motherStyles.noApptTitle}>No Upcoming Appointments</Text>
              <Text style={motherStyles.noApptSubtitle}>You have no visits scheduled right now. Request an appointment anytime.</Text>
            </View>
            <Pressable
              onPress={() => navigate("mother-appointments")}
              style={({ pressed }) => [motherStyles.requestApptBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={motherStyles.requestApptBtnText}>Request</Text>
            </Pressable>
          </View>
        </Card>
      )}

      <Text style={[motherStyles.sectionTitle, motherStyles.quickAccessTitle]}>QUICK ACCESS</Text>
      <View style={motherStyles.quickGrid}>
        <QuickAccessTile icon="document-text-outline" title="My Records" subtitle="Pregnancy history" color="#0397B7" background="#E7F6FA" onPress={() => navigate("mother-records")} />
        <QuickAccessTile icon="checkmark" title="Health Tips" subtitle="Daily guidance" color="#059669" background="#E5F5F0" />
        <QuickAccessTile icon="people-outline" title="Family Consent" subtitle="Manage access" color="#E8791A" background="#FFF2E7" onPress={() => navigate("mother-consent")} />
        <QuickAccessTile icon="notifications-outline" title="Reminders" subtitle="Daily reminders" color="#883CF6" background="#F3EBFF" onPress={() => navigate("mother-appointments")} />
      </View>

      <View style={motherStyles.healthTipsHeading}>
        <Text style={motherStyles.sectionTitle}>HEALTH TIPS</Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={motherStyles.healthTipsRow}
      >
        {HEALTH_TIPS.map((tip) => (
          <Card key={tip.id} style={{ ...motherStyles.healthTipCard, width: healthTipCardWidth }}>
            <Text accessibilityLabel={tip.text} style={motherStyles.healthTipIcon}>{tip.icon}</Text>
            <Text style={motherStyles.healthTipText}>{tip.text}</Text>
          </Card>
        ))}
      </ScrollView>

      {/* URGENT LIVE CLINIC CALL MODAL */}
      <Modal
        visible={Boolean(liveQueue?.isBeingCalled && dismissedToken !== liveQueue?.myToken?.token)}
        transparent
        animationType="fade"
      >
        <View style={motherStyles.callModalBackdrop}>
          <View style={motherStyles.callModalCard}>
            <View style={motherStyles.callModalHeader}>
              <View style={motherStyles.callModalIconBox}>
                <Ionicons name="megaphone" size={28} color="#FFFFFF" />
              </View>
              <Text style={motherStyles.callModalTitle}>YOUR TOKEN IS BEING CALLED!</Text>
              <Text style={motherStyles.callModalSubtitle}>Please proceed to the Clinic Room immediately</Text>
            </View>

            <View style={motherStyles.callTokenBox}>
              <Text style={motherStyles.callTokenLabel}>TOKEN NUMBER</Text>
              <Text style={motherStyles.callTokenNumber}>#{liveQueue?.myToken?.token}</Text>
              <Text style={motherStyles.callPatientName}>
                {liveQueue?.myToken?.name || liveQueue?.myToken?.motherName || firstName}
              </Text>
              <View style={motherStyles.callLocationBadge}>
                <Ionicons name="location" size={13} color="#E11D48" />
                <Text style={motherStyles.callLocationText}>
                  {liveQueue?.myToken?.clinic || "Buttala MOH Clinic"} · Room 1
                </Text>
              </View>
            </View>

            <View style={motherStyles.callModalActions}>
              <Pressable
                onPress={() => setDismissedToken(liveQueue?.myToken?.token)}
                style={({ pressed }) => [motherStyles.callEnterBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="walk" size={18} color="#FFFFFF" />
                <Text style={motherStyles.callEnterBtnText}>I'm Entering the Room</Text>
              </Pressable>
              <Pressable
                onPress={() => setDismissedToken(liveQueue?.myToken?.token)}
                style={({ pressed }) => [motherStyles.callDismissBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={motherStyles.callDismissBtnText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

function QuickAccessTile({
  icon,
  title,
  subtitle,
  color,
  background,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  background: string;
  onPress?: () => void;
}) {
  const content = (
    <Card style={motherStyles.quickCard}>
      <View style={[motherStyles.quickIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text numberOfLines={1} style={motherStyles.quickTitle}>{title}</Text>
      <Text numberOfLines={1} style={motherStyles.quickSubtitle}>{subtitle}</Text>
    </Card>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={motherStyles.quickTile}>{content}</Pressable>
  ) : (
    <View style={motherStyles.quickTile}>{content}</View>
  );
}

function formatAppointmentDate(value: string) {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isoDate) return value;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const motherStyles = StyleSheet.create({
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#94A3B8" },
  liveDotActive: { backgroundColor: "#10B981" },
  activeCallingCard: {
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
    borderWidth: 1.5,
  },
  activeCallingContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeCallingPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
  },
  activeCallingBadge: {
    backgroundColor: "#FFE4E6",
    color: "#E11D48",
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeCallingToken: { color: "#E11D48", fontSize: 13, fontWeight: "900" },
  activeCallingTitle: { color: "#9F1239", fontSize: 13, fontWeight: "800", marginTop: 2 },
  activeCallingSub: { color: "#BE123C", fontSize: 10, marginTop: 1 },
  acknowledgedBtn: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acknowledgedBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  queueCard: { borderRadius: 16, padding: 13, marginBottom: 14, backgroundColor: "#FFFFFF" },
  queueContent: { flexDirection: "row", alignItems: "center", gap: 13 },
  queueTokenCircle: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#E6F7FA",
    borderWidth: 1.5,
    borderColor: "#BFEBF4",
    alignItems: "center",
    justifyContent: "center",
  },
  queueTokenLabel: { color: "#078EA9", fontSize: 7, fontWeight: "800", letterSpacing: 0.5 },
  queueTokenValue: { color: "#057A91", fontSize: 18, fontWeight: "900", marginTop: 1 },
  queueDetails: { flex: 1 },
  queuePatient: { color: "#152B38", fontSize: 13, fontWeight: "800" },
  queueStatusBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2.5 },
  queueStatusText: { fontSize: 8.5, fontWeight: "800" },
  queueSubText: { color: "#647895", fontSize: 10.5, marginTop: 2 },
  queueClinicCallBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0F9FB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  queueClinicCallText: { color: "#086F84", fontSize: 9.5 },
  queueClinicActiveRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  queueActiveIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E6F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  queueClinicHeading: { color: "#8793B4", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  queueClinicServing: { color: "#152B38", fontSize: 12.5, marginTop: 2 },
  queueClinicLoc: { color: "#647895", fontSize: 10, marginTop: 1 },
  callModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  callModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  callModalHeader: { alignItems: "center", marginBottom: 16 },
  callModalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  callModalTitle: {
    color: "#E11D48",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  callModalSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  callTokenBox: {
    width: "100%",
    backgroundColor: "#FFF1F2",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  callTokenLabel: {
    color: "#BE123C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  callTokenNumber: {
    color: "#E11D48",
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 48,
    marginVertical: 4,
  },
  callPatientName: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "800",
  },
  callLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  callLocationText: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "700",
  },
  callModalActions: {
    width: "100%",
    gap: 9,
  },
  callEnterBtn: {
    width: "100%",
    backgroundColor: "#E11D48",
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  callEnterBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  callDismissBtn: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  callDismissBtnText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  dashboardHeader: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  avatarText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  greeting: { flex: 1, minWidth: 0, paddingLeft: 2 },
  greetingLabel: { color: "rgba(255,255,255,0.86)", fontSize: 8, fontWeight: "800", letterSpacing: 0.45 },
  greetingName: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 1 },
  headerButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerPills: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8, paddingLeft: 43 },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  rolePill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  pillText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  pregnancyCard: { borderRadius: 16, padding: 14, marginBottom: 14 },
  pregnancyTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  progressRing: { width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  ringWeeks: { color: "#079DB8", fontSize: 17, fontWeight: "800", lineHeight: 19 },
  ringUnit: { color: "#8793B4", fontSize: 7, fontWeight: "700", marginTop: 1 },
  pregnancyDetails: { flex: 1, minWidth: 0 },
  pregnancyBadge: { alignSelf: "flex-start", backgroundColor: "#D8F7FC", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 5 },
  pregnancyBadgeText: { color: "#078AA5", fontSize: 10, fontWeight: "700" },
  pregnancyTitle: { color: "#152B38", fontSize: 14, fontWeight: "800" },
  edd: { color: "#76849E", fontSize: 11, marginTop: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 7, marginBottom: 3 },
  progressCaption: { color: "#8490AA", fontSize: 9 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "#DCEFF4", overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: "#079DB8" },
  stats: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E7EEF1", marginTop: 12, paddingTop: 10 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: "#152B38", fontSize: 13, fontWeight: "800" },
  statLabel: { color: "#8793B4", fontSize: 9, marginTop: 4 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 7 },
  sectionTitle: { color: "#65758C", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  seeAll: { color: "#078EA9", fontSize: 10, fontWeight: "700" },
  appointmentCard: { flexDirection: "row", overflow: "hidden", borderRadius: 16, padding: 0, marginBottom: 15 },
  appointmentAccent: { width: 4, backgroundColor: "#079DB8" },
  appointmentContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 11 },
  appointmentHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  appointmentText: { flex: 1, minWidth: 0 },
  appointmentTitle: { color: "#152B38", fontSize: 13, fontWeight: "800" },
  calendarIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#DDF8FC", marginLeft: 8 },
  appointmentDetail: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  appointmentSub: { color: "#647895", fontSize: 10, flexShrink: 1 },
  reminderButton: { minHeight: 33, marginTop: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#079DB8" },
  reminderButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  quickAccessTitle: { marginTop: 1, marginBottom: 8 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  quickTile: { width: "49%" },
  quickCard: { minHeight: 102, borderRadius: 15, padding: 11, marginBottom: 9 },
  quickIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickTitle: { color: "#172E3B", fontSize: 11, fontWeight: "700" },
  quickSubtitle: { color: "#8793B4", fontSize: 9, marginTop: 3 },
  healthTipsHeading: { marginTop: 2, marginBottom: 8 },
  healthTipsRow: { gap: 10, paddingBottom: 8 },
  healthTipCard: { minHeight: 130, borderRadius: 15, padding: 13, marginBottom: 0, justifyContent: "space-between" },
  healthTipIcon: { fontSize: 24, lineHeight: 30 },
  healthTipText: { color: "#172E3B", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  noApptCard: { borderRadius: 16, padding: 14, marginBottom: 15, backgroundColor: "#FFFFFF" },
  noApptContent: { flexDirection: "row", alignItems: "center" },
  noApptIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F7FA" },
  noApptTitle: { color: "#152B38", fontSize: 13, fontWeight: "800" },
  noApptSubtitle: { color: "#8793B4", fontSize: 10.5, marginTop: 2, lineHeight: 14 },
  requestApptBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#079DB8", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  requestApptBtnText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "800" },
  apptStatusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
});

type AppointmentStatus = "pending" | "confirmed" | "upcoming" | "rescheduled" | "rejected" | "completed" | "done" | "missed" | "cancelled";
type MotherAppointmentRecord = {
  _id: string;
  type: string;
  date: string;
  place?: string;
  notes?: string;
  category?: string;
  targetRole?: "nursing" | "phm";
  status: AppointmentStatus;
  rejectionReason?: string;
  rescheduledNotes?: string;
};
export function MotherAppointments() {
  const { language } = useApp();
  const p = usePalette();
  const [appointments, setAppointments] = useState<MotherAppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<MotherAppointmentRecord | null>(null);
  const [actionTarget, setActionTarget] = useState<MotherAppointmentRecord | null>(null);
  const [formType, setFormType] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formTargetRole, setFormTargetRole] = useState<"phm" | "nursing">("phm");
  const [formPlace, setFormPlace] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateObject, setSelectedDateObject] = useState<Date | null>(null);
  const [selectedTimeObject, setSelectedTimeObject] = useState<Date | null>(null);

  const refreshAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAppointments(await api<MotherAppointmentRecord[]>("/me/appointments"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAppointments();
  }, [refreshAppointments]);

  useEffect(() => {
    if (Platform.OS === "android" && __DEV__ && showDatePicker) {
      console.info("[ANDROID] Native appointment date picker mounted");
    }
    if (Platform.OS === "ios" && __DEV__ && showDatePicker) {
      console.info("[IOS PICKER] Date picker rendered");
    }
  }, [showDatePicker]);

  useEffect(() => {
    if (Platform.OS === "android" && __DEV__ && showTimePicker) {
      console.info("[ANDROID] Native appointment time picker mounted");
    }
    if (Platform.OS === "ios" && __DEV__ && showTimePicker) {
      console.info("[IOS PICKER] Time picker rendered");
    }
  }, [showTimePicker]);

  const openEditor = (appointment?: MotherAppointmentRecord) => {
    setEditing(appointment ?? null);
    setFormType(appointment?.type ?? "");
    setFormTargetRole(appointment?.targetRole ?? (appointment?.place?.toLowerCase().includes("clinic") ? "nursing" : "phm"));
    setFormDate(appointment ? appointmentInputDate(appointment.date) : "");
    setFormTime(appointment ? appointmentInputTime(appointment.date) : "");
    setFormPlace(appointment?.place ?? "");
    setFormNotes(appointment?.notes ?? "");
    setError("");
    setMessage("");
    setEditorOpen(true);
  };

  const openDatePicker = () => {
    if (Platform.OS === "ios" && __DEV__) console.info("[IOS PICKER] Date field pressed");
    if (Platform.OS === "android" && __DEV__) console.info("[ANDROID] Opening appointment date picker");
    setSelectedDateObject(pickerDateTime(formDate, formTime));
    setShowTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    if (Platform.OS === "ios" && __DEV__) console.info("[IOS PICKER] Time field pressed");
    if (Platform.OS === "android" && __DEV__) console.info("[ANDROID] Opening appointment time picker");
    setSelectedTimeObject(pickerDateTime(formDate, formTime));
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const onDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "ios" && __DEV__) console.info("[IOS PICKER] Date changed", selectedDate);
    if (Platform.OS === "android" && __DEV__) console.info("[ANDROID] Date picker changed", event.type, selectedDate);
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (!selectedDate) return;
    setSelectedDateObject(selectedDate);
    if (Platform.OS === "android") {
      if (event.type === "set") setFormDate(formatDateForApi(selectedDate));
      setShowDatePicker(false);
    }
  };

  const onTimePickerChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "ios" && __DEV__) console.info("[IOS PICKER] Time changed", selectedTime);
    if (Platform.OS === "android" && __DEV__) console.info("[ANDROID] Time picker changed", event.type, selectedTime);
    if (event.type === "dismissed") {
      setShowTimePicker(false);
      return;
    }
    if (!selectedTime) return;
    setSelectedTimeObject(selectedTime);
    if (Platform.OS === "android") {
      if (event.type === "set") setFormTime(formatTimeForApi(selectedTime));
      setShowTimePicker(false);
    }
  };

  const confirmIosDatePicker = () => {
    if (selectedDateObject) setFormDate(formatDateForApi(selectedDateObject));
    setShowDatePicker(false);
  };

  const confirmIosTimePicker = () => {
    if (selectedTimeObject) setFormTime(formatTimeForApi(selectedTimeObject));
    setShowTimePicker(false);
  };

  const saveAppointment = async () => {
    const date = parseAppointmentDateTime(formDate, formTime);
    if (!formType.trim()) {
      setError("Enter an appointment type.");
      return;
    }
    if (!date) {
      setError("Enter a valid date and time (YYYY-MM-DD and HH:MM).");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = {
        type: formType.trim(),
        date: date.toISOString(),
        targetRole: formTargetRole,
        place: formPlace.trim() || (formTargetRole === "nursing" ? "Buttala MOH Clinic" : "Home / Divisional Visit"),
        notes: formNotes.trim(),
      };
      if (editing) {
        await api(`/me/appointments/${encodeURIComponent(editing._id)}`, { method: "PATCH", body });
        setMessage("Appointment request updated.");
      } else {
        await api("/me/appointments", { method: "POST", body });
        setMessage("Appointment request sent for review.");
      }
      setEditorOpen(false);
      await refreshAppointments();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the appointment.");
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api(`/me/appointments/${encodeURIComponent(actionTarget._id)}`, { method: "DELETE" });
      setMessage("Appointment cancelled.");
      setActionTarget(null);
      await refreshAppointments();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update the appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title={T[language].nextAppt}>
      <View style={appointmentStyles.titleRow}>
        <SectionTitle>Visit timeline</SectionTitle>
        <Button title="Request" icon="add" onPress={() => !saving && openEditor()} style={appointmentStyles.addButton} />
      </View>
      {loading ? <Card><Text style={s.muted}>Loading appointments…</Text></Card> : null}
      {!loading && !appointments.length && !error ? <Card><Text style={s.muted}>No appointments yet. Request an appointment to get started.</Text></Card> : null}
      {appointments.map((appointment, i) => {
        const rawStatus = appointment.status;
        const status = rawStatus === "done" ? "completed" : rawStatus;
        const dotColor = status === "confirmed" || status === "upcoming" ? p.color
          : status === "completed" ? "#10B981"
          : status === "missed" || status === "rejected" ? "#DC2626"
          : status === "rescheduled" ? "#EA580C"
          : "#6366F1"; // pending
        return (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center", width: 20 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 20, backgroundColor: dotColor }} />
            {i < appointments.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: "#D7E3E1" }} />}
          </View>
          <Card style={{ flex: 1 }} label={i === 0 ? "TIMELINE ITEM" : undefined}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[s.muted, { fontWeight: "700" }]}>{formatAppointmentDateTime(appointment.date)}</Text>
              <View style={{ backgroundColor: appointment.targetRole === "nursing" ? "#FEF3C7" : "#EDE9FE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: appointment.targetRole === "nursing" ? "#B45309" : "#6D28D9" }}>
                  {appointment.targetRole === "nursing" ? "🏥 Clinic Nurse" : "🩺 PHM Midwife"}
                </Text>
              </View>
            </View>
            <Text style={s.rowTitle}>{appointment.type}</Text>
            {appointment.place ? <Text style={s.rowSub}>{appointment.place}</Text> : null}
            {appointment.notes ? <Text style={[s.muted, { marginTop: 5 }]}>{appointment.notes}</Text> : null}

            {appointment.rescheduledNotes ? (
              <View style={{ backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5", borderRadius: 8, padding: 8, marginTop: 6 }}>
                <Text style={{ fontSize: 11, color: "#C2410C", fontWeight: "700" }}>⚠️ New Time Proposd by Staff:</Text>
                <Text style={{ fontSize: 11, color: "#9A3412", marginTop: 2 }}>{appointment.rescheduledNotes}</Text>
              </View>
            ) : null}

            {appointment.rejectionReason ? (
              <View style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2", borderRadius: 8, padding: 8, marginTop: 6 }}>
                <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "700" }}>✕ Appointment Rejected:</Text>
                <Text style={{ fontSize: 11, color: "#B91C1C", marginTop: 2 }}>{appointment.rejectionReason}</Text>
              </View>
            ) : null}

            <View style={appointmentStyles.statusRow}>
              <Chip
                text={status === "pending" ? "Pending Review" : status === "confirmed" ? "Confirmed" : status === "rescheduled" ? "Rescheduled" : status === "rejected" ? "Rejected" : status}
                tone={status === "completed" || status === "confirmed" ? "ok" : status === "missed" || status === "rejected" ? "danger" : status === "rescheduled" ? "warn" : "neutral"}
              />
            </View>
            {status === "upcoming" || status === "pending" || status === "rescheduled" ? (
              <View style={appointmentStyles.actionGrid}>
                <Pressable disabled={saving} onPress={() => openEditor(appointment)} style={appointmentStyles.secondaryAction}>
                  <Ionicons name="create-outline" size={15} color="#087F98" />
                  <Text style={appointmentStyles.secondaryActionText}>Edit Request</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => setActionTarget(appointment)} style={appointmentStyles.secondaryAction}>
                  <Ionicons name="close-circle-outline" size={15} color="#65758A" />
                  <Text style={appointmentStyles.secondaryActionText}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        </View>
        );
      })}
      {error ? <Text style={appointmentStyles.errorText}>{error}</Text> : null}
      {message ? <Text style={appointmentStyles.successText}>{message}</Text> : null}

      <Modal visible={actionTarget !== null} transparent animationType="fade" onRequestClose={() => !saving && setActionTarget(null)}>
        <View style={appointmentStyles.modalBackdrop}>
          <View style={appointmentStyles.confirmModal}>
            <Text style={appointmentStyles.modalTitle}>
              Cancel Appointment?
            </Text>
            {actionTarget ? (
              <>
                <Text style={appointmentStyles.modalAppointmentTitle}>{actionTarget.type}</Text>
                <Text style={appointmentStyles.modalText}>{formatAppointmentDateTime(actionTarget.date)}</Text>
                {actionTarget.place ? <Text style={appointmentStyles.modalText}>{actionTarget.place}</Text> : null}
              </>
            ) : null}
            {actionTarget ? <Text style={appointmentStyles.modalText}>Are you sure you want to cancel this appointment request?</Text> : null}
            {error ? <Text style={appointmentStyles.errorText}>{error}</Text> : null}
            <View style={appointmentStyles.modalActions}>
              <Pressable disabled={saving} onPress={() => setActionTarget(null)} style={appointmentStyles.keepButton}>
                <Text style={appointmentStyles.keepButtonText}>Keep Appointment</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={() => void confirmAction()} style={[appointmentStyles.confirmButton, saving && { opacity: 0.6 }]}>
                <Text style={appointmentStyles.confirmButtonText}>
                  {saving ? "Saving…" : "Cancel Appointment"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => !saving && setEditorOpen(false)}>
        <View style={appointmentStyles.modalBackdrop}>
          <View style={appointmentStyles.editorModal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={appointmentStyles.modalTitle}>{editing ? "Edit Appointment Request" : "Request Appointment"}</Text>

              {/* TARGET SELECTION: PHM vs NURSE */}
              <Text style={appointmentStyles.fieldLabel}>APPOINTMENT FOR</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 8 }}>
                <Pressable
                  onPress={() => {
                    setFormTargetRole("phm");
                    if (!formPlace || formPlace.toLowerCase().includes("clinic")) setFormPlace("PHM Home / Divisional Visit");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 9,
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: formTargetRole === "phm" ? "#7C3AED" : "#E2E8F0",
                    backgroundColor: formTargetRole === "phm" ? "#F5F3FF" : "#F8FAFC",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: formTargetRole === "phm" ? "#7C3AED" : "#64748B" }}>
                    🩺 Midwife (PHM)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setFormTargetRole("nursing");
                    setFormPlace("Buttala MOH Clinic");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 9,
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: formTargetRole === "nursing" ? "#D97706" : "#E2E8F0",
                    backgroundColor: formTargetRole === "nursing" ? "#FEF3C7" : "#F8FAFC",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: formTargetRole === "nursing" ? "#D97706" : "#64748B" }}>
                    🏥 Clinic Nurse
                  </Text>
                </Pressable>
              </View>

              <Text style={appointmentStyles.fieldLabel}>Appointment purpose</Text>
              <TextInput value={formType} onChangeText={setFormType} placeholder={formTargetRole === "nursing" ? "e.g. Vaccination / Weight Check" : "e.g. ANC Visit / Pregnancy Check"} style={appointmentStyles.input} />

              <Text style={appointmentStyles.fieldLabel}>Requested Date</Text>
              <AppointmentDateTimeField
                mode="date"
                value={formDate}
                placeholder="Select date"
                onPress={openDatePicker}
                onWebChange={setFormDate}
              />
              <Text style={appointmentStyles.fieldLabel}>Requested Time</Text>
              <AppointmentDateTimeField
                mode="time"
                value={formTime}
                placeholder="Select time"
                onPress={openTimePicker}
                onWebChange={setFormTime}
              />
              <Text style={appointmentStyles.fieldLabel}>Clinic / Location</Text>
              <TextInput value={formPlace} onChangeText={setFormPlace} placeholder="Clinic or location" style={appointmentStyles.input} />
              <Text style={appointmentStyles.fieldLabel}>Notes for Staff</Text>
              <TextInput value={formNotes} onChangeText={setFormNotes} placeholder="Reason or specific requests..." style={[appointmentStyles.input, appointmentStyles.notesInput]} multiline />
              {error ? <Text style={appointmentStyles.errorText}>{error}</Text> : null}
              <View style={appointmentStyles.modalActions}>
                <Pressable disabled={saving} onPress={() => setEditorOpen(false)} style={appointmentStyles.keepButton}>
                  <Text style={appointmentStyles.keepButtonText}>Cancel</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => void saveAppointment()} style={[appointmentStyles.confirmButton, saving && { opacity: 0.6 }]}>
                  <Text style={appointmentStyles.confirmButtonText}>{saving ? "Saving…" : editing ? "Save Changes" : "Send Request"}</Text>
                </Pressable>
              </View>
            </ScrollView>
            {Platform.OS === "android" && showDatePicker ? (
              <DateTimePicker
                value={selectedDateObject ?? new Date()}
                mode="date"
                display="default"
                onChange={onDatePickerChange}
              />
            ) : null}
            {Platform.OS === "android" && showTimePicker ? (
              <DateTimePicker
                value={selectedTimeObject ?? new Date()}
                mode="time"
                display="default"
                is24Hour
                onChange={onTimePickerChange}
              />
            ) : null}
            {Platform.OS === "ios" && (showDatePicker || showTimePicker) ? (
              <View style={appointmentStyles.iosPickerOverlay}>
                <Pressable
                  accessibilityLabel="Close date and time picker"
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                  style={appointmentStyles.iosPickerScrim}
                />
                <View style={appointmentStyles.pickerModal}>
                  <DateTimePicker
                    value={showDatePicker ? selectedDateObject ?? new Date() : selectedTimeObject ?? new Date()}
                    mode={showDatePicker ? "date" : "time"}
                    display="spinner"
                    is24Hour
                    onChange={showDatePicker ? onDatePickerChange : onTimePickerChange}
                  />
                  <View style={appointmentStyles.modalActions}>
                    <Pressable onPress={() => {
                      setShowDatePicker(false);
                      setShowTimePicker(false);
                    }} style={appointmentStyles.keepButton}>
                      <Text style={appointmentStyles.keepButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={showDatePicker ? confirmIosDatePicker : confirmIosTimePicker} style={appointmentStyles.confirmButton}>
                      <Text style={appointmentStyles.confirmButtonText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

    </Shell>
  );
}

function AppointmentDateTimeField({
  mode,
  value,
  placeholder,
  onPress,
  onWebChange,
}: {
  mode: "date" | "time";
  value: string;
  placeholder: string;
  onPress: () => void;
  onWebChange: (value: string) => void;
}) {
  const icon = mode === "date" ? "calendar-outline" : "time-outline";
  return (
    <View style={appointmentStyles.pickerField}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value || placeholder}
        onPress={Platform.OS === "web" ? undefined : onPress}
        style={appointmentStyles.pickerFieldContent}
      >
        <Text style={[appointmentStyles.pickerFieldText, !value && appointmentStyles.pickerPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name={icon} size={17} color="#65758A" />
      </Pressable>
      {Platform.OS === "web" ? React.createElement("input", {
        type: mode,
        value,
        "aria-label": mode === "date" ? "Appointment date" : "Appointment time",
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onWebChange(event.currentTarget.value),
        onClick: (event: React.MouseEvent<HTMLInputElement>) => {
          const input = event.currentTarget;
          if (typeof input.showPicker === "function") input.showPicker();
        },
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.01,
          zIndex: 1,
          cursor: "pointer",
          border: 0,
          padding: 0,
        } as React.CSSProperties,
      }) : null}
    </View>
  );
}

function formatDateForApi(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTimeForApi(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function pickerDateTime(dateValue: string, timeValue: string) {
  const date = new Date();
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (dateParts) date.setFullYear(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
  const timeParts = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (timeParts) date.setHours(Number(timeParts[1]), Number(timeParts[2]), 0, 0);
  return date;
}

function parseAppointmentDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day
    || parsed.getHours() !== hour || parsed.getMinutes() !== minute) return null;
  return parsed;
}

function appointmentInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function appointmentInputTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatAppointmentDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const appointmentStyles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  addButton: { minHeight: 34, paddingHorizontal: 13, borderRadius: 10, marginBottom: 10 },
  statusRow: { marginTop: 8 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  secondaryAction: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: "#DCE6EA", borderRadius: 9, paddingHorizontal: 10 },
  secondaryActionText: { color: "#526782", fontSize: 10, fontWeight: "700" },
  errorText: { color: "#C23636", fontSize: 11, marginVertical: 8 },
  successText: { color: "#0B9B66", fontSize: 11, marginVertical: 8 },
  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 22, backgroundColor: "rgba(16,24,40,0.45)" },
  confirmModal: { borderRadius: 17, backgroundColor: "#FFFFFF", padding: 17 },
  editorModal: { position: "relative", maxHeight: "90%", borderRadius: 17, backgroundColor: "#FFFFFF", padding: 17 },
  iosPickerOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, elevation: 20, justifyContent: "flex-end" },
  iosPickerScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(16,24,40,0.45)" },
  modalTitle: { color: "#101828", fontSize: 15, fontWeight: "800", marginBottom: 12 },
  modalAppointmentTitle: { color: "#152B38", fontSize: 13, fontWeight: "700", marginBottom: 5 },
  modalText: { color: "#65758A", fontSize: 11, marginBottom: 4 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  keepButton: { minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#F1F4F6", paddingHorizontal: 12 },
  keepButtonText: { color: "#526782", fontSize: 10, fontWeight: "700" },
  confirmButton: { minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#079DB8", paddingHorizontal: 12 },
  confirmButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  fieldLabel: { color: "#526782", fontSize: 10, fontWeight: "700", marginTop: 5 },
  input: { minHeight: 38, borderWidth: 1, borderColor: "#DFE5EC", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, color: "#172B42", fontSize: 11, marginTop: 4 },
  pickerField: { minHeight: 38, borderWidth: 1, borderColor: "#DFE5EC", borderRadius: 9, marginTop: 4, overflow: "hidden" },
  pickerFieldContent: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 },
  pickerFieldText: { color: "#172B42", fontSize: 11 },
  pickerPlaceholder: { color: "#98A2B3" },
  pickerModal: { borderRadius: 17, backgroundColor: "#FFFFFF", padding: 17 },
  notesInput: { minHeight: 58, textAlignVertical: "top" },
});

export function MotherRecords() {
  const { language } = useApp();
  const [data, setData] = useState<{
    vitals?: { weight?: number; bp?: string; hb?: number };
    visits?: any[];
    immunizations?: any[];
    growth?: any[];
    children?: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ vitals?: any; visits?: any[]; immunizations?: any[]; growth?: any[]; children?: any[] }>("/me/records")
      .then((res) => {
        if (res) setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const weightVal = data?.vitals?.weight ? `${data.vitals.weight} kg` : "—";
  const bpVal = data?.vitals?.bp ? data.vitals.bp : "—";
  const hbVal = data?.vitals?.hb ? `${data.vitals.hb} g/dL` : "—";

  const imms = data?.immunizations || [];
  const visits = data?.visits || [];
  const growths = data?.growth || [];

  return (
    <Shell title={T[language].myRecords}>
      <Card label="CLINICAL VITALS">
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {[
            ["Weight", weightVal],
            ["BP", bpVal],
            ["Hb", hbVal],
          ].map(([k, v]) => (
            <View key={k} style={{ alignItems: "center" }}>
              <Text style={s.muted}>{k}</Text>
              <Text style={[s.h1, { fontSize: 20 }]}>{v}</Text>
            </View>
          ))}
        </View>
        {weightVal === "—" && bpVal === "—" && hbVal === "—" && (
          <Text style={[s.muted, { textAlign: "center", fontSize: 11, marginTop: 8 }]}>
            Vitals will be recorded during your routine clinic or PHM home visit.
          </Text>
        )}
      </Card>

      <SectionTitle>Immunization Log ({imms.length})</SectionTitle>
      <Card label="IMMUNIZATION LIST">
        {imms.length === 0 ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}>
            <Ionicons name="shield-outline" size={28} color="#94A3B8" />
            <Text style={[s.muted, { marginTop: 6, textAlign: "center", fontWeight: "600" }]}>
              No immunization records logged yet.
            </Text>
            <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, textAlign: "center" }}>
              Vaccines administered by clinic nurses will appear here automatically.
            </Text>
          </View>
        ) : (
          imms.map((imm, idx) => {
            const isDone = !!imm.date;
            return (
              <Row
                key={imm._id || idx}
                icon={isDone ? "shield-checkmark" : "shield-outline"}
                title={imm.vaccine || imm.name || "Vaccine"}
                sub={imm.date ? new Date(imm.date).toLocaleDateString() : (imm.notes || "Due")}
                right={
                  isDone ? (
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  ) : (
                    <Chip text="Due" tone="warn" />
                  )
                }
              />
            );
          })
        )}
      </Card>

      {growths.length > 0 && (
        <>
          <SectionTitle>Child Growth Records ({growths.length})</SectionTitle>
          <Card label="GROWTH MONITORING">
            {growths.map((g, idx) => (
              <Row
                key={g._id || idx}
                icon="bar-chart"
                title={`${g.weight} kg · ${g.height || ""} cm`}
                sub={`Recorded: ${new Date(g.date || g.createdAt || Date.now()).toLocaleDateString()}`}
                right={<Chip text={g.waz || "Normal"} tone="ok" />}
              />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Clinical & Field Visits ({visits.length})</SectionTitle>
      <Card label="VISIT RECORDS">
        {visits.length === 0 ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}>
            <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
            <Text style={[s.muted, { marginTop: 6, textAlign: "center", fontWeight: "600" }]}>
              No clinical visits recorded yet.
            </Text>
            <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, textAlign: "center" }}>
              Routine clinic checkups and PHM home visits will be documented here.
            </Text>
          </View>
        ) : (
          visits.map((vis, idx) => (
            <Row
              key={vis._id || idx}
              icon="document-text"
              title={vis.type || "Clinic Visit"}
              sub={`${new Date(vis.date || Date.now()).toLocaleDateString()} · ${vis.notes || "Recorded in system"}`}
            />
          ))
        )}
      </Card>
    </Shell>
  );
}

export function MotherConsent() {
  const { language, navigate, setShowLanguageModal } = useApp();
  const t = T[language];
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState<EditingFamilyMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [relationshipPicker, setRelationshipPicker] = useState<"new" | "edit" | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [family, preferences] = await Promise.all([
        api<FamilyMember[]>("/me/family"),
        api<{ notificationsEnabled: boolean }>("/me/family/preferences"),
      ]);
      setMembers(family);
      setNotificationsEnabled(preferences.notificationsEnabled);
    } catch (error) {
      setLoadError(familyApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const saveNotificationsPreference = async (enabled: boolean) => {
    setSavingPreference(true);
    setActionError("");
    setMessage("");
    try {
      const preference = await api<{ notificationsEnabled: boolean }>("/me/family/preferences", {
        method: "PATCH",
        body: { notificationsEnabled: enabled },
      });
      setNotificationsEnabled(preference.notificationsEnabled);
    } catch (error) {
      setActionError(familyApiError(error));
    } finally {
      setSavingPreference(false);
    }
  };

  const addMember = async () => {
    if (!name.trim()) {
      setActionError("Please enter the family member's name.");
      return;
    }
    const normalizedPhone = normalizeSriLankanMobile(phone);
    if (!relationship) {
      setActionError("Select a family relationship.");
      return;
    }
    if (!normalizedPhone) {
      setActionError("Enter a valid Sri Lankan mobile number.");
      return;
    }
    setSavingMember(true);
    setActionError("");
    setMessage("");
    try {
      const updatedFamily = await api<FamilyMember[]>("/me/family", {
        method: "POST",
        body: { name: name.trim(), relation: relationship, phone: normalizedPhone },
      });
      setMembers(updatedFamily);
      setName("");
      setRelationship("");
      setPhone("");
      setMessage("Family member added. Consent is pending.");
    } catch (error) {
      setActionError(familyApiError(error));
    } finally {
      setSavingMember(false);
    }
  };

  const updateMember = async () => {
    if (!editing) return;
    const normalizedPhone = normalizeSriLankanMobile(editing.phone);
    if (!editing.name.trim()) {
      setActionError("Enter the family member's name.");
      return;
    }
    if (!editing.relation) {
      setActionError("Select a family relationship.");
      return;
    }
    if (!normalizedPhone) {
      setActionError("Enter a valid Sri Lankan mobile number.");
      return;
    }
    setBusyMemberId(editing.id);
    setActionError("");
    setMessage("");
    try {
      const updatedFamily = await api<FamilyMember[]>(`/me/family/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        body: { name: editing.name.trim(), relation: editing.relation, phone: normalizedPhone },
      });
      setMembers(updatedFamily);
      setEditing(null);
      setMessage("Family member updated.");
    } catch (error) {
      setActionError(familyApiError(error));
    } finally {
      setBusyMemberId(null);
    }
  };

  const removeMember = (member: FamilyMember) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const id = familyMemberId(memberToRemove);
    setMemberToRemove(null);
    setBusyMemberId(id);
    setActionError("");
    setMessage("");
    try {
      setMembers(await api<FamilyMember[]>(`/me/family/${encodeURIComponent(id)}`, { method: "DELETE" }));
      if (editing?.id === id) setEditing(null);
      setMessage("Family member removed.");
    } catch (error) {
      setActionError(familyApiError(error));
    } finally {
      setBusyMemberId(null);
    }
  };

  const revokeMemberConsent = (member: FamilyMember) => {
    const id = familyMemberId(member);
    Alert.alert("Revoke consent?", "This will change the member's consent status to Revoked.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusyMemberId(id);
            setActionError("");
            setMessage("");
            try {
              setMembers(await api<FamilyMember[]>(`/me/family/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: { consentStatus: "REVOKED" },
              }));
              setMessage("Consent revoked.");
            } catch (error) {
              setActionError(familyApiError(error));
            } finally {
              setBusyMemberId(null);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Shell
      title={t.familyConsent}
      backgroundColor="#F4F7F8"
      header={
        <View style={consentStyles.header}>
          <Pressable
            accessibilityLabel="Back to home"
            onPress={() => navigate("mother-home")}
            style={({ pressed }) => [consentStyles.backButton, pressed && consentStyles.pressed]}
          >
            <Ionicons name="chevron-back" size={21} color="#FFFFFF" />
          </Pressable>
          <Text numberOfLines={1} style={consentStyles.headerTitle}>{t.familyConsent}</Text>
          <Pressable
            accessibilityLabel="Change language"
            onPress={() => setShowLanguageModal(true)}
            style={({ pressed }) => [consentStyles.headerIconButton, pressed && consentStyles.pressed]}
          >
            <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityLabel="Settings"
            onPress={() => navigate("settings")}
            style={({ pressed }) => [consentStyles.headerIconButton, pressed && consentStyles.pressed]}
          >
            <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      }
    >
      <View style={consentStyles.intro}>
        <Text style={consentStyles.introEmoji}>👨‍👩‍👧</Text>
        <View style={consentStyles.introCopy}>
          <Text style={consentStyles.introTitle}>Family Consent</Text>
          <Text style={consentStyles.introText}>{t.consentDesc}</Text>
        </View>
      </View>

      <Text style={consentStyles.sectionTitle}>CONSENT</Text>
      <Card style={consentStyles.preferenceCard}>
        <View style={consentStyles.preferenceCopy}>
          <Text style={consentStyles.cardTitle}>Enable family notifications</Text>
          <Text style={consentStyles.cardSubtitle}>Save your appointment reminder preference</Text>
        </View>
        <Switch
          accessibilityLabel="Enable family notifications"
          value={notificationsEnabled}
          onValueChange={saveNotificationsPreference}
          disabled={loading || savingPreference}
          trackColor={{ false: "#D7E0E5", true: "#079DB8" }}
          thumbColor="#FFFFFF"
        />
      </Card>

      <Text style={consentStyles.sectionTitle}>REGISTERED MEMBERS</Text>
      {loading ? (
        <Card style={consentStyles.stateCard}>
          <Text style={consentStyles.cardSubtitle}>Loading family members…</Text>
        </Card>
      ) : loadError ? (
        <Card style={consentStyles.stateCard}>
          <Text style={consentStyles.errorText}>{loadError}</Text>
          <Pressable onPress={() => void loadData()} style={consentStyles.retryButton}>
            <Text style={consentStyles.retryText}>Try again</Text>
          </Pressable>
        </Card>
      ) : members.length === 0 ? (
        <Card style={consentStyles.stateCard}>
          <Text style={consentStyles.cardSubtitle}>No family members have been added yet.</Text>
        </Card>
      ) : members.map((member) => {
        const id = familyMemberId(member);
        const isEditing = editing?.id === id;
        return (
          <View key={id}>
            <Card style={consentStyles.memberCard}>
              <View style={consentStyles.memberAvatar}>
                <Text style={consentStyles.memberInitial}>{(member.name || member.relation).trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={consentStyles.memberCopy}>
                <Text numberOfLines={1} style={consentStyles.memberName}>{member.name || member.relation}</Text>
                <Text style={consentStyles.memberPhone}>
                  {member.name && member.name !== member.relation ? `${member.relation} · ` : ""}{member.phone}
                </Text>
              </View>
              <View style={consentStyles.memberActions}>
                <View style={[consentStyles.statusBadge, statusStyle(memberConsentStatus(member))]}>
                  <Text style={[consentStyles.statusText, statusTextStyle(memberConsentStatus(member))]}>
                    {statusLabel(memberConsentStatus(member))}
                  </Text>
                </View>
                <View style={consentStyles.actionButtons}>
                  {memberConsentStatus(member) === "CONSENTED" ? (
                    <Pressable
                      accessibilityLabel={`Revoke ${member.name || member.relation}'s consent`}
                      disabled={busyMemberId === id}
                      onPress={() => revokeMemberConsent(member)}
                      style={consentStyles.memberAction}
                    >
                      <Ionicons name="shield-outline" size={16} color="#D97706" />
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityLabel={`Edit ${member.name || member.relation}`}
                    disabled={busyMemberId === id}
                    onPress={() => {
                      setActionError("");
                      setEditing(isEditing ? null : {
                        id,
                        name: member.name || "",
                        relation: member.relation,
                        phone: member.phone,
                      });
                    }}
                    style={consentStyles.memberAction}
                  >
                    <Ionicons name={isEditing ? "close-outline" : "create-outline"} size={16} color="#64758A" />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Remove ${member.name || member.relation}`}
                    disabled={busyMemberId === id}
                    onPress={() => removeMember(member)}
                    style={consentStyles.memberAction}
                  >
                    <Ionicons name="trash-outline" size={16} color="#D14343" />
                  </Pressable>
                </View>
              </View>
            </Card>
            {isEditing ? (
              <Card style={consentStyles.editCard}>
                <Text style={consentStyles.cardTitle}>Edit Family Member</Text>
                <TextInput
                  accessibilityLabel="Member name"
                  placeholder="Name"
                  placeholderTextColor="#98A2B3"
                  value={editing.name}
                  onChangeText={(value) => setEditing((current) => current ? { ...current, name: value } : current)}
                  style={consentStyles.input}
                />
                <Pressable onPress={() => setRelationshipPicker("edit")} style={consentStyles.selectInput}>
                  <Text style={editing.relation ? consentStyles.selectValue : consentStyles.placeholderText}>{editing.relation || "Select relationship"}</Text>
                  <Ionicons name="chevron-down" size={17} color="#65758A" />
                </Pressable>
                <TextInput
                  accessibilityLabel="Member phone number"
                  placeholder="07X XXX XXXX or +94 7X XXX XXXX"
                  placeholderTextColor="#98A2B3"
                  value={editing.phone}
                  onChangeText={(value) => setEditing((current) => current ? { ...current, phone: value } : current)}
                  keyboardType="phone-pad"
                  style={consentStyles.input}
                />
                <View style={consentStyles.formActions}>
                  <Pressable onPress={() => setEditing(null)} style={consentStyles.cancelButton}>
                    <Text style={consentStyles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable disabled={busyMemberId === id} onPress={() => void updateMember()} style={consentStyles.addButton}>
                    <Text style={consentStyles.addButtonText}>{busyMemberId === id ? "Saving…" : "Save changes"}</Text>
                  </Pressable>
                </View>
              </Card>
            ) : null}
          </View>
        );
      })}

      <Card style={consentStyles.addCard}>
        <Text style={consentStyles.cardTitle}>Add Family Member</Text>
        <Text style={consentStyles.fieldLabel}>Name</Text>
        <TextInput
          accessibilityLabel="Family member name"
          placeholder="Enter family member name"
          placeholderTextColor="#98A2B3"
          value={name}
          onChangeText={setName}
          style={consentStyles.input}
        />
        <Text style={consentStyles.fieldLabel}>Relationship</Text>
        <Pressable onPress={() => setRelationshipPicker("new")} style={consentStyles.selectInput}>
          <Text style={relationship ? consentStyles.selectValue : consentStyles.placeholderText}>{relationship || "Select relationship"}</Text>
          <Ionicons name="chevron-down" size={17} color="#65758A" />
        </Pressable>
        <Text style={consentStyles.fieldLabel}>Phone</Text>
        <View style={consentStyles.phoneEntry}>
          <View style={consentStyles.countryCode}>
            <Text style={consentStyles.countryCodeText}>LK +94</Text>
          </View>
          <TextInput
            accessibilityLabel="Family member phone number"
            placeholder="7X XXX XXXX"
            placeholderTextColor="#98A2B3"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[consentStyles.input, consentStyles.phoneInput]}
          />
          <Pressable
            accessibilityLabel="Add family member"
            disabled={savingMember}
            onPress={() => void addMember()}
            style={({ pressed }) => [consentStyles.addIconButton, pressed && consentStyles.pressed, savingMember && consentStyles.disabled]}
          >
            <Ionicons name={savingMember ? "hourglass-outline" : "add"} size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text style={consentStyles.cardSubtitle}>Consent will remain pending until confirmed.</Text>
      </Card>

      {actionError ? <Text accessibilityRole="alert" style={consentStyles.errorText}>{actionError}</Text> : null}
      {message ? <Text style={consentStyles.successText}>{message}</Text> : null}

      <Modal
        visible={memberToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberToRemove(null)}
      >
        <View style={consentStyles.modalBackdrop}>
          <View style={consentStyles.confirmModal}>
            <Text style={consentStyles.cardTitle}>Remove this family member?</Text>
            <Text style={consentStyles.cardSubtitle}>
              {memberToRemove ? `Remove ${memberToRemove.name || memberToRemove.relation} from your family list?` : ""}
            </Text>
            <View style={consentStyles.formActions}>
              <Pressable onPress={() => setMemberToRemove(null)} style={consentStyles.cancelButton}>
                <Text style={consentStyles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={memberToRemove ? busyMemberId === familyMemberId(memberToRemove) : true}
                onPress={() => void confirmRemoveMember()}
                style={[consentStyles.removeButton, memberToRemove && busyMemberId === familyMemberId(memberToRemove) && consentStyles.disabled]}
              >
                <Text style={consentStyles.removeButtonText}>
                  {memberToRemove && busyMemberId === familyMemberId(memberToRemove) ? "Removing…" : "Remove"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={consentStyles.privacyNote}>
        <Ionicons name="information-circle-outline" size={14} color="#65758A" />
        <Text style={consentStyles.privacyText}>SMS delivery is not available yet. No messages are sent by this setting.</Text>
      </View>

      <Modal
        visible={relationshipPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRelationshipPicker(null)}
      >
        <View style={consentStyles.modalBackdrop}>
          <View style={consentStyles.relationshipModal}>
            <Text style={consentStyles.cardTitle}>Select relationship</Text>
            <ScrollView style={consentStyles.relationshipList} keyboardShouldPersistTaps="handled">
              {FAMILY_RELATIONSHIPS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    if (relationshipPicker === "new") setRelationship(item);
                    if (relationshipPicker === "edit") setEditing((current) => current ? { ...current, relation: item } : current);
                    setRelationshipPicker(null);
                  }}
                  style={consentStyles.relationshipOption}
                >
                  <Text style={consentStyles.selectValue}>{item}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#98A2B3" />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setRelationshipPicker(null)} style={consentStyles.modalCancel}>
              <Text style={consentStyles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

type FamilyConsentStatus = "PENDING" | "CONSENTED" | "REVOKED";

type FamilyMember = {
  _id?: string;
  id?: string;
  name?: string;
  relation: string;
  phone: string;
  consent?: boolean;
  consentStatus?: FamilyConsentStatus;
};

type EditingFamilyMember = {
  id: string;
  name: string;
  relation: string;
  phone: string;
};

const FAMILY_RELATIONSHIPS = ["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister", "Guardian", "Other"];

function familyMemberId(member: FamilyMember) {
  return String(member._id ?? member.id ?? member.phone);
}

function normalizeSriLankanMobile(value: string) {
  const phone = value.trim().replace(/[\s().-]/g, "");
  if (/^\+947\d{8}$/.test(phone)) return phone;
  if (/^947\d{8}$/.test(phone)) return `+${phone}`;
  if (/^07\d{8}$/.test(phone)) return `+94${phone.slice(1)}`;
  if (/^7\d{8}$/.test(phone)) return `+94${phone}`;
  return null;
}

function familyApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/\b409\b/.test(message)) return "This phone number is already registered.";
  if (/\b401\b|\b403\b/.test(message)) return "Your session has expired. Please sign in again.";
  if (/\b400\b/.test(message)) return "Please check the details and try again.";
  if (/network request failed|failed to fetch|timed? ?out|aborted/i.test(message)) {
    return "Could not connect to MatriCare. Check your connection and try again.";
  }
  return "We couldn't complete that request. Please try again.";
}

function memberConsentStatus(member: FamilyMember): FamilyConsentStatus {
  return member.consentStatus ?? (member.consent ? "CONSENTED" : "PENDING");
}

function statusLabel(status: FamilyConsentStatus) {
  if (status === "CONSENTED") return "Consented ✓";
  if (status === "REVOKED") return "Revoked";
  return "Pending";
}

function statusStyle(status: FamilyConsentStatus) {
  if (status === "CONSENTED") return consentStyles.consentedBadge;
  if (status === "REVOKED") return consentStyles.revokedBadge;
  return consentStyles.pendingBadge;
}

function statusTextStyle(status: FamilyConsentStatus) {
  if (status === "CONSENTED") return consentStyles.consentedText;
  if (status === "REVOKED") return consentStyles.revokedText;
  return consentStyles.pendingText;
}

const consentStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 10 },
  backButton: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  headerTitle: { flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  headerIconButton: { width: 30, height: 30, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  pressed: { opacity: 0.76 },
  intro: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#EFFBFD", borderColor: "#C5EEF5", borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 17 },
  introEmoji: { fontSize: 22 },
  introCopy: { flex: 1 },
  introTitle: { color: "#101828", fontSize: 12, fontWeight: "800", marginBottom: 4 },
  introText: { color: "#526782", fontSize: 10, lineHeight: 15 },
  sectionTitle: { color: "#65758A", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 7 },
  preferenceCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 15, marginBottom: 17 },
  preferenceCopy: { flex: 1 },
  cardTitle: { color: "#101828", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  fieldLabel: { color: "#526782", fontSize: 10, fontWeight: "700", marginTop: 2, marginBottom: -4 },
  cardSubtitle: { color: "#8793A7", fontSize: 10, lineHeight: 14 },
  stateCard: { padding: 13, borderRadius: 15, marginBottom: 10 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 2 },
  retryText: { color: "#078EA9", fontSize: 11, fontWeight: "800" },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 14, marginBottom: 8 },
  memberAvatar: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#079DB8" },
  memberInitial: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: "#172B42", fontSize: 11, fontWeight: "700" },
  memberPhone: { color: "#8793A7", fontSize: 9, marginTop: 3 },
  memberActions: { alignItems: "flex-end", gap: 5 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 8, fontWeight: "800" },
  consentedBadge: { backgroundColor: "#DCFCEB" },
  consentedText: { color: "#0B9B66" },
  pendingBadge: { backgroundColor: "#FFF4D6" },
  pendingText: { color: "#AE7100" },
  revokedBadge: { backgroundColor: "#FEE7E7" },
  revokedText: { color: "#C23636" },
  actionButtons: { flexDirection: "row", gap: 1 },
  memberAction: { width: 27, height: 25, alignItems: "center", justifyContent: "center" },
  editCard: { padding: 13, borderRadius: 15, marginTop: -2, marginBottom: 9 },
  addCard: { padding: 13, borderRadius: 15, marginTop: 1 },
  selectInput: { minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#DFE5EC", borderRadius: 10, paddingHorizontal: 11, marginTop: 8, marginBottom: 8, backgroundColor: "#FFFFFF" },
  selectValue: { color: "#172B42", fontSize: 11 },
  placeholderText: { color: "#A2ADBC", fontSize: 11 },
  input: { minHeight: 39, borderWidth: 1, borderColor: "#DFE5EC", borderRadius: 10, paddingHorizontal: 11, color: "#172B42", fontSize: 11, marginTop: 8, marginBottom: 8, backgroundColor: "#FFFFFF" },
  phoneEntry: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  countryCode: { minHeight: 39, borderWidth: 1, borderColor: "#DFE5EC", borderRadius: 10, justifyContent: "center", paddingHorizontal: 9, backgroundColor: "#FFFFFF" },
  countryCodeText: { color: "#65758A", fontSize: 10, fontWeight: "600" },
  phoneInput: { flex: 1, minWidth: 0, marginTop: 0, marginBottom: 0 },
  addIconButton: { width: 39, height: 39, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#079DB8" },
  disabled: { opacity: 0.55 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 2 },
  cancelButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F4F6" },
  cancelButtonText: { color: "#65758A", fontSize: 10, fontWeight: "700" },
  addButton: { minHeight: 36, paddingHorizontal: 15, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#079DB8" },
  addButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  errorText: { color: "#C23636", fontSize: 11, marginTop: 4, marginBottom: 8 },
  successText: { color: "#0B9B66", fontSize: 11, marginTop: 4, marginBottom: 8 },
  privacyNote: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 5, backgroundColor: "#F0F3F5", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 2 },
  privacyText: { flex: 1, color: "#65758A", fontSize: 9, lineHeight: 13, textAlign: "center" },
  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(16,24,40,0.4)" },
  relationshipModal: { width: "100%", maxHeight: "80%", borderRadius: 16, padding: 15, backgroundColor: "#FFFFFF" },
  confirmModal: { width: "100%", borderRadius: 16, padding: 16, backgroundColor: "#FFFFFF" },
  removeButton: { minHeight: 36, paddingHorizontal: 15, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#D14343" },
  removeButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  relationshipList: { flexGrow: 0, maxHeight: 440, marginTop: 5 },
  relationshipOption: { minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8EDF1" },
  modalCancel: { alignSelf: "flex-end", paddingTop: 11, paddingHorizontal: 5 },
});
