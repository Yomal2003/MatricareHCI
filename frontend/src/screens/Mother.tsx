import React, { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api } from "../api/client";
import Shell from "../components/Shell";
import { Button, Card, Chip, Field, Ring, Row, SectionTitle, s, usePalette } from "../components/ui";

export function MotherHome() {
  const { language, navigate, user } = useApp();
  const t = T[language];
  const p = usePalette();
  const [next, setNext] = useState({ date: "2026-10-14", place: "Buttala MOH Clinic", type: "ANC — 30 weeks" });
  useEffect(() => { api("/me/summary").then((r) => r.nextAppt && setNext(r.nextAppt)).catch(() => {}); }, []);
  const weeks = 28;
  return (
    <Shell title={t.home}>
      <Text style={s.muted}>Ayubowan,</Text>
      <Text style={[s.h1, { marginBottom: 14 }]}>{(user?.name ?? "Chamari").split(" ")[0]} 🌿</Text>
      <Card label="PREGNANCY PROGRESS" style={{ backgroundColor: p.color }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", opacity: 0.85, fontWeight: "600" }}>Week</Text>
            <Text style={{ color: "#fff", fontSize: 44, fontWeight: "900" }}>{weeks}</Text>
            <Text style={{ color: "#fff", opacity: 0.9 }}>Third trimester · baby ≈ 1.1 kg</Text>
          </View>
          <View style={{ backgroundColor: "#fff", borderRadius: 999, padding: 6 }}><Ring value={Math.round((weeks / 40) * 100)} size={84} /></View>
        </View>
      </Card>
      <Card label="NEXT APPOINTMENT">
        <Row icon="calendar" title={t.nextAppt} sub={`${next.date} · ${next.place}`} right={<Chip text={next.type} tone="ok" />} onPress={() => navigate("mother-appointments")} />
      </Card>
      <SectionTitle>{t.reminders}</SectionTitle>
      <Card label="REMINDER LIST">
        <Row icon="medkit" title="Folic acid & iron" sub="Daily · after breakfast" right={<Chip text="Today" tone="warn" />} />
        <Row icon="water" title="Drink 8 glasses of water" sub="Track hydration" />
      </Card>
      <SectionTitle>{t.healthTips}</SectionTitle>
      <Card label="TIP CARD" style={{ backgroundColor: p.colorLight }}>
        <Text style={{ fontWeight: "800", color: p.colorDark, fontSize: 15 }}>Count baby's kicks</Text>
        <Text style={[s.muted, { marginTop: 4 }]}>Feel at least 10 movements in 12 hours. Call your PHM if movements reduce.</Text>
      </Card>
    </Shell>
  );
}

const VISITS = [
  { d: "Oct 14", title: "ANC visit — 30 weeks", place: "Buttala MOH Clinic", st: "upcoming" },
  { d: "Sep 16", title: "ANC visit — 26 weeks", place: "Buttala MOH Clinic", st: "done" },
  { d: "Aug 30", title: "Home visit by PHM", place: "Home", st: "done" },
  { d: "Aug 12", title: "Ultrasound scan", place: "Monaragala Hospital", st: "missed" },
];
export function MotherAppointments() {
  const { language } = useApp();
  const p = usePalette();
  return (
    <Shell title={T[language].nextAppt}>
      <SectionTitle>Visit timeline</SectionTitle>
      {VISITS.map((v, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center", width: 20 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 20, backgroundColor: v.st === "upcoming" ? p.color : v.st === "missed" ? p.tone("#DC2626") : "#B6C7C5" }} />
            {i < VISITS.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: "#D7E3E1" }} />}
          </View>
          <Card style={{ flex: 1 }} label={i === 0 ? "TIMELINE ITEM" : undefined}>
            <Text style={[s.muted, { fontWeight: "700" }]}>{v.d}</Text>
            <Text style={s.rowTitle}>{v.title}</Text>
            <Text style={s.rowSub}>{v.place}</Text>
            <View style={{ marginTop: 8 }}><Chip text={v.st} tone={v.st === "done" ? "ok" : v.st === "missed" ? "danger" : "neutral"} /></View>
          </Card>
        </View>
      ))}
    </Shell>
  );
}

export function MotherRecords() {
  const { language } = useApp();
  return (
    <Shell title={T[language].myRecords}>
      <Card label="VITALS">
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {[["Weight", "62 kg"], ["BP", "110/70"], ["Hb", "11.4"]].map(([k, v]) => (
            <View key={k} style={{ alignItems: "center" }}><Text style={s.muted}>{k}</Text><Text style={[s.h1, { fontSize: 20 }]}>{v}</Text></View>
          ))}
        </View>
      </Card>
      <SectionTitle>Immunizations</SectionTitle>
      <Card label="IMMUNIZATION LIST">
        <Row icon="shield-checkmark" title="Tetanus toxoid (TT1)" sub="Jul 02, 2026" right={<Ionicons name="checkmark-circle" size={22} color="#059669" />} />
        <Row icon="shield-checkmark" title="Tetanus toxoid (TT2)" sub="Aug 06, 2026" right={<Ionicons name="checkmark-circle" size={22} color="#059669" />} />
        <Row icon="shield-outline" title="Rubella check" sub="Due at next visit" right={<Chip text="Due" tone="warn" />} />
      </Card>
      <SectionTitle>Lab reports</SectionTitle>
      <Card label="LAB LIST">
        <Row icon="flask" title="Blood sugar (OGTT)" sub="Normal · Sep 16" />
        <Row icon="flask" title="Urine protein" sub="Negative · Sep 16" />
      </Card>
    </Shell>
  );
}

export function MotherConsent() {
  const { language } = useApp();
  const t = T[language];
  const [fam, setFam] = useState([{ name: "Ruwan Perera", rel: "Husband", on: true }, { name: "Sumana Perera", rel: "Mother", on: false }]);
  const [name, setName] = useState("");
  return (
    <Shell title={t.familyConsent}>
      <Text style={[s.muted, { marginBottom: 14 }]}>{t.consentDesc}</Text>
      <Card label="FAMILY LIST">
        {fam.map((f, i) => (
          <Row key={i} icon="person" title={f.name} sub={f.rel}
            right={<Switch value={f.on} onValueChange={(v) => setFam(fam.map((x, j) => (j === i ? { ...x, on: v } : x)))} />} />
        ))}
      </Card>
      <SectionTitle>{t.addFamily}</SectionTitle>
      <Card label="ADD FORM">
        <Field icon="person-add" placeholder="Name" value={name} onChangeText={setName} />
        <Field icon="call" placeholder={t.phonePlaceholder} keyboardType="phone-pad" />
        <Button title={t.addFamily} icon="add" onPress={() => { if (name) { setFam([...fam, { name, rel: "Family", on: true }]); setName(""); } }} />
      </Card>
    </Shell>
  );
}
