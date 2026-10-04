import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useApp } from "../context";
import { T } from "../types";
import { api } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Ring, Row, SectionTitle, s, usePalette } from "../components/ui";

const AREAS = [
  { n: "Buttala", v: 88 }, { n: "Wellawaya", v: 76 }, { n: "Okkampitiya", v: 61 }, { n: "Siyambalanduwa", v: 70 }, { n: "Madulla", v: 54 },
];

export function MOHHome() {
  const { language, navigate } = useApp();
  const t = T[language];
  const p = usePalette();
  const [sum, setSum] = useState({ compliance: 82, immunization: 91, highRisk: 14, records: 0 });
  useEffect(() => { api("/reports/summary").then(setSum).catch(() => {}); }, []);
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
