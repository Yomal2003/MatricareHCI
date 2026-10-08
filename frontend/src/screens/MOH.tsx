import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api } from "../api/client";
import Shell from "../components/Shell";
import MidwifeProfileModal, { MidwifeData } from "../components/MidwifeProfileModal";
import { Button, C, Card, Chip, Ring, Row, SectionTitle, s, usePalette } from "../components/ui";

const AREAS = [
  { n: "Buttala", v: 88 }, { n: "Wellawaya", v: 76 }, { n: "Okkampitiya", v: 61 }, { n: "Siyambalanduwa", v: 70 }, { n: "Madulla", v: 54 },
];

const INITIAL_MIDWIVES: MidwifeData[] = [
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

export function MOHHome() {
  const { language, navigate } = useApp();
  const t = T[language];
  const p = usePalette();
  const [sum, setSum] = useState({ compliance: 82, immunization: 91, highRisk: 14, records: 0 });
  const [midwives, setMidwives] = useState<MidwifeData[]>(INITIAL_MIDWIVES);
  const [selectedMidwife, setSelectedMidwife] = useState<MidwifeData | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Add Midwife Form State
  const [newName, setNewName] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newArea, setNewArea] = useState("Pelwatte");
  const [newLocations, setNewLocations] = useState("Pelwatte, Malwatte");
  const [newClinic, setNewClinic] = useState("MOH Sub-Clinic");
  const [newQualifications, setNewQualifications] = useState("Registered Public Health Midwife (SLMC)");

  useEffect(() => {
    api("/reports/summary").then(setSum).catch(() => {});
    api<MidwifeData[]>("/users/midwives")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setMidwives(res);
      })
      .catch(() => {});
  }, []);

  const handleCreateMidwife = async () => {
    if (!newName.trim() || !newStaffId.trim()) {
      Alert.alert("Validation", "Midwife name and Staff ID are required.");
      return;
    }

    const payload = {
      name: newName.trim(),
      staffId: newStaffId.trim().toUpperCase(),
      phone: newPhone.trim(),
      area: newArea.trim(),
      locations: newLocations.split(",").map((s) => s.trim()).filter(Boolean),
      clinic: newClinic.trim(),
      badge: `PHM · ${newArea.trim()} Division`,
      qualifications: newQualifications.trim(),
      experienceYears: 5,
    };

    try {
      const created = await api<MidwifeData>("/users/midwives", { method: "POST", body: payload });
      setMidwives((prev) => [...prev, created]);
    } catch {
      // Local fallback
      const localCreated: MidwifeData = {
        ...payload,
        id: String(Date.now()),
      };
      setMidwives((prev) => [...prev, localCreated]);
    }

    setAddModalOpen(false);
    setNewName("");
    setNewStaffId("");
    setNewPhone("");
    Alert.alert("Success", `Midwife ${payload.name} added and assigned to ${payload.area}.`);
  };

  return (
    <Shell title={t.mohDashboard}>
      <Card label="KPI RINGS">
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <Ring value={sum.compliance} label={t.visitCompliance} />
          <Ring value={sum.immunization} label={t.immunizationCoverage} color="#059669" />
        </View>
      </Card>
      <Pressable onPress={() => navigate("moh-alerts")}>
        <Card label="ALERT SUMMARY" style={{ backgroundColor: p.tone("#FEE2E2"), flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Text style={{ fontSize: 40, fontWeight: "900", color: p.tone(C.danger) }}>{sum.highRisk}</Text>
          <View style={{ flex: 1 }}><Text style={s.rowTitle}>{t.highRiskCount}</Text><Text style={s.rowSub}>Tap to review alerts</Text></View>
        </Card>
      </Pressable>

      {/* Midwife & Area Allocation Management */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 }}>
        <SectionTitle>Public Health Midwives & Location Allocation</SectionTitle>
        <Pressable
          onPress={() => setAddModalOpen(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "#7C3AED",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>Add Midwife</Text>
        </Pressable>
      </View>

      <Card label="MIDWIVES DIRECTORY">
        {midwives.map((mw, idx) => (
          <Pressable
            key={mw.staffId || idx}
            onPress={() => setSelectedMidwife(mw)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 10,
              borderBottomWidth: idx === midwives.length - 1 ? 0 : 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#EDE9FE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>👩‍⚕️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{mw.name}</Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  {mw.badge || mw.staffId} · {mw.phone || "No phone"}
                </Text>
                <Text style={{ fontSize: 11.5, color: "#7C3AED", fontWeight: "600", marginTop: 2 }}>
                  📍 Assigned: {(mw.locations || [mw.area]).join(", ")}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: "#F3E8FF",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#7C3AED" }}>Profile ›</Text>
            </View>
          </Pressable>
        ))}
      </Card>

      <SectionTitle>Compliance by PHM area</SectionTitle>
      <Card label="BAR CHART">
        {AREAS.map((a) => (
          <View key={a.n} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "600", color: C.ink }}>{a.n}</Text><Text style={s.muted}>{a.v}%</Text>
            </View>
            <View style={{ height: 10, backgroundColor: "#EEF2F1", borderRadius: 5, marginTop: 4 }}>
              <View style={{ width: `${a.v}%`, height: 10, borderRadius: 5, backgroundColor: a.v < 65 ? p.tone("#F59E0B") : p.color }} />
            </View>
          </View>
        ))}
      </Card>

      {/* Midwife Profile Viewer Modal */}
      <MidwifeProfileModal
        visible={!!selectedMidwife}
        onClose={() => setSelectedMidwife(null)}
        midwife={selectedMidwife}
      />

      {/* Add Midwife Modal */}
      <Modal visible={addModalOpen} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 20,
              maxHeight: "88%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Add Public Health Midwife</Text>
                <Text style={{ fontSize: 12.5, color: "#64748B" }}>Allocate division and coverage locations</Text>
              </View>
              <Pressable
                onPress={() => setAddModalOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>MIDWIFE FULL NAME</Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Deepika Amarasinghe"
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>STAFF ID</Text>
                  <TextInput
                    style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }}
                    value={newStaffId}
                    onChangeText={setNewStaffId}
                    placeholder="e.g. PHM005"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>PHONE NUMBER</Text>
                  <TextInput
                    style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="07xxxxxxxx"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>PRIMARY PHM AREA / DIVISION</Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }}
                value={newArea}
                onChangeText={setNewArea}
                placeholder="e.g. Pelwatte"
              />

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>
                COVERAGE LOCATIONS / VILLAGES (COMMA-SEPARATED)
              </Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }}
                value={newLocations}
                onChangeText={setNewLocations}
                placeholder="e.g. Pelwatte East, Pelwatte South, Malwatte"
              />

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>ASSIGNED CLINIC / HEALTH POST</Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" }}
                value={newClinic}
                onChangeText={setNewClinic}
                placeholder="e.g. Pelwatte Primary Health Care Unit"
              />

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>SLMC QUALIFICATIONS</Text>
              <TextInput
                style={{ height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, fontSize: 14, marginBottom: 14, backgroundColor: "#F8FAFC" }}
                value={newQualifications}
                onChangeText={setNewQualifications}
                placeholder="e.g. Registered Public Health Midwife · SLMC #5120"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable
                onPress={() => setAddModalOpen(false)}
                style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateMidwife}
                style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFFFFF" }}>Save & Assign</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

const ALERTS = [
  { n: "Dilani Kumari", why: "BP 150/100 · 34 wks", area: "Okkampitiya", lvl: "danger" },
  { n: "Nirosha Madushani", why: "Reduced fetal movement", area: "Buttala", lvl: "danger" },
  { n: "Fathima Rizna", why: "Hb 8.9 g/dL", area: "Wellawaya", lvl: "warn" },
  { n: "Baby of Kumudu", why: "Weight below −2SD", area: "Madulla", lvl: "warn" },
];
export function MOHAlerts() {
  const { language } = useApp();
  return (
    <Shell title={T[language].highRiskAlerts}>
      {ALERTS.map((a, i) => (
        <Card key={i} label={i === 0 ? "ALERT CARD" : undefined}>
          <Row icon="warning" iconTone={a.lvl === "danger" ? C.danger : C.warn} title={a.n} sub={`${a.why} · ${a.area}`} right={<Chip text={a.lvl === "danger" ? "Urgent" : "Watch"} tone={a.lvl as any} />} />
        </Card>
      ))}
    </Shell>
  );
}

export function MOHMissed() {
  const { language } = useApp();
  const p = usePalette();
  const data = [["ANC", 12], ["Postnatal", 7], ["Immunization", 9], ["Growth", 5]] as const;
  const max = 12;
  return (
    <Shell title={T[language].missedVisits}>
      <Card label="COLUMN CHART">
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 160, gap: 14 }}>
          {data.map(([k, v]) => (
            <View key={k} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontWeight: "800", color: C.ink }}>{v}</Text>
              <View style={{ width: "100%", height: (v / max) * 120, backgroundColor: p.color, borderRadius: 10, marginTop: 4 }} />
              <Text style={[s.muted, { fontSize: 11, marginTop: 6 }]} numberOfLines={1}>{k}</Text>
            </View>
          ))}
        </View>
      </Card>
      <SectionTitle>By PHM area — this month</SectionTitle>
      <Card label="AREA LIST">
        {AREAS.map((a) => <Row key={a.n} icon="location" title={a.n} sub={`${Math.round((100 - a.v) / 4)} missed visits`} />)}
      </Card>
    </Shell>
  );
}

export function MOHReports() {
  const { language } = useApp();
  const t = T[language];
  const p = usePalette();
  const [type, setType] = useState("H509");
  const [period, setPeriod] = useState("Sep 2026");
  const Opt = ({ v, cur, set }: { v: string; cur: string; set: (v: string) => void }) => (
    <Pressable onPress={() => set(v)} style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: cur === v ? p.color : "#F0F5F4" }}>
      <Text style={{ fontWeight: "700", color: cur === v ? "#fff" : C.ink }}>{v}</Text>
    </Pressable>
  );
  return (
    <Shell title={t.reportGenerator}>
      <Card label="REPORT OPTIONS">
        <Text style={[s.muted, { fontWeight: "700", marginBottom: 8 }]}>Report type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {["H509", "H524", "Immunization", "Missed visits"].map((v) => <Opt key={v} v={v} cur={type} set={setType} />)}
        </View>
        <Text style={[s.muted, { fontWeight: "700", marginBottom: 8 }]}>Period</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["Aug 2026", "Sep 2026", "Q3 2026"].map((v) => <Opt key={v} v={v} cur={period} set={setPeriod} />)}
        </View>
      </Card>
      <Button title={t.generateReport} icon="document-text" onPress={() => Alert.alert(t.generateReport, `${type} · ${period}`)} style={{ marginBottom: 10 }} />
      <Button title={t.exportErhMis} icon="cloud-upload" variant="soft" onPress={() => Alert.alert("eRHMIS", "Export queued")} />
    </Shell>
  );
}
