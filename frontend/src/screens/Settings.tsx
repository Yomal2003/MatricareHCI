import React, { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useApp } from "../context";
import { Language, ROLE_CONFIG, T } from "../types";
import Shell from "../components/Shell";
import { Button, Card, Row, SectionTitle, s, usePalette } from "../components/ui";

const LANGS: { k: Language; label: string; sub: string }[] = [
  { k: "en", label: "English", sub: "English" }, { k: "si", label: "සිංහල", sub: "Sinhala" }, { k: "ta", label: "தமிழ்", sub: "Tamil" },
];

export default function Settings() {
  const { language, setLanguage, wireframeMode, setWireframeMode, logout, role, navigate } = useApp();
  const p = usePalette();
  const t = T[language];
  const [notif, setNotif] = useState(true);
  return (
    <Shell title={t.settings}>
      <Pressable onPress={() => navigate(ROLE_CONFIG[role!].homeScreen)}><Text style={[s.action, { color: p.color, marginBottom: 12 }]}>‹ {t.home}</Text></Pressable>
      <SectionTitle>{t.language}</SectionTitle>
      <Card label="LANGUAGE PICKER">
        {LANGS.map((l) => (
          <Row key={l.k} icon="language" title={l.label} sub={l.sub} onPress={() => setLanguage(l.k)}
            right={<View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: p.color, backgroundColor: language === l.k ? p.color : "transparent" }} />} />
        ))}
      </Card>
      <SectionTitle>Preferences</SectionTitle>
      <Card label="TOGGLES">
        <Row icon="notifications" title={t.notifications} right={<Switch value={notif} onValueChange={setNotif} trackColor={{ true: p.color }} />} />
        <Row icon="grid" title="Wireframe mode" sub="Grayscale · grid · component labels" right={<Switch value={wireframeMode} onValueChange={setWireframeMode} trackColor={{ true: p.color }} />} />
      </Card>
      <Button title={t.logout} icon="log-out" variant="ghost" onPress={logout} />
    </Shell>
  );
}
