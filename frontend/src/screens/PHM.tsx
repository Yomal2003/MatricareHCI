import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, getPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Field, Ring, Row, SectionTitle, s, usePalette } from "../components/ui";

type Mother = { id: string; _id?: string; name: string; village: string; weeks: number; risk: "low" | "medium" | "high" };
const FALLBACK: Mother[] = [
  { id: "M-1043", name: "Dilani Kumari", village: "Okkampitiya", weeks: 34, risk: "high" },
  { id: "M-1044", name: "Fathima Rizna", village: "Wellawaya", weeks: 12, risk: "medium" },
  { id: "M-1045", name: "Sivaranjani K.", village: "Siyambalanduwa", weeks: 22, risk: "low" },
  { id: "M-1046", name: "Nirosha Madushani", village: "Buttala", weeks: 38, risk: "high" },
];
const riskTone = (r: string) => (r === "high" ? "danger" : r === "medium" ? "warn" : "ok") as any;

export function useMothers(q = "") {
  const [list, setList] = useState<Mother[]>(FALLBACK);
  useEffect(() => {
    api<Mother[]>(`/mothers?q=${encodeURIComponent(q)}`).then(setList)
      .catch(() => setList(FALLBACK.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))));
  }, [q]);
  return list;
}

export function PHMHome() {
  const { language, navigate, pending } = useApp();
  const t = T[language];
  const p = usePalette();
  const mothers = useMothers();
  return (
    <Shell title={t.home}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[["6", t.todayVisits, "home"], ["4", t.dueFollowups, "calendar"], [String(pending), t.pendingRecords, "cloud-upload"]].map(([n, l, ic]) => (
          <Card key={l} style={{ flex: 1, padding: 12 }} label="KPI">
            <Ionicons name={ic as any} size={20} color={p.color} />
            <Text style={[s.h1, { marginTop: 6 }]}>{n}</Text>
            <Text style={[s.muted, { fontSize: 11 }]} numberOfLines={2}>{l}</Text>
          </Card>
        ))}
      </View>
      <Card label="COVERAGE RINGS">
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <Ring value={78} label="Home visits" />
          <Ring value={91} label="Immunized" color="#0891B2" />
          <Ring value={64} label="Postnatal" color="#D97706" />
        </View>
      </Card>
      <SectionTitle action="See all">{t.todayVisits}</SectionTitle>
      <Card label="VISIT LIST">
        {mothers.slice(0, 4).map((m) => (
          <Row key={m.id} icon="woman" title={m.name} sub={`${m.village} · ${m.weeks} wks`} right={<Chip text={m.risk} tone={riskTone(m.risk)} />} onPress={() => navigate("phm-entry")} />
        ))}
      </Card>
    </Shell>
  );
}

export function PHMFollowups() {
  const { language } = useApp();
  const mothers = useMothers();
  return (
    <Shell title={T[language].dueFollowups}>
      {mothers.map((m, i) => (
        <Card key={m.id} label={i === 0 ? "FOLLOW-UP CARD" : undefined}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.rowTitle}>{m.name}</Text><Chip text={m.risk} tone={riskTone(m.risk)} />
          </View>
          <Text style={s.rowSub}>{m.id} · {m.village} · {m.weeks} weeks</Text>
          <Text style={[s.muted, { marginTop: 6 }]}>Due: {i === 0 ? "Overdue 3 days" : `in ${i + 1} days`}</Text>
        </Card>
      ))}
    </Shell>
  );
}

export function PHMSearch() {
  const { language } = useApp();
  const t = T[language];
  const p = usePalette();
  const [q, setQ] = useState("");
  const list = useMothers(q);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [appointments, setAppointments] = useState<PhmAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{ appointment: PhmAppointment; status: "completed" | "missed" } | null>(null);
  const [updatingAppointment, setUpdatingAppointment] = useState(false);

  const loadMotherAppointments = useCallback(async () => {
    if (!selectedMother) return;
    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      const key = selectedMother._id || selectedMother.id;
      setAppointments(await api<PhmAppointment[]>(`/appointments?mother=${encodeURIComponent(key)}`));
    } catch (loadError) {
      setAppointmentsError(loadError instanceof Error ? loadError.message : "Could not load this mother's appointments.");
    } finally {
      setAppointmentsLoading(false);
    }
  }, [selectedMother]);

  useEffect(() => {
    void loadMotherAppointments();
  }, [loadMotherAppointments]);

  const confirmAppointmentStatus = async () => {
    if (!confirmation) return;
    setUpdatingAppointment(true);
    setAppointmentsError("");
    setStatusMessage("");
    try {
      await api(`/appointments/${encodeURIComponent(confirmation.appointment._id)}/status`, {
        method: "PATCH",
        body: { status: confirmation.status },
      });
      setConfirmation(null);
      setStatusMessage(`Appointment marked ${confirmation.status}.`);
      await loadMotherAppointments();
    } catch (updateError) {
      setAppointmentsError(updateError instanceof Error ? updateError.message : "Could not update appointment status.");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  return (
    <Shell title={t.searchMothers}>
      {selectedMother ? (
        <>
          <Pressable onPress={() => {
            setSelectedMother(null);
            setAppointments([]);
            setAppointmentsError("");
            setStatusMessage("");
          }} style={phmAppointmentStyles.backButton}>
            <Ionicons name="arrow-back" size={17} color={p.colorDark} />
            <Text style={[phmAppointmentStyles.backButtonText, { color: p.colorDark }]}>Search Mothers</Text>
          </Pressable>
          <Card>
            <Text style={s.rowTitle}>{selectedMother.name}</Text>
            <Text style={s.rowSub}>{selectedMother.id} · {selectedMother.village}</Text>
          </Card>
          <SectionTitle>Visit Timeline</SectionTitle>
          {appointmentsLoading ? <Card><Text style={s.muted}>Loading appointments…</Text></Card> : null}
          {!appointmentsLoading && !appointments.length && !appointmentsError
            ? <Card><Text style={s.muted}>No appointments found.</Text></Card>
            : null}
          {appointments.map((appointment, index) => {
            const status = appointment.status === "done" ? "completed" : appointment.status;
            const dotColor = status === "upcoming" ? p.color
              : status === "completed" ? "#10B981"
              : status === "missed" ? "#DC2626"
              : "#98A2B3";
            return (
              <View key={appointment._id} style={phmAppointmentStyles.timelineRow}>
                <View style={phmAppointmentStyles.timelineRail}>
                  <View style={[phmAppointmentStyles.timelineDot, { backgroundColor: dotColor }]} />
                  {index < appointments.length - 1 ? <View style={phmAppointmentStyles.timelineLine} /> : null}
                </View>
                <Card style={phmAppointmentStyles.appointmentCard}>
                  <Text style={[s.muted, { fontWeight: "700" }]}>{formatPhmAppointmentDate(appointment.date)}</Text>
                  <Text style={s.rowTitle}>{appointment.type}</Text>
                  {appointment.place ? <Text style={s.rowSub}>{appointment.place}</Text> : null}
                  <View style={phmAppointmentStyles.statusRow}>
                    <Chip
                      text={status}
                      tone={status === "completed" ? "ok" : status === "missed" ? "danger" : status === "upcoming" ? "ok" : "neutral"}
                    />
                  </View>
                  {status === "upcoming" ? (
                    <View style={phmAppointmentStyles.actionRow}>
                      <Pressable
                        disabled={updatingAppointment}
                        onPress={() => setConfirmation({ appointment, status: "completed" })}
                        style={[phmAppointmentStyles.completeButton, updatingAppointment && { opacity: 0.6 }]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                        <Text style={phmAppointmentStyles.actionText}>Mark Completed</Text>
                      </Pressable>
                      <Pressable
                        disabled={updatingAppointment}
                        onPress={() => setConfirmation({ appointment, status: "missed" })}
                        style={[phmAppointmentStyles.missedButton, updatingAppointment && { opacity: 0.6 }]}
                      >
                        <Ionicons name="alert-circle-outline" size={15} color="#FFFFFF" />
                        <Text style={phmAppointmentStyles.actionText}>Mark Missed</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Card>
              </View>
            );
          })}
          {appointmentsError ? <Text style={phmAppointmentStyles.errorText}>{appointmentsError}</Text> : null}
          {statusMessage ? <Text style={phmAppointmentStyles.successText}>{statusMessage}</Text> : null}
        </>
      ) : (
        <>
          <Field icon="search" placeholder="Name or ID" value={q} onChangeText={setQ} />
          <Card label="RESULTS">
            {list.length ? list.map((m) => (
              <Row
                key={m.id}
                icon="woman"
                title={m.name}
                sub={`${m.id} · ${m.village}`}
                right={<Chip text={`${m.weeks}w`} />}
                onPress={() => {
                  setStatusMessage("");
                  setAppointmentsError("");
                  setSelectedMother(m);
                }}
              />
            )) : <Text style={s.muted}>No mothers found</Text>}
          </Card>
        </>
      )}
      <Modal
        visible={confirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !updatingAppointment && setConfirmation(null)}
      >
        <View style={phmAppointmentStyles.modalBackdrop}>
          <View style={phmAppointmentStyles.confirmModal}>
            <Text style={phmAppointmentStyles.confirmTitle}>
              {confirmation?.status === "completed"
                ? "Mark this appointment as completed?"
                : "Mark this appointment as missed?"}
            </Text>
            {confirmation ? (
              <Text style={s.rowSub}>{confirmation.appointment.type} · {formatPhmAppointmentDate(confirmation.appointment.date)}</Text>
            ) : null}
            {appointmentsError ? <Text style={phmAppointmentStyles.errorText}>{appointmentsError}</Text> : null}
            <View style={phmAppointmentStyles.confirmActions}>
              <Pressable disabled={updatingAppointment} onPress={() => setConfirmation(null)} style={phmAppointmentStyles.cancelConfirmButton}>
                <Text style={phmAppointmentStyles.cancelConfirmText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={updatingAppointment}
                onPress={() => void confirmAppointmentStatus()}
                style={[phmAppointmentStyles.confirmButton, updatingAppointment && { opacity: 0.6 }]}
              >
                <Text style={phmAppointmentStyles.confirmButtonText}>{updatingAppointment ? "Saving…" : "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

type PhmAppointment = {
  _id: string;
  type: string;
  category?: string;
  date: string;
  place?: string;
  status: "upcoming" | "completed" | "done" | "missed" | "cancelled";
};

function formatPhmAppointmentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const phmAppointmentStyles = StyleSheet.create({
  backButton: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 8 },
  backButtonText: { fontSize: 12, fontWeight: "700" },
  timelineRow: { flexDirection: "row", gap: 10 },
  timelineRail: { alignItems: "center", width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 20 },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#D7E3E1" },
  appointmentCard: { flex: 1 },
  statusRow: { marginTop: 8 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  completeButton: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 9, paddingHorizontal: 10, backgroundColor: "#10B981" },
  missedButton: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 9, paddingHorizontal: 10, backgroundColor: "#DC2626" },
  actionText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  errorText: { color: "#C23636", fontSize: 11, marginVertical: 8 },
  successText: { color: "#0B9B66", fontSize: 11, marginVertical: 8 },
  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 22, backgroundColor: "rgba(16,24,40,0.45)" },
  confirmModal: { borderRadius: 17, backgroundColor: "#FFFFFF", padding: 17 },
  confirmTitle: { color: "#101828", fontSize: 15, fontWeight: "800", marginBottom: 10 },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  cancelConfirmButton: { minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#F1F4F6", paddingHorizontal: 14 },
  cancelConfirmText: { color: "#526782", fontSize: 10, fontWeight: "700" },
  confirmButton: { minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#079DB8", paddingHorizontal: 16 },
  confirmButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
});

export function PHMEntry() {
  const { language, refreshPending, isOnline } = useApp();
  const t = T[language];
  const p = usePalette();
  const [f, setF] = useState({ motherId: "", weight: "", bp: "", notes: "" });
  const [risk, setRisk] = useState<string[]>([]);
  const FLAGS = ["High BP", "Bleeding", "Swelling", "Low Hb", "Reduced movements"];
  const save = async () => {
    if (!f.motherId) return Alert.alert("Mother ID required");
    await queueRecord({ type: "home-visit", ...f, risk });
    refreshPending();
    if (isOnline) flushPending().then(refreshPending).catch(() => {});
    Alert.alert("Saved", isOnline ? "Uploaded to server" : "Saved offline — will sync later");
    setF({ motherId: "", weight: "", bp: "", notes: "" }); setRisk([]);
  };
  return (
    <Shell title={t.dataEntry}>
      <Card label="VISIT FORM">
        <Field label="Mother ID" icon="id-card" value={f.motherId} onChangeText={(v) => setF({ ...f, motherId: v })} placeholder="M-1043" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Weight (kg)" keyboardType="decimal-pad" value={f.weight} onChangeText={(v) => setF({ ...f, weight: v })} /></View>
          <View style={{ flex: 1 }}><Field label="BP" value={f.bp} onChangeText={(v) => setF({ ...f, bp: v })} placeholder="120/80" /></View>
        </View>
        <Text style={[s.muted, { fontWeight: "700", marginBottom: 8 }]}>Danger signs</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {FLAGS.map((x) => {
            const on = risk.includes(x);
            return (
              <Pressable key={x} onPress={() => setRisk(on ? risk.filter((r) => r !== x) : [...risk, x])}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: on ? p.tone(C.danger) : "#F0F5F4" }}>
                <Text style={{ fontWeight: "700", color: on ? "#fff" : C.ink }}>{x}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Notes" multiline value={f.notes} onChangeText={(v) => setF({ ...f, notes: v })} style={{ minHeight: 70 }} />
        <Button title="Save visit" icon="save" onPress={save} />
      </Card>
    </Shell>
  );
}

export function PHMSync() {
  const { language, isOnline, refreshPending } = useApp();
  const t = T[language];
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => getPending().then(setItems);
  useEffect(() => { load(); }, []);
  const sync = async () => {
    setBusy(true);
    try { const n = await flushPending(); Alert.alert(t.syncDone, `${n} records uploaded`); }
    catch (e: any) { Alert.alert("Sync failed", e.message); }
    setBusy(false); load(); refreshPending();
  };
  return (
    <Shell title={t.syncStatus}>
      <Card label="SYNC STATUS" style={{ alignItems: "center" }}>
        <Ionicons name={items.length ? "cloud-upload" : "cloud-done"} size={48} color={items.length ? "#D97706" : "#059669"} />
        <Text style={[s.h1, { marginTop: 8 }]}>{items.length}</Text>
        <Text style={s.muted}>{items.length ? t.pendingRecords : t.syncDone}</Text>
      </Card>
      <Card label="PENDING LIST">
        {items.length ? items.map((r) => <Row key={r.localId} icon="document" title={`${r.type} · ${r.motherId}`} sub={new Date(r.createdAt).toLocaleString()} right={<Chip text="local" tone="warn" />} />)
          : <Text style={s.muted}>Nothing waiting.</Text>}
      </Card>
      <Button title={busy ? t.syncing : "Sync now"} icon="sync" onPress={sync} style={!isOnline ? { opacity: 0.5 } : undefined} />
    </Shell>
  );
}
