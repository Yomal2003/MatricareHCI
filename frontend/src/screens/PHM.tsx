import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, getPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Field, Ring, Row, SectionTitle, s, usePalette } from "../components/ui";

type Mother = {
  id: string;
  _id?: string;
  name: string;
  village: string;
  weeks: number;
  risk: "low" | "medium" | "high";
  status?: "pregnant" | "postnatal" | string;
  edd?: string;
  childName?: string;
  hasDelivered?: boolean;
  vitals?: { weight?: number; bp?: string; hb?: number; updatedAt?: string };
};
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
        {mothers.slice(0, 4).map((m) => {
          const isUndelivered = m.status === "pregnant" || (m.weeks && m.weeks <= 40);
          const babyLabel = isUndelivered ? `Baby of ${m.name}` : `Child of ${m.name}`;
          return (
            <Row
              key={m.id}
              icon={isUndelivered ? "woman" : "happy"}
              title={`${m.name} · ${babyLabel}`}
              sub={`${m.village || "Buttala"} · ${isUndelivered ? `🤰 Pre-natal (${m.weeks || 28}w)` : "👶 Postnatal"}`}
              right={<Chip text={m.risk || "low"} tone={riskTone(m.risk || "low")} />}
              onPress={() => navigate("phm-entry")}
            />
          );
        })}
      </Card>
    </Shell>
  );
}

export function PHMFollowups() {
  const { language } = useApp();
  const mothers = useMothers();
  return (
    <Shell title={T[language].dueFollowups}>
      {mothers.map((m, i) => {
        const isUndelivered = m.status === "pregnant" || (m.weeks && m.weeks <= 40);
        const babyLabel = isUndelivered ? `Baby of ${m.name}` : `Child of ${m.name}`;
        return (
          <Card key={m.id} label={i === 0 ? "FOLLOW-UP CARD" : undefined}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.rowTitle}>{m.name} · {babyLabel}</Text>
              <Chip text={m.risk || "low"} tone={riskTone(m.risk || "low")} />
            </View>
            <Text style={s.rowSub}>
              {m.id} · {m.village || "Buttala"} · {isUndelivered ? `🤰 Pre-natal (${m.weeks || 28}w)` : "👶 Postnatal"}
            </Text>
            <Text style={[s.muted, { marginTop: 6 }]}>
              Due: {i === 0 ? "Overdue 3 days" : `in ${i + 1} days`} · {isUndelivered ? "Antenatal Home Visit" : "Postnatal Follow-up"}
            </Text>
          </Card>
        );
      })}
    </Shell>
  );
}

function formatOffsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseDateTimeToIso(dateStr: string, timeStr: string): string {
  try {
    const parts = (dateStr || "").trim().split("-");
    const y = Number(parts[0]) || new Date().getFullYear();
    const m = (Number(parts[1]) || (new Date().getMonth() + 1)) - 1;
    const d = Number(parts[2]) || new Date().getDate();

    let hours = 9;
    let mins = 0;
    const match = (timeStr || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      hours = Number(match[1]);
      mins = Number(match[2]);
      const ampm = (match[3] || "").toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }
    const dt = new Date(y, m, d, hours, mins, 0);
    return dt.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

const CLINIC_TIME_SLOTS = ["08:30 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:30 PM", "02:30 PM"];
const DATE_SHORTCUTS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "+3 Days", days: 3 },
  { label: "+1 Wk", days: 7 },
  { label: "+2 Wks", days: 14 },
];

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
  const [visitWeight, setVisitWeight] = useState("");
  const [visitBp, setVisitBp] = useState("");
  const [visitHb, setVisitHb] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitRiskFlags, setVisitRiskFlags] = useState<string[]>([]);
  const [rescheduleTarget, setRescheduleTarget] = useState<PhmAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<PhmAppointment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [updatingAppointment, setUpdatingAppointment] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regStep, setRegStep] = useState<"mother" | "child">("mother");
  const [registerForm, setRegisterForm] = useState({
    name: "",
    village: "",
    area: "Buttala",
    phone: "",
    nic: "",
    bloodGroup: "Not tested",
    stage: "pregnant" as "pregnant" | "postnatal",
    weeks: "28",
    edd: "Nov 2026",
    childName: "",
    birthWeight: "3.2",
    birthLength: "50",
  });
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    type: "Clinic Review / Vaccination",
    targetRole: "nursing" as "nursing" | "phm",
    date: formatOffsetDate(1),
    time: "09:00 AM",
    place: "Buttala MOH Clinic",
    notes: "",
  });

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

  const handleAcceptAppointment = async (appt: PhmAppointment) => {
    setUpdatingAppointment(true);
    setAppointmentsError("");
    setStatusMessage("");
    try {
      await api(`/appointments/${encodeURIComponent(appt._id)}/accept`, { method: "PATCH", body: {} });
      setStatusMessage("Appointment confirmed successfully.");
      await loadMotherAppointments();
    } catch (err) {
      setAppointmentsError(err instanceof Error ? err.message : "Failed to accept appointment.");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  const handleRejectAppointment = async () => {
    if (!rejectTarget) return;
    setUpdatingAppointment(true);
    setAppointmentsError("");
    try {
      await api(`/appointments/${encodeURIComponent(rejectTarget._id)}/reject`, {
        method: "PATCH",
        body: { reason: rejectReason.trim() || "Staff unavailable on requested schedule" },
      });
      setRejectTarget(null);
      setRejectReason("");
      setStatusMessage("Appointment request rejected.");
      await loadMotherAppointments();
    } catch (err) {
      setAppointmentsError(err instanceof Error ? err.message : "Failed to reject appointment.");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!rescheduleTarget || !rescheduleDate.trim()) {
      Alert.alert("Date Required", "Please provide a valid new appointment date/time.");
      return;
    }
    setUpdatingAppointment(true);
    setAppointmentsError("");
    try {
      await api(`/appointments/${encodeURIComponent(rescheduleTarget._id)}/reschedule`, {
        method: "PATCH",
        body: { date: rescheduleDate.trim(), notes: rescheduleNotes.trim() },
      });
      setRescheduleTarget(null);
      setRescheduleDate("");
      setRescheduleNotes("");
      setStatusMessage("Proposed new appointment time sent to mother.");
      await loadMotherAppointments();
    } catch (err) {
      setAppointmentsError(err instanceof Error ? err.message : "Failed to reschedule appointment.");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  const confirmAppointmentStatus = async () => {
    if (!confirmation) return;
    setUpdatingAppointment(true);
    setAppointmentsError("");
    setStatusMessage("");
    try {
      const body: any = { status: confirmation.status };
      if (confirmation.status === "completed") {
        if (visitWeight.trim()) body.weight = Number(visitWeight);
        if (visitBp.trim()) body.bp = visitBp.trim();
        if (visitHb.trim()) body.hb = Number(visitHb);
        if (visitNotes.trim()) body.clinicalNotes = visitNotes.trim();
        if (visitRiskFlags.length) body.riskFlags = visitRiskFlags;
      }
      await api(`/appointments/${encodeURIComponent(confirmation.appointment._id)}/status`, {
        method: "PATCH",
        body,
      });
      setConfirmation(null);
      setStatusMessage(
        confirmation.status === "completed"
          ? `Visit completed and clinical records updated for ${selectedMother?.name || "mother"}.`
          : `Appointment marked missed.`
      );
      await loadMotherAppointments();
    } catch (updateError) {
      setAppointmentsError(updateError instanceof Error ? updateError.message : "Could not update appointment status.");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  const registerMother = async () => {
    if (!registerForm.name.trim()) {
      Alert.alert("Validation", "Mother's name is required.");
      return;
    }
    const village = registerForm.village.trim() || registerForm.area;
    const isPregnant = registerForm.stage === "pregnant";
    const lmpDate = isPregnant
      ? new Date(Date.now() - Number(registerForm.weeks || 28) * 7 * 864e5)
      : undefined;
    const eddDate = isPregnant
      ? new Date(Date.now() + (40 - Number(registerForm.weeks || 28)) * 7 * 864e5)
      : undefined;

    try {
      const created = await api<any>("/mothers", {
        method: "POST",
        body: {
          name: registerForm.name.trim(),
          nic: registerForm.nic.trim(),
          phone: registerForm.phone.trim(),
          village,
          phmArea: registerForm.area,
          bloodGroup: registerForm.bloodGroup !== "Not tested" ? registerForm.bloodGroup : undefined,
          status: registerForm.stage,
          lmp: lmpDate,
          edd: eddDate,
        },
      });

      // Also register Child record if delivered or pre-natal record
      const childName = isPregnant
        ? (registerForm.childName.trim() || `Baby of ${registerForm.name.trim()}`)
        : (registerForm.childName.trim() || "Newborn Baby");

      api("/children", {
        method: "POST",
        body: {
          motherCode: created.code || created.id,
          name: childName,
          isUnborn: isPregnant,
          status: isPregnant ? "unborn" : "born",
          birthWeight: Number(registerForm.birthWeight || 3.2),
          birthLength: Number(registerForm.birthLength || 50),
        },
      }).catch(() => {});

      setRegisterOpen(false);
      setRegStep("mother");
      setRegisterForm({
        name: "",
        village: "",
        area: "Buttala",
        phone: "",
        nic: "",
        bloodGroup: "Not tested",
        stage: "pregnant",
        weeks: "28",
        edd: "Nov 2026",
        childName: "",
        birthWeight: "3.2",
        birthLength: "50",
      });
      setQ(created.name);
      setStatusMessage(`${created.name} (${created.code}) registered successfully with complete maternal and child intake.`);
    } catch (error) {
      Alert.alert("Registration failed", error instanceof Error ? error.message : "Could not register mother.");
    }
  };

  const createAppointment = async () => {
    if (!selectedMother) return;
    try {
      const isNursingClinic = appointmentForm.targetRole === "nursing";
      const isoDate = parseDateTimeToIso(appointmentForm.date, appointmentForm.time);
      await api("/appointments", {
        method: "POST",
        body: {
          motherCode: selectedMother._id || selectedMother.id,
          type: appointmentForm.type.trim(),
          targetRole: appointmentForm.targetRole,
          date: isoDate,
          place: appointmentForm.place.trim(),
          category: isNursingClinic ? "immunization" : "anc",
          status: isNursingClinic ? "pending" : "confirmed",
          notes: appointmentForm.notes.trim() || (isNursingClinic ? "PHM referral for Nurse clinic" : "Home visit scheduled"),
        },
      });
      setAppointmentOpen(false);
      setStatusMessage(
        isNursingClinic
          ? `Clinic request submitted for ${selectedMother.name} on ${appointmentForm.date} at ${appointmentForm.time}. Awaiting Nurse confirmation in clinic requests.`
          : `Home visit scheduled for ${selectedMother.name} on ${appointmentForm.date} at ${appointmentForm.time}.`
      );
      await loadMotherAppointments();
    } catch (error) {
      Alert.alert("Appointment failed", error instanceof Error ? error.message : "Could not schedule appointment.");
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
            {Boolean(selectedMother.status === "pregnant" || (selectedMother.weeks && selectedMother.weeks <= 40)) ? (
              <View style={{ marginTop: 2, marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: "#B45309", fontWeight: "700" }}>
                  🤰 Baby of {selectedMother.name} · Pre-natal ({selectedMother.weeks || 28} weeks)
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 2, marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: "#0284C7", fontWeight: "700" }}>
                  👶 Postnatal · Child of {selectedMother.name}
                </Text>
              </View>
            )}
            <Text style={s.rowSub}>{selectedMother.id} · {selectedMother.village}</Text>
            <Button
              title="Set appointment"
              icon="calendar"
              onPress={() => {
                setAppointmentForm({
                  type: "Clinic Review / Vaccination",
                  targetRole: "nursing",
                  date: formatOffsetDate(1),
                  time: "09:00 AM",
                  place: selectedMother?.village ? `${selectedMother.village} MOH Clinic` : "Buttala MOH Clinic",
                  notes: "",
                });
                setAppointmentOpen(true);
              }}
              style={{ marginTop: 10 }}
            />
          </Card>
          <SectionTitle>Visit Timeline</SectionTitle>
          {appointmentsLoading ? <Card><Text style={s.muted}>Loading appointments…</Text></Card> : null}
          {!appointmentsLoading && !appointments.length && !appointmentsError
            ? <Card><Text style={s.muted}>No appointments found.</Text></Card>
            : null}
          {appointments.map((appointment, index) => {
            const rawStatus = appointment.status;
            const status = rawStatus === "done" ? "completed" : rawStatus;
            const dotColor = status === "upcoming" || status === "confirmed" ? p.color
              : status === "completed" ? "#10B981"
              : status === "missed" || status === "rejected" ? "#DC2626"
              : status === "rescheduled" ? "#EA580C"
              : "#6366F1";
            return (
              <View key={appointment._id} style={phmAppointmentStyles.timelineRow}>
                <View style={phmAppointmentStyles.timelineRail}>
                  <View style={[phmAppointmentStyles.timelineDot, { backgroundColor: dotColor }]} />
                  {index < appointments.length - 1 ? <View style={phmAppointmentStyles.timelineLine} /> : null}
                </View>
                <Card style={phmAppointmentStyles.appointmentCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[s.muted, { fontWeight: "700" }]}>{formatPhmAppointmentDate(appointment.date)}</Text>
                    {appointment.targetRole ? (
                      <View style={{ backgroundColor: appointment.targetRole === "nursing" ? "#FEF3C7" : "#EDE9FE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: "800", color: appointment.targetRole === "nursing" ? "#B45309" : "#6D28D9" }}>
                          {appointment.targetRole === "nursing" ? "Clinic Nurse" : "Midwife"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.rowTitle}>{appointment.type}</Text>
                  {appointment.place ? <Text style={s.rowSub}>{appointment.place}</Text> : null}

                  {appointment.rejectionReason ? (
                    <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>Reason: {appointment.rejectionReason}</Text>
                  ) : null}
                  {appointment.rescheduledNotes ? (
                    <Text style={{ fontSize: 11, color: "#EA580C", marginTop: 4 }}>Note: {appointment.rescheduledNotes}</Text>
                  ) : null}

                  <View style={phmAppointmentStyles.statusRow}>
                    <Chip
                      text={status === "pending" ? "Pending Request" : status === "confirmed" ? "Confirmed" : status === "rescheduled" ? "Rescheduled" : status === "rejected" ? "Rejected" : status}
                      tone={status === "completed" || status === "confirmed" ? "ok" : status === "missed" || status === "rejected" ? "danger" : status === "rescheduled" ? "warn" : "neutral"}
                    />
                  </View>

                  {/* PENDING REQUEST ACTIONS: ACCEPT, REJECT, SET OTHER TIME */}
                  {status === "pending" ? (
                    <View style={phmAppointmentStyles.actionRow}>
                      <Pressable
                        disabled={updatingAppointment}
                        onPress={() => void handleAcceptAppointment(appointment)}
                        style={[phmAppointmentStyles.completeButton, updatingAppointment && { opacity: 0.6 }]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" />
                        <Text style={phmAppointmentStyles.actionText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        disabled={updatingAppointment}
                        onPress={() => {
                          setRescheduleTarget(appointment);
                          setRescheduleDate(appointment.date ? new Date(appointment.date).toISOString().slice(0, 16) : "");
                          setRescheduleNotes("");
                        }}
                        style={[phmAppointmentStyles.rescheduleButton, updatingAppointment && { opacity: 0.6 }]}
                      >
                        <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                        <Text style={phmAppointmentStyles.actionText}>Set Other Time</Text>
                      </Pressable>
                      <Pressable
                        disabled={updatingAppointment}
                        onPress={() => {
                          setRejectTarget(appointment);
                          setRejectReason("");
                        }}
                        style={[phmAppointmentStyles.missedButton, updatingAppointment && { opacity: 0.6 }]}
                      >
                        <Ionicons name="close-circle-outline" size={14} color="#FFFFFF" />
                        <Text style={phmAppointmentStyles.actionText}>Reject</Text>
                      </Pressable>
                    </View>
                  ) : status === "upcoming" || status === "confirmed" ? (
                    <View style={phmAppointmentStyles.actionRow}>
                      <Pressable
                        disabled={updatingAppointment}
                        onPress={() => {
                          setVisitWeight(selectedMother?.vitals?.weight ? String(selectedMother.vitals.weight) : "");
                          setVisitBp(selectedMother?.vitals?.bp || "");
                          setVisitHb(selectedMother?.vitals?.hb ? String(selectedMother.vitals.hb) : "");
                          setVisitNotes("");
                          setVisitRiskFlags([]);
                          setConfirmation({ appointment, status: "completed" });
                        }}
                        style={[phmAppointmentStyles.completeButton, updatingAppointment && { opacity: 0.6 }]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                        <Text style={phmAppointmentStyles.actionText}>Complete & Record Vitals</Text>
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
          <Button title="Register mother" icon="person-add" onPress={() => setRegisterOpen(true)} style={{ marginBottom: 10 }} />
          <Field icon="search" placeholder="Name or ID" value={q} onChangeText={setQ} />
          <Card label="RESULTS">
            {list.length ? list.map((m) => {
              const isUndelivered = m.status === "pregnant" || (m.weeks && m.weeks <= 40);
              const babyTitle = isUndelivered ? `Baby of ${m.name}` : `Child of ${m.name}`;
              return (
                <Row
                  key={m.id}
                  icon={isUndelivered ? "woman" : "happy"}
                  title={`${m.name} · ${babyTitle}`}
                  sub={`${m.id} · ${m.village} · ${isUndelivered ? `🤰 Pre-natal (${m.weeks || 28}w)` : "👶 Postnatal"}`}
                  right={<Chip text={`${m.weeks || 28}w`} />}
                  onPress={() => {
                    setStatusMessage("");
                    setAppointmentsError("");
                    setSelectedMother(m);
                  }}
                />
              );
            }) : <Text style={s.muted}>No mothers found</Text>}
          </Card>
        </>
      )}
      <Modal visible={registerOpen} transparent animationType="slide" onRequestClose={() => setRegisterOpen(false)}>
        <View style={phmAppointmentStyles.modalBackdrop}>
          <View style={[phmAppointmentStyles.confirmModal, { maxHeight: "90%" }]}>
            <Text style={phmAppointmentStyles.confirmTitle}>
              {regStep === "mother" ? "Register Mother (Step 1/2)" : "Child & Maternal Details (Step 2/2)"}
            </Text>

            {/* Step Selector Tabs */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <Pressable
                onPress={() => setRegStep("mother")}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: regStep === "mother" ? "#079DB8" : "#F1F5F9",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: regStep === "mother" ? "#FFFFFF" : "#64748B" }}>
                  1. Mother Profile
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRegStep("child")}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: regStep === "child" ? "#079DB8" : "#F1F5F9",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: regStep === "child" ? "#FFFFFF" : "#64748B" }}>
                  2. Child / Pregnancy
                </Text>
              </Pressable>
            </View>

            {regStep === "mother" ? (
              <View>
                <Field label="Full name*" value={registerForm.name} onChangeText={(value) => setRegisterForm({ ...registerForm, name: value })} placeholder="e.g. Dilani Kumari" />
                <Field label="Village / Address*" value={registerForm.village} onChangeText={(value) => setRegisterForm({ ...registerForm, village: value })} placeholder="e.g. Buttala Colony 4" />
                <Field label="Phone number" value={registerForm.phone} onChangeText={(value) => setRegisterForm({ ...registerForm, phone: value })} keyboardType="phone-pad" placeholder="07xxxxxxxx" />
                <Field label="National ID (NIC)" value={registerForm.nic} onChangeText={(value) => setRegisterForm({ ...registerForm, nic: value })} placeholder="e.g. 199264003211" />

                <Text style={{ fontSize: 11, fontWeight: "700", color: "#526782", marginTop: 6, marginBottom: 4 }}>Blood Group (Optional / Lab test)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {["Not tested", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => {
                    const isSel = registerForm.bloodGroup === bg;
                    return (
                      <Pressable
                        key={bg}
                        onPress={() => setRegisterForm({ ...registerForm, bloodGroup: bg })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isSel ? "#079DB8" : "#E2E8F0",
                          backgroundColor: isSel ? "#079DB8" : "#F8FAFC",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: isSel ? "800" : "600", color: isSel ? "#FFFFFF" : "#475569" }}>
                          {bg}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 11, fontWeight: "700", color: "#526782", marginTop: 4, marginBottom: 4 }}>Maternal Status</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                  <Pressable
                    onPress={() => setRegisterForm({ ...registerForm, stage: "pregnant" })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: "center",
                      borderWidth: 1.5,
                      borderColor: registerForm.stage === "pregnant" ? "#079DB8" : "#E2E8F0",
                      backgroundColor: registerForm.stage === "pregnant" ? "#E0F7FA" : "#F8FAFC",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: registerForm.stage === "pregnant" ? "#079DB8" : "#64748B" }}>
                      🤰 Pregnant
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRegisterForm({ ...registerForm, stage: "postnatal" })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: "center",
                      borderWidth: 1.5,
                      borderColor: registerForm.stage === "postnatal" ? "#079DB8" : "#E2E8F0",
                      backgroundColor: registerForm.stage === "postnatal" ? "#E0F7FA" : "#F8FAFC",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: registerForm.stage === "postnatal" ? "#079DB8" : "#64748B" }}>
                      👶 Delivered
                    </Text>
                  </Pressable>
                </View>

                <View style={phmAppointmentStyles.confirmActions}>
                  <Pressable onPress={() => setRegisterOpen(false)} style={phmAppointmentStyles.cancelConfirmButton}>
                    <Text style={phmAppointmentStyles.cancelConfirmText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!registerForm.name.trim()) return Alert.alert("Validation", "Mother's name is required.");
                      setRegStep("child");
                    }}
                    style={phmAppointmentStyles.confirmButton}
                  >
                    <Text style={phmAppointmentStyles.confirmButtonText}>Next: Child ›</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                {registerForm.stage === "pregnant" ? (
                  <>
                    <Field label="Gestational Weeks" value={registerForm.weeks} onChangeText={(value) => setRegisterForm({ ...registerForm, weeks: value })} placeholder="e.g. 28" keyboardType="numeric" />
                    <Field label="Expected Delivery Date (EDD)" value={registerForm.edd} onChangeText={(value) => setRegisterForm({ ...registerForm, edd: value })} placeholder="e.g. Nov 2026" />
                    <Field label="Working Label / Baby Name" value={registerForm.childName} onChangeText={(value) => setRegisterForm({ ...registerForm, childName: value })} placeholder={`Baby of ${registerForm.name || "Mother"}`} />
                  </>
                ) : (
                  <>
                    <Field label="Child's Full Name" value={registerForm.childName} onChangeText={(value) => setRegisterForm({ ...registerForm, childName: value })} placeholder="e.g. Kavindu Jayawardena" />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Field label="Birth Weight (kg)" value={registerForm.birthWeight} onChangeText={(value) => setRegisterForm({ ...registerForm, birthWeight: value })} keyboardType="numeric" placeholder="3.2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Birth Length (cm)" value={registerForm.birthLength} onChangeText={(value) => setRegisterForm({ ...registerForm, birthLength: value })} keyboardType="numeric" placeholder="50" />
                      </View>
                    </View>
                  </>
                )}

                <View style={phmAppointmentStyles.confirmActions}>
                  <Pressable onPress={() => setRegStep("mother")} style={phmAppointmentStyles.cancelConfirmButton}>
                    <Text style={phmAppointmentStyles.cancelConfirmText}>‹ Back</Text>
                  </Pressable>
                  <Pressable onPress={() => void registerMother()} style={phmAppointmentStyles.confirmButton}>
                    <Text style={phmAppointmentStyles.confirmButtonText}>Complete Intake</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={appointmentOpen} transparent animationType="fade" onRequestClose={() => setAppointmentOpen(false)}>
        <View style={phmAppointmentStyles.modalBackdrop}>
          <View style={[phmAppointmentStyles.confirmModal, { maxWidth: 440 }]}>
            <Text style={phmAppointmentStyles.confirmTitle}>Schedule Visit / Clinic for {selectedMother?.name}</Text>

            {/* Target Role Selector */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 8, marginBottom: 4 }}>
              VISIT TYPE & TARGET STAFF
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <Pressable
                onPress={() =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    targetRole: "nursing",
                    place: selectedMother?.village ? `${selectedMother.village} MOH Clinic` : "Buttala MOH Clinic",
                    type: "Clinic Review / Vaccination",
                  }))
                }
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: appointmentForm.targetRole === "nursing" ? "#AF5819" : "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: appointmentForm.targetRole === "nursing" ? "#FFFFFF" : "#475569",
                  }}
                >
                  🏥 Clinic Nurse
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    targetRole: "phm",
                    place: "PHM Home Visit",
                    type: "ANC follow-up",
                  }))
                }
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: appointmentForm.targetRole === "phm" ? "#079DB8" : "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: appointmentForm.targetRole === "phm" ? "#FFFFFF" : "#475569",
                  }}
                >
                  🏡 PHM Home Visit
                </Text>
              </Pressable>
            </View>

            <Field label="Appointment type" value={appointmentForm.type} onChangeText={(value) => setAppointmentForm({ ...appointmentForm, type: value })} />

            {/* Date Selection */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 8, marginBottom: 4 }}>
              SELECT DATE
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
              {DATE_SHORTCUTS.map((sc) => {
                const scDate = formatOffsetDate(sc.days);
                const isSelected = appointmentForm.date === scDate;
                return (
                  <Pressable
                    key={sc.label}
                    onPress={() => setAppointmentForm((prev) => ({ ...prev, date: scDate }))}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: 6,
                      alignItems: "center",
                      backgroundColor: isSelected ? "#079DB8" : "#F1F5F9",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: isSelected ? "#FFFFFF" : "#475569" }}>
                      {sc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="Selected Date (YYYY-MM-DD)"
              value={appointmentForm.date}
              onChangeText={(value) => setAppointmentForm({ ...appointmentForm, date: value })}
              placeholder="2026-10-14"
            />

            {/* Time Selection */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 4, marginBottom: 4 }}>
              SELECT TIME SLOT
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {CLINIC_TIME_SLOTS.map((slot) => {
                const isSelected = appointmentForm.time === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setAppointmentForm((prev) => ({ ...prev, time: slot }))}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      alignItems: "center",
                      backgroundColor: isSelected ? "#AF5819" : "#F1F5F9",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: isSelected ? "#FFFFFF" : "#475569" }}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="Selected Time"
              value={appointmentForm.time}
              onChangeText={(value) => setAppointmentForm({ ...appointmentForm, time: value })}
              placeholder="09:00 AM"
            />

            <Field label="Clinic / place" value={appointmentForm.place} onChangeText={(value) => setAppointmentForm({ ...appointmentForm, place: value })} />
            <Field label="Clinical notes / referral reason" value={appointmentForm.notes} onChangeText={(value) => setAppointmentForm({ ...appointmentForm, notes: value })} placeholder="e.g. Due for Tetanus Toxoid vaccination" />
            <View style={phmAppointmentStyles.confirmActions}>
              <Pressable onPress={() => setAppointmentOpen(false)} style={phmAppointmentStyles.cancelConfirmButton}><Text style={phmAppointmentStyles.cancelConfirmText}>Cancel</Text></Pressable>
              <Pressable onPress={() => void createAppointment()} style={[phmAppointmentStyles.confirmButton, appointmentForm.targetRole === "nursing" && { backgroundColor: "#AF5819" }]}>
                <Text style={phmAppointmentStyles.confirmButtonText}>
                  {appointmentForm.targetRole === "nursing" ? "Send to Nurse Clinic" : "Schedule Visit"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
                ? "Complete Visit & Record Clinical Vitals"
                : "Mark Appointment as Missed?"}
            </Text>
            {confirmation ? (
              <Text style={[s.rowSub, { marginBottom: 10 }]}>
                {selectedMother?.name || "Mother"} ({selectedMother?.id || ""}) · {confirmation.appointment.type}
              </Text>
            ) : null}

            {confirmation?.status === "completed" ? (
              <View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Weight (kg)"
                      keyboardType="decimal-pad"
                      value={visitWeight}
                      onChangeText={setVisitWeight}
                      placeholder="e.g. 62.5"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Blood Pressure (BP)"
                      value={visitBp}
                      onChangeText={setVisitBp}
                      placeholder="e.g. 110/70"
                    />
                  </View>
                </View>

                <Field
                  label="Hemoglobin (Hb g/dL)"
                  keyboardType="decimal-pad"
                  value={visitHb}
                  onChangeText={setVisitHb}
                  placeholder="e.g. 11.5"
                />

                <Text style={{ fontSize: 11, fontWeight: "700", color: "#526782", marginTop: 4, marginBottom: 4 }}>
                  Danger Signs / Risk Flags
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {["High BP", "Bleeding", "Swelling", "Low Hb", "Reduced movements"].map((flag) => {
                    const on = visitRiskFlags.includes(flag);
                    return (
                      <Pressable
                        key={flag}
                        onPress={() =>
                          setVisitRiskFlags(
                            on ? visitRiskFlags.filter((f) => f !== flag) : [...visitRiskFlags, flag]
                          )
                        }
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: on ? "#FEE2E2" : "#F1F5F9",
                          borderWidth: 1,
                          borderColor: on ? "#EF4444" : "#E2E8F0",
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: "700", color: on ? "#B91C1C" : "#475569" }}>
                          {on ? "⚠️ " : ""}{flag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Field
                  label="Clinical Notes / Advice"
                  multiline
                  value={visitNotes}
                  onChangeText={setVisitNotes}
                  placeholder="e.g. Routine follow-up, advised balanced nutrition"
                  style={{ minHeight: 52 }}
                />
              </View>
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
                <Text style={phmAppointmentStyles.confirmButtonText}>
                  {updatingAppointment ? "Saving…" : confirmation?.status === "completed" ? "Save & Complete Visit" : "Confirm Missed"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* ================= RESCHEDULE MODAL ================= */}
      <Modal visible={rescheduleTarget !== null} transparent animationType="fade" onRequestClose={() => !updatingAppointment && setRescheduleTarget(null)}>
        <View style={phmAppointmentStyles.modalBackdrop}>
          <View style={phmAppointmentStyles.confirmModal}>
            <Text style={phmAppointmentStyles.confirmTitle}>Propose New Appointment Time</Text>
            {rescheduleTarget ? (
              <Text style={[s.rowSub, { marginBottom: 10 }]}>
                {rescheduleTarget.type} · Requested for: {formatPhmAppointmentDate(rescheduleTarget.date)}
              </Text>
            ) : null}
            <Field
              label="New date & time (e.g. 2026-10-20T10:30)"
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
              placeholder="YYYY-MM-DDTHH:MM"
            />
            <Field
              label="Reason / notes for mother"
              value={rescheduleNotes}
              onChangeText={setRescheduleNotes}
              placeholder="e.g. Clinic session changed to Tuesday morning"
            />
            {appointmentsError ? <Text style={phmAppointmentStyles.errorText}>{appointmentsError}</Text> : null}
            <View style={phmAppointmentStyles.confirmActions}>
              <Pressable disabled={updatingAppointment} onPress={() => setRescheduleTarget(null)} style={phmAppointmentStyles.cancelConfirmButton}>
                <Text style={phmAppointmentStyles.cancelConfirmText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={updatingAppointment} onPress={() => void handleRescheduleAppointment()} style={[phmAppointmentStyles.confirmButton, updatingAppointment && { opacity: 0.6 }]}>
                <Text style={phmAppointmentStyles.confirmButtonText}>{updatingAppointment ? "Saving…" : "Send New Time"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= REJECT MODAL ================= */}
      <Modal visible={rejectTarget !== null} transparent animationType="fade" onRequestClose={() => !updatingAppointment && setRejectTarget(null)}>
        <View style={phmAppointmentStyles.modalBackdrop}>
          <View style={phmAppointmentStyles.confirmModal}>
            <Text style={[phmAppointmentStyles.confirmTitle, { color: "#DC2626" }]}>Reject Appointment Request</Text>
            {rejectTarget ? (
              <Text style={[s.rowSub, { marginBottom: 10 }]}>
                {rejectTarget.type} · {formatPhmAppointmentDate(rejectTarget.date)}
              </Text>
            ) : null}
            <Field
              label="Reason for rejection (mandatory)"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Midwife on divisional field duties on this day"
            />
            {appointmentsError ? <Text style={phmAppointmentStyles.errorText}>{appointmentsError}</Text> : null}
            <View style={phmAppointmentStyles.confirmActions}>
              <Pressable disabled={updatingAppointment} onPress={() => setRejectTarget(null)} style={phmAppointmentStyles.cancelConfirmButton}>
                <Text style={phmAppointmentStyles.cancelConfirmText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={updatingAppointment} onPress={() => void handleRejectAppointment()} style={[phmAppointmentStyles.confirmButton, { backgroundColor: "#DC2626" }, updatingAppointment && { opacity: 0.6 }]}>
                <Text style={phmAppointmentStyles.confirmButtonText}>{updatingAppointment ? "Rejecting…" : "Confirm Reject"}</Text>
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
  targetRole?: "nursing" | "phm";
  date: string;
  place?: string;
  status: "pending" | "confirmed" | "upcoming" | "rescheduled" | "rejected" | "completed" | "done" | "missed" | "cancelled";
  rejectionReason?: string;
  rescheduledNotes?: string;
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
  rescheduleButton: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 9, paddingHorizontal: 10, backgroundColor: "#EA580C" },
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

  const [mothers, setMothers] = useState<any[]>([]);
  const [loadingMothers, setLoadingMothers] = useState(true);
  const [motherSearch, setMotherSearch] = useState("");
  const [selectedMother, setSelectedMother] = useState<any | null>(null);

  const [visitType, setVisitType] = useState<string>("home-visit");
  const [weight, setWeight] = useState("");
  const [bp, setBp] = useState("");
  const [hb, setHb] = useState("");
  const [sfh, setSfh] = useState("");
  const [fhr, setFhr] = useState("");
  const [notes, setNotes] = useState("");
  const [risk, setRisk] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const FLAGS = ["High BP", "Bleeding", "Swelling", "Low Hb", "Reduced movements", "Severe Headache"];

  const loadMothers = useCallback(() => {
    setLoadingMothers(true);
    api<any[]>("/mothers")
      .then((res) => {
        if (Array.isArray(res)) setMothers(res);
      })
      .catch(() => {
        setMothers(FALLBACK);
      })
      .finally(() => setLoadingMothers(false));
  }, []);

  useEffect(() => {
    loadMothers();
  }, [loadMothers]);

  const handleSelectMother = (m: any) => {
    setSelectedMother(m);
    setWeight(m.vitals?.weight ? String(m.vitals.weight) : "");
    setBp(m.vitals?.bp || "");
    setHb(m.vitals?.hb ? String(m.vitals.hb) : "");
    setSfh("");
    setFhr("");
    setNotes("");
    setRisk(Array.isArray(m.riskFlags) ? [...m.riskFlags] : []);
    const isUndelivered = Boolean(m.status === "pregnant" || (m.weeks && m.weeks <= 40));
    setVisitType(isUndelivered ? "home-visit" : "postnatal");
  };

  const save = async () => {
    if (!selectedMother) {
      Alert.alert("Select a Mother", "Please pick an assigned mother from the list below.");
      return;
    }
    setSaving(true);
    const mId = selectedMother._id || selectedMother.id;
    const isUndelivered = Boolean(selectedMother.status === "pregnant" || (selectedMother.weeks && selectedMother.weeks <= 40));

    const payload = {
      type: visitType === "clinic" ? "Clinic ANC Visit" : visitType === "postnatal" ? "postnatal" : "home-visit",
      motherId: mId,
      childName: isUndelivered ? `Baby of ${selectedMother.name}` : selectedMother.childName,
      weight: weight.trim() ? Number(weight) : undefined,
      bp: bp.trim() || undefined,
      hb: hb.trim() ? Number(hb) : undefined,
      riskFlags: risk,
      notes: isUndelivered && (sfh || fhr)
        ? `[SFH: ${sfh || "—"}cm | FHR: ${fhr || "—"}bpm] ${notes.trim()}`.trim()
        : notes.trim(),
    };

    try {
      await api("/records/visits", { method: "POST", body: payload });
      Alert.alert(
        "Visit Saved Successfully",
        isUndelivered
          ? `Antenatal visit and vitals logged for ${selectedMother.name} (Baby of ${selectedMother.name}). Immediately live in Mother's and Nurse's dashboards.`
          : `Postnatal visit and vitals logged for ${selectedMother.name}. Immediately live in Mother's and Nurse's dashboards.`
      );
    } catch {
      await queueRecord(payload);
      Alert.alert("Saved Offline", `Visit queued for ${selectedMother.name}. It will synchronize when connected.`);
    } finally {
      refreshPending();
      if (isOnline) flushPending().then(refreshPending).catch(() => {});
      setSaving(false);
      setWeight("");
      setBp("");
      setHb("");
      setSfh("");
      setFhr("");
      setNotes("");
      setRisk([]);
      setSelectedMother(null);
      loadMothers();
    }
  };

  const filteredMothers = mothers.filter((m) => {
    if (!motherSearch.trim()) return true;
    const q = motherSearch.toLowerCase();
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.id && m.id.toLowerCase().includes(q)) ||
      (m.village && m.village.toLowerCase().includes(q))
    );
  });

  return (
    <Shell title={t.dataEntry}>
      {/* MOTHER SELECTION SECTION */}
      {!selectedMother ? (
        <Card label="SELECT ASSIGNED MOTHER">
          <Text style={[s.muted, { marginBottom: 10, fontSize: 11 }]}>
            Choose a registered mother from your division to log an antenatal home visit or clinic check.
          </Text>
          <Field
            icon="search"
            placeholder="Search by mother name, code or village..."
            value={motherSearch}
            onChangeText={setMotherSearch}
          />
          {loadingMothers ? (
            <Text style={[s.muted, { textAlign: "center", paddingVertical: 14 }]}>Loading mothers list…</Text>
          ) : filteredMothers.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 18 }}>
              <Ionicons name="woman-outline" size={28} color="#94A3B8" />
              <Text style={[s.muted, { marginTop: 6, fontSize: 12 }]}>No matching mothers found</Text>
            </View>
          ) : (
            filteredMothers.slice(0, 10).map((m) => {
              const isUndelivered = m.status === "pregnant" || (m.weeks && m.weeks <= 40);
              const babyTitle = isUndelivered ? `Baby of ${m.name}` : `Child of ${m.name}`;
              return (
                <Row
                  key={m.id || m._id}
                  icon={isUndelivered ? "woman" : "happy"}
                  title={`${m.name} · ${babyTitle}`}
                  sub={`${m.id} · ${m.village || "Buttala"} · ${isUndelivered ? `🤰 Pre-natal (${m.weeks || 28}w)` : "👶 Postnatal"}`}
                  right={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Chip text={`${m.weeks || 28}w`} />
                      <Chip text={m.risk || "low"} tone={riskTone(m.risk || "low")} />
                    </View>
                  }
                  onPress={() => handleSelectMother(m)}
                />
              );
            })
          )}
        </Card>
      ) : (
        <>
          {/* ACTIVE MOTHER SUMMARY BANNER */}
          {(() => {
            const isUndelivered = Boolean(selectedMother.status === "pregnant" || (selectedMother.weeks && selectedMother.weeks <= 40));
            return (
              <Card style={{ backgroundColor: isUndelivered ? "#FFFBEB" : "#F0FDF4", borderColor: isUndelivered ? "#FDE68A" : "#86EFAC", borderWidth: 1, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isUndelivered ? "#D97706" : "#059669", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={isUndelivered ? "woman" : "happy"} size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: isUndelivered ? "#92400E" : "#065F46" }}>{selectedMother.name}</Text>
                      <Text style={{ fontSize: 11.5, color: isUndelivered ? "#B45309" : "#047857", fontWeight: "700" }}>
                        {isUndelivered ? `🤰 Baby of ${selectedMother.name} · Pre-natal (${selectedMother.weeks || 28}w)` : `👶 Postnatal Child · ${selectedMother.childName || "Infant"}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: isUndelivered ? "#78350F" : "#047857" }}>
                        ID: {selectedMother.id} · {selectedMother.village || "Buttala"} · EDD: {selectedMother.edd ? new Date(selectedMother.edd).toLocaleDateString() : "Nov 2026"}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setSelectedMother(null)}
                    style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: isUndelivered ? "#FCD34D" : "#A7F3D0", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: isUndelivered ? "#B45309" : "#065F46" }}>Change</Text>
                  </Pressable>
                </View>

                {selectedMother.vitals && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isUndelivered ? "#FEF3C7" : "#DCFCE7" }}>
                    <Text style={{ fontSize: 11, color: isUndelivered ? "#92400E" : "#047857" }}>
                      Last recorded: Weight: {selectedMother.vitals.weight ? `${selectedMother.vitals.weight}kg` : "—"} · BP: {selectedMother.vitals.bp || "—"} · Hb: {selectedMother.vitals.hb ? `${selectedMother.vitals.hb}g/dL` : "—"}
                    </Text>
                  </View>
                )}
              </Card>
            );
          })()}

          {/* CLINICAL VISIT ENTRY FORM */}
          {(() => {
            const isUndelivered = Boolean(selectedMother.status === "pregnant" || (selectedMother.weeks && selectedMother.weeks <= 40));
            return (
              <Card label={isUndelivered ? "ANTENATAL VISIT FORM" : "POSTNATAL VISIT FORM"}>
                <Text style={[s.muted, { fontWeight: "700", marginBottom: 6 }]}>Visit Type</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  {(isUndelivered
                    ? [
                        { id: "home-visit", label: "🏠 Antenatal Home Visit" },
                        { id: "clinic", label: "🏥 ANC Clinic Visit" },
                        { id: "emergency", label: "🚨 Emergency Check" },
                      ]
                    : [
                        { id: "postnatal", label: "👶 Postnatal Home Visit" },
                        { id: "clinic", label: "🏥 Infant Clinic Check" },
                        { id: "growth", label: "📏 Growth Monitoring" },
                      ]
                  ).map((vt) => {
                    const isSel = visitType === vt.id;
                    return (
                      <Pressable
                        key={vt.id}
                        onPress={() => setVisitType(vt.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          alignItems: "center",
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: isSel ? (isUndelivered ? "#D97706" : "#059669") : "#E2E8F0",
                          backgroundColor: isSel ? (isUndelivered ? "#FEF3C7" : "#ECFDF5") : "#F8FAFC",
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: isSel ? "800" : "600", color: isSel ? (isUndelivered ? "#B45309" : "#047857") : "#475569" }}>
                          {vt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Vitals */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={isUndelivered ? "Maternal Weight (kg)" : "Weight (kg)"}
                      keyboardType="decimal-pad"
                      value={weight}
                      onChangeText={setWeight}
                      placeholder="e.g. 63.5"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="BP (mmHg)"
                      value={bp}
                      onChangeText={setBp}
                      placeholder="e.g. 110/70"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Hemoglobin (Hb g/dL)"
                      keyboardType="decimal-pad"
                      value={hb}
                      onChangeText={setHb}
                      placeholder="e.g. 11.5"
                    />
                  </View>
                  {isUndelivered && (
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Fundal Height (SFH cm)"
                        keyboardType="decimal-pad"
                        value={sfh}
                        onChangeText={setSfh}
                        placeholder="e.g. 28"
                      />
                    </View>
                  )}
                </View>

                {isUndelivered && (
                  <Field
                    label="Fetal Heart Rate (FHR bpm)"
                    keyboardType="numeric"
                    value={fhr}
                    onChangeText={setFhr}
                    placeholder="e.g. 140"
                  />
                )}

                <Text style={[s.muted, { fontWeight: "700", marginBottom: 6, marginTop: 4 }]}>
                  {isUndelivered ? "Antenatal Danger Signs" : "Postnatal Danger Signs"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {FLAGS.map((x) => {
                    const on = risk.includes(x);
                    return (
                      <Pressable
                        key={x}
                        onPress={() => setRisk(on ? risk.filter((r) => r !== x) : [...risk, x])}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: on ? "#EF4444" : "#E2E8F0",
                          backgroundColor: on ? "#FEE2E2" : "#F0F5F4",
                        }}
                      >
                        <Text style={{ fontWeight: "700", fontSize: 11, color: on ? "#B91C1C" : C.ink }}>
                          {on ? "⚠️ " : ""}{x}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Field
                  label={isUndelivered ? "PHM Antenatal Advice / Field Notes" : "PHM Clinical Notes / Advice"}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Clinical observation, counselling given, iron intake, next steps..."
                  style={{ minHeight: 70 }}
                />

                <Button
                  title={saving ? "Saving Record…" : isUndelivered ? "Save Antenatal Visit" : "Save Clinical Visit"}
                  icon="save"
                  onPress={() => !saving && void save()}
                  style={{ marginTop: 14 }}
                />
              </Card>
            );
          })()}
        </>
      )}
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
