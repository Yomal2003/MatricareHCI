import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useApp } from "../context";
import type { Screen } from "../types";
import Shell from "../components/Shell";
import { Card, SectionTitle } from "../components/ui";

type ConsentStatus = "PENDING" | "CONSENTED" | "REVOKED";

type FamilyNotification = {
  _id: string;
  title: string;
  message: string;
  type: "CONSENT_REQUEST" | "APPOINTMENT_REMINDER";
  read: boolean;
  createdAt: string;
};

type FamilySummary = {
  familyMember: { name: string; relationship: string; consentStatus: ConsentStatus };
  mother: { name: string };
  nextAppointment: { title: string; date: string; place: string } | null;
  notifications: FamilyNotification[];
};

export function FamilyMemberHome() {
  const { currentScreen, navigate, user } = useApp();
  const [summary, setSummary] = useState<FamilySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSummary(await api<FamilySummary>("/family-member/summary"));
    } catch {
      setError("Could not load your family dashboard. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary, currentScreen]);

  const updateConsent = async (decision: "accept" | "decline") => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api<{ consentStatus: ConsentStatus }>("/family-member/consent", {
        method: "PATCH",
        body: { decision },
      });
      setMessage(decision === "accept" ? "Consent accepted." : "Consent declined.");
      await loadSummary();
    } catch {
      setError("We could not update your consent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (notificationId: string) => {
    try {
      await api(`/family-member/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
      setSummary((current) => current ? {
        ...current,
        notifications: current.notifications.map((notification) =>
          notification._id === notificationId ? { ...notification, read: true } : notification
        ),
      } : current);
    } catch {
      setError("Could not update the reminder status.");
    }
  };

  const screen = currentScreen as Screen;
  const status = summary?.familyMember.consentStatus;
  const showConsent = screen !== "family-member-notifications";
  const showNotifications = screen !== "family-member-consent";
  const name = summary?.familyMember.name || user?.name || "Family member";

  return (
    <Shell
      title="Family Dashboard"
      backgroundColor="#F4F7F8"
      header={
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Settings"
            onPress={() => navigate("settings")}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={17} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.eyebrow}>{greeting()}</Text>
          <Text numberOfLines={1} style={styles.headerName}>{name.split(/\s+/)[0]}</Text>
          <Text style={styles.headerRole}>FAMILY MEMBER · {summary?.familyMember.relationship?.toUpperCase() || "FAMILY"}</Text>
          <Text numberOfLines={1} style={styles.supporting}>Supporting: {summary?.mother.name || "Loading…"}</Text>
        </View>
      }
    >
      {loading ? (
        <Card style={styles.stateCard}><Text style={styles.subText}>Loading your family dashboard…</Text></Card>
      ) : error && !summary ? (
        <Card style={styles.stateCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadSummary()}><Text style={styles.link}>Try again</Text></Pressable>
        </Card>
      ) : summary ? (
        <>
          <Card style={styles.connectionCard}>
            <View style={styles.connectionIcon}><Ionicons name="people-outline" size={20} color="#079DB8" /></View>
            <View style={styles.connectionCopy}>
              <Text style={styles.subText}>Connected to</Text>
              <Text style={styles.cardTitle}>{summary.mother.name}</Text>
              <Text style={styles.subText}>Relationship: {summary.familyMember.relationship}</Text>
            </View>
            <View style={[styles.statusBadge, status === "CONSENTED" ? styles.activeBadge : status === "REVOKED" ? styles.revokedBadge : styles.pendingBadge]}>
              <Text style={[styles.statusText, status === "CONSENTED" ? styles.activeText : status === "REVOKED" ? styles.revokedText : styles.pendingText]}>
                {status === "CONSENTED" ? "✓ Active" : status === "REVOKED" ? "Revoked" : "Pending"}
              </Text>
            </View>
          </Card>

          {showConsent ? (
            <>
              <SectionTitle>FAMILY CONSENT</SectionTitle>
              {status === "PENDING" ? (
                <Card style={styles.consentCard}>
                  <View style={styles.notificationIcon}><Ionicons name="shield-checkmark-outline" size={18} color="#079DB8" /></View>
                  <Text style={styles.cardTitle}>Family Consent Request</Text>
                  <Text style={styles.bodyText}>
                    {summary.mother.name} has added you as {summary.familyMember.relationship} to receive permitted appointment reminders.
                  </Text>
                  <View style={styles.buttonRow}>
                    <Pressable disabled={busy} onPress={() => void updateConsent("decline")} style={[styles.declineButton, busy && styles.disabled]}>
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                    <Pressable disabled={busy} onPress={() => void updateConsent("accept")} style={[styles.acceptButton, busy && styles.disabled]}>
                      <Text style={styles.acceptText}>{busy ? "Saving…" : "Accept"}</Text>
                    </Pressable>
                  </View>
                </Card>
              ) : (
                <Card style={styles.consentCard}>
                  <Text style={styles.bodyText}>
                    {status === "CONSENTED"
                      ? "You have consented to receive permitted appointment reminders."
                      : "You have declined appointment reminders. Contact the mother if you want to be added again."}
                  </Text>
                </Card>
              )}
            </>
          ) : null}

          {showNotifications ? (
            <>
              <SectionTitle>{screen === "family-member-notifications" ? "APPOINTMENT REMINDERS" : "NEXT APPOINTMENT"}</SectionTitle>
              {status !== "CONSENTED" ? (
                <Card style={styles.stateCard}>
                  <Text style={styles.subText}>Appointment reminders are available only after consent is accepted and enabled by the mother.</Text>
                </Card>
              ) : !summary.nextAppointment ? (
                <Card style={styles.stateCard}><Text style={styles.subText}>No permitted upcoming appointment is available.</Text></Card>
              ) : (
                <Card style={styles.appointmentCard}>
                  <View style={styles.appointmentIcon}><Ionicons name="calendar-outline" size={19} color="#079DB8" /></View>
                  <View style={styles.appointmentCopy}>
                    <Text style={styles.cardTitle}>{summary.nextAppointment.title}</Text>
                    <Text style={styles.bodyText}>{formatDate(summary.nextAppointment.date)}</Text>
                    {summary.nextAppointment.place ? <Text style={styles.subText}>{summary.nextAppointment.place}</Text> : null}
                  </View>
                </Card>
              )}

              <SectionTitle>NOTIFICATIONS</SectionTitle>
              {summary.notifications.length === 0 ? (
                <Card style={styles.stateCard}><Text style={styles.subText}>There are no notifications to show.</Text></Card>
              ) : summary.notifications.map((notification) => (
                <Card key={notification._id} style={styles.notificationCard}>
                  <View style={styles.notificationIcon}>
                    <Ionicons name={notification.type === "CONSENT_REQUEST" ? "people-outline" : "notifications-outline"} size={17} color="#079DB8" />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.cardTitle}>{notification.title}</Text>
                    <Text style={styles.bodyText}>{notification.message}</Text>
                  </View>
                  {!notification.read ? (
                    <Pressable accessibilityLabel="Mark notification as read" onPress={() => void markRead(notification._id)}>
                      <View style={styles.unreadDot} />
                    </Pressable>
                  ) : null}
                </Card>
              ))}
            </>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
        </>
      ) : null}
    </Shell>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 13, paddingRight: 52 },
  settingsButton: { position: "absolute", top: 9, right: 16, width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  eyebrow: { color: "rgba(255,255,255,0.82)", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  headerName: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", marginTop: 2 },
  headerRole: { color: "#D6F8FC", fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginTop: 2 },
  supporting: { color: "#FFFFFF", fontSize: 10, marginTop: 6 },
  stateCard: { borderRadius: 15, padding: 14 },
  connectionCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 15, padding: 13 },
  connectionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#E4F8FB", alignItems: "center", justifyContent: "center" },
  connectionCopy: { flex: 1 },
  cardTitle: { color: "#152B38", fontSize: 12, fontWeight: "800", marginBottom: 4 },
  subText: { color: "#65758A", fontSize: 10, lineHeight: 15 },
  bodyText: { color: "#526782", fontSize: 11, lineHeight: 17, marginTop: 4 },
  statusBadge: { borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: "800" },
  activeBadge: { backgroundColor: "#DCFCEB" },
  activeText: { color: "#0B9B66" },
  pendingBadge: { backgroundColor: "#FFF4D6" },
  pendingText: { color: "#AE7100" },
  revokedBadge: { backgroundColor: "#FEE7E7" },
  revokedText: { color: "#C23636" },
  consentCard: { borderRadius: 15, padding: 14 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 13 },
  declineButton: { minHeight: 38, minWidth: 82, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#F1F4F6" },
  declineText: { color: "#65758A", fontSize: 11, fontWeight: "800" },
  acceptButton: { minHeight: 38, minWidth: 92, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#079DB8" },
  acceptText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  appointmentCard: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 15, padding: 13 },
  appointmentIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E4F8FB" },
  appointmentCopy: { flex: 1 },
  notificationCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 15, padding: 12 },
  notificationIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#E4F8FB" },
  notificationCopy: { flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, backgroundColor: "#079DB8" },
  errorText: { color: "#C23636", fontSize: 11, marginVertical: 5 },
  successText: { color: "#0B9B66", fontSize: 11, marginVertical: 5 },
  link: { color: "#078EA9", fontSize: 11, fontWeight: "800", marginTop: 7 },
});
