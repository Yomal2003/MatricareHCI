import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, getPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Field, Ring, Row, SectionTitle, s, usePalette } from "../components/ui";

type Mother = { id: string; name: string; village: string; weeks: number; risk: "low" | "medium" | "high" };
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
  const [q, setQ] = useState("");
  const list = useMothers(q);
  return (
    <Shell title={t.searchMothers}>
      <Field icon="search" placeholder="Name or ID" value={q} onChangeText={setQ} />
      <Card label="RESULTS">
        {list.length ? list.map((m) => <Row key={m.id} icon="woman" title={m.name} sub={`${m.id} · ${m.village}`} right={<Chip text={`${m.weeks}w`} />} />)
          : <Text style={s.muted}>No mothers found</Text>}
      </Card>
    </Shell>
  );
}

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
