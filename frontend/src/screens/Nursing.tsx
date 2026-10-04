import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Field, Row, SectionTitle, s, usePalette } from "../components/ui";
import { useMothers } from "./PHM";

type Q = { token: number; name: string; reason: string; status: "waiting" | "in-room" | "done" };
const FALLBACK: Q[] = [
  { token: 11, name: "Fathima Rizna", reason: "Dating scan", status: "in-room" },
  { token: 12, name: "Nirosha Madushani", reason: "ANC visit", status: "waiting" },
  { token: 13, name: "Baby of Dilani", reason: "BCG + Weight", status: "waiting" },
  { token: 10, name: "Baby of Chamari", reason: "Penta 2", status: "done" },
];

export function NursingHome() {
  const { language, navigate } = useApp();
  const p = usePalette();
  const [q, setQ] = useState<Q[]>(FALLBACK);
  useEffect(() => { api<Q[]>("/queue").then(setQ).catch(() => {}); }, []);
  const now = q.find((x) => x.status === "in-room");
  const advance = (tok: number) => setQ(q.map((x) => (x.token === tok ? { ...x, status: x.status === "waiting" ? "in-room" : "done" } : x)));
  return (
    <Shell title={T[language].clinicQueue}>
      {now && (
        <Card label="NOW SERVING" style={{ backgroundColor: p.color }}>
          <Text style={{ color: "#fff", opacity: 0.85, fontWeight: "700" }}>Now serving</Text>
          <Text style={{ color: "#fff", fontSize: 48, fontWeight: "900" }}>#{now.token}</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{now.name} · {now.reason}</Text>
          <Button title="Mark done" variant="soft" onPress={() => advance(now.token)} style={{ marginTop: 12 }} />
        </Card>
      )}
      <SectionTitle>{`Waiting (${q.filter((x) => x.status === "waiting").length})`}</SectionTitle>
      <Card label="QUEUE LIST">
        {q.filter((x) => x.status !== "in-room").map((x) => (
          <Row key={x.token} icon="person" title={`#${x.token}  ${x.name}`} sub={x.reason}
            onPress={() => (x.status === "waiting" ? advance(x.token) : navigate("nursing-entry"))}
            right={<Chip text={x.status} tone={x.status === "done" ? "ok" : "warn"} />} />
        ))}
      </Card>
    </Shell>
  );
}

const VACCINES = ["BCG", "OPV", "Penta", "MMR", "JE", "DT"];
export function NursingEntry() {
  const { language, isOnline, refreshPending } = useApp();
  const p = usePalette();
  const [vax, setVax] = useState<string | null>(null);
  const [f, setF] = useState({ childId: "", weight: "", height: "", batch: "" });
  const save = async () => {
    if (!f.childId) return Alert.alert("Child ID required");
    await queueRecord({ type: "immunization", motherId: f.childId, vaccine: vax, ...f });
    refreshPending();
    if (isOnline) flushPending().then(refreshPending).catch(() => {});
    Alert.alert("Recorded", isOnline ? "Uploaded" : "Saved offline");
    setF({ childId: "", weight: "", height: "", batch: "" }); setVax(null);
  };
  return (
    <Shell title={T[language].immunizationEntry}>
      <Card label="IMMUNIZATION FORM">
        <Field label="Child ID" icon="id-card" value={f.childId} onChangeText={(v) => setF({ ...f, childId: v })} placeholder="C-2201" />
        <Text style={[s.muted, { fontWeight: "700", marginBottom: 8 }]}>Vaccine</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {VACCINES.map((v) => (
            <Pressable key={v} onPress={() => setVax(v)} style={{ width: "31%", paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: vax === v ? p.color : "#F0F5F4" }}>
              <Text style={{ fontWeight: "800", color: vax === v ? "#fff" : C.ink }}>{v}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Batch no." value={f.batch} onChangeText={(v) => setF({ ...f, batch: v })} />
      </Card>
      <Card label="GROWTH FORM">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Weight (kg)" keyboardType="decimal-pad" value={f.weight} onChangeText={(v) => setF({ ...f, weight: v })} /></View>
          <View style={{ flex: 1 }}><Field label="Height (cm)" keyboardType="decimal-pad" value={f.height} onChangeText={(v) => setF({ ...f, height: v })} /></View>
        </View>
        <Button title="Save entry" icon="checkmark" onPress={save} />
      </Card>
    </Shell>
  );
}

export function NursingSearch() {
  const { language } = useApp();
  const [q, setQ] = useState("");
  const list = useMothers(q);
  return (
    <Shell title={T[language].recordRetrieval}>
      <Field icon="search" placeholder="Name, ID or phone" value={q} onChangeText={setQ} />
      <Card label="RECORD LIST">
        {list.map((m) => <Row key={m.id} icon="folder-open" title={m.name} sub={`${m.id} · ${m.village} · ${m.weeks} wks`} right={<Chip text={m.risk} tone={m.risk === "high" ? "danger" : "neutral"} />} />)}
      </Card>
    </Shell>
  );
}
