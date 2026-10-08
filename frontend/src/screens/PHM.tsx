import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context";
import { T } from "../types";
import { api, flushPending, getPending, queueRecord } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Field, Row, s, usePalette } from "../components/ui";

type Mother = { id: string; name: string; village: string; weeks: number; risk: "low" | "medium" | "high" };
const FALLBACK: Mother[] = [
  { id: "M-1043", name: "Dilani Kumari", village: "Okkampitiya", weeks: 34, risk: "high" },
  { id: "M-1044", name: "Fathima Rizna", village: "Wellawaya", weeks: 12, risk: "medium" },
  { id: "M-1045", name: "Sivaranjani K.", village: "Siyambalanduwa", weeks: 22, risk: "low" },
  { id: "M-1046", name: "Nirosha Madushani", village: "Buttala", weeks: 38, risk: "high" },
];
const HOME_FALLBACK: Mother[] = [
  { id: "M-1043", name: "Mala Senarathne", village: "", weeks: 24, risk: "low" },
  { id: "M-1044", name: "Kumari Jayawardena", village: "", weeks: 22, risk: "low" },
  { id: "M-1045", name: "Nilanti Weerasinghe", village: "", weeks: 32, risk: "medium" },
  { id: "M-1046", name: "Sandya Rathnayake", village: "", weeks: 30, risk: "medium" },
];
const riskTone = (r: string) => (r === "high" ? "danger" : r === "medium" ? "warn" : "ok") as any;

type FollowupStatus = "overdue" | "today" | "upcoming";
type FollowupItem = {
  id: string;
  name: string;
  details: string;
  village: string;
  risk: "low" | "medium" | "high";
  status: FollowupStatus;
  dueLabel: string;
};
type AppointmentRecord = {
  _id?: string;
  type?: string;
  date?: string;
  status?: string;
  mother?: {
    code?: string;
    name?: string;
    village?: string;
    risk?: string;
  } | null;
};

const FOLLOWUP_FALLBACK: FollowupItem[] = [
  { id: "M-1043", name: "Priyanka Dissanayake", details: "29 wks ANC · G2", village: "Hella", risk: "high", status: "overdue", dueLabel: "Overdue 14d" },
  { id: "M-1044", name: "Vindya Kumari", details: "35 wks ANC · G1", village: "Gofagala", risk: "medium", status: "overdue", dueLabel: "Overdue 7d" },
  { id: "M-1045", name: "Rukshani Peiris", details: "PP 4 wks", village: "Buttala", risk: "low", status: "today", dueLabel: "Due today" },
  { id: "M-1046", name: "Dilrukshi Senanayake", details: "18 wks ANC · G3", village: "Weeragama", risk: "low", status: "today", dueLabel: "Due today" },
  { id: "M-1047", name: "Tharaka Bandara", details: "22 wks ANC · G1", village: "Hella", risk: "low", status: "upcoming", dueLabel: "Upcoming" },
  { id: "M-1048", name: "Chamila Jayasena", details: "8 wks ANC · G2", village: "Buttala", risk: "low", status: "upcoming", dueLabel: "Upcoming" },
];

export function useMothers(q = "", fallback = FALLBACK) {
  const [list, setList] = useState<Mother[]>(fallback);
  useEffect(() => {
    api<Mother[]>(`/mothers?q=${encodeURIComponent(q)}`).then(setList)
      .catch(() => setList(fallback.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))));
  }, [q, fallback]);
  return list;
}

export function PHMHome() {
  const { navigate, pending, user } = useApp();
  const p = usePalette();
  const mothers = useMothers("", HOME_FALLBACK);
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date()).toUpperCase();
  const summary: {
    value: string;
    label: string;
    detail: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    background: string;
  }[] = [
    { value: "8", label: "Today's Visits", detail: "5 due · 3 other", icon: "calendar", color: "#059669", background: "#E5F7F0" },
    { value: "3", label: "Overdue", detail: "Follow-ups", icon: "time", color: "#E5484D", background: "#FFF0F0" },
    { value: "2", label: "High Risk", detail: "Any time", icon: "warning", color: "#E89A22", background: "#FFF6E7" },
    { value: String(pending), label: "Pending Sync", detail: "records offline", icon: "cloud-upload", color: "#7666E8", background: "#F1EFFF" },
  ];

  return (
    <Shell
      title={user?.name?.split(" ")[0] || "Kamani"}
      headerBadge="Monaragala Division · PHM"
      headerLeadingIcon="menu"
    >
      <View style={homeStyles.content}>
        <View style={homeStyles.overviewHeader}>
          <View style={homeStyles.overviewCopy}>
            <Text style={homeStyles.date}>{today}</Text>
            <Text style={homeStyles.title}>Today's Overview</Text>
          </View>
          <View style={homeStyles.dutyChip}>
            <View style={[homeStyles.dutyDot, { backgroundColor: p.color }]} />
            <Text style={[homeStyles.dutyText, { color: p.colorDark }]}>Active duty</Text>
          </View>
        </View>

        <View>
          <Text style={homeStyles.sectionLabel}>QUICK SUMMARY</Text>
          <View style={homeStyles.summaryRows}>
            {[summary.slice(0, 2), summary.slice(2)].map((items, rowIndex) => (
              <View key={rowIndex} style={homeStyles.summaryRow}>
                {items.map((item) => (
                  <Card key={item.label} label="KPI" style={homeStyles.summaryCard}>
                    <View style={[homeStyles.summaryIcon, { backgroundColor: item.background }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={homeStyles.summaryCopy}>
                      <Text style={homeStyles.summaryValue}>{item.value}</Text>
                      <Text numberOfLines={1} style={homeStyles.summaryLabel}>{item.label}</Text>
                      <Text numberOfLines={1} style={homeStyles.summaryDetail}>{item.detail}</Text>
                    </View>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View>
          <View style={homeStyles.visitsHeading}>
            <Text style={homeStyles.sectionLabel}>TODAY'S VISITS</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("phm-followups")}
              hitSlop={8}
              style={({ pressed }) => pressed && homeStyles.pressed}
            >
              <Text style={[homeStyles.allVisits, { color: p.colorDark }]}>All visits</Text>
            </Pressable>
          </View>
          <Card label="VISIT LIST" style={homeStyles.visitsCard}>
            {mothers.slice(0, 4).map((mother, index) => {
              const isRecorded = index < 2;
              return (
                <React.Fragment key={mother.id}>
                  {index > 0 && <View style={homeStyles.separator} />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open visit record for ${mother.name}`}
                    onPress={() => navigate("phm-entry")}
                    style={({ pressed }) => [homeStyles.visitRow, pressed && homeStyles.pressed]}
                  >
                    <View style={[homeStyles.motherAvatar, { backgroundColor: p.colorLight }]}>
                      <Ionicons name="woman-outline" size={17} color={p.colorDark} />
                    </View>
                    <View style={homeStyles.visitCopy}>
                      <Text numberOfLines={1} style={homeStyles.motherName}>{mother.name}</Text>
                      <Text numberOfLines={1} style={homeStyles.motherDetails}>{mother.weeks} wks ANC</Text>
                    </View>
                    {isRecorded ? (
                      <View style={homeStyles.recordedStatus}>
                        <Ionicons name="checkmark-circle" size={19} color={p.color} />
                      </View>
                    ) : (
                      <View style={[homeStyles.recordButton, { backgroundColor: p.colorLight }]}>
                        <Text style={[homeStyles.recordText, { color: p.colorDark }]}>Record</Text>
                      </View>
                    )}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </Card>
        </View>

        <View style={homeStyles.actions}>
          <Button
            title="Quick Entry"
            icon="create-outline"
            onPress={() => navigate("phm-entry")}
            style={homeStyles.actionButton}
          />
          <Button
            title="Follow-ups"
            icon="calendar-outline"
            variant="ghost"
            onPress={() => navigate("phm-followups")}
            style={{ ...homeStyles.actionButton, ...homeStyles.secondaryAction, borderColor: p.color, backgroundColor: "#fff" }}
          />
        </View>
      </View>
    </Shell>
  );
}

const homeStyles = StyleSheet.create({
  content: { alignSelf: "center", width: "100%", maxWidth: 640, gap: 16 },
  overviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  overviewCopy: { flex: 1, minWidth: 0 },
  date: { color: "#7A9290", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: C.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.4, marginTop: 4 },
  dutyChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E6F7EF" },
  dutyDot: { width: 6, height: 6, borderRadius: 3 },
  dutyText: { fontSize: 10, fontWeight: "700" },
  sectionLabel: { color: "#748987", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  summaryRows: { gap: 9, marginTop: 8 },
  summaryRow: { flexDirection: "row", gap: 9 },
  summaryCard: { flex: 1, minWidth: 0, minHeight: 80, flexDirection: "row", alignItems: "center", gap: 9, padding: 10, marginBottom: 0, borderRadius: 14, shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  summaryIcon: { width: 32, height: 32, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryValue: { color: C.ink, fontSize: 17, fontWeight: "800", lineHeight: 20 },
  summaryLabel: { marginTop: 1, color: C.ink, fontSize: 10, fontWeight: "700" },
  summaryDetail: { marginTop: 1, color: C.sub, fontSize: 9 },
  visitsHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  allVisits: { fontSize: 11, fontWeight: "700" },
  visitsCard: { paddingHorizontal: 12, paddingVertical: 2, marginBottom: 0, borderRadius: 14, shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  visitRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  motherAvatar: { width: 32, height: 32, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  visitCopy: { flex: 1, minWidth: 0 },
  motherName: { color: C.ink, fontSize: 11, fontWeight: "700" },
  motherDetails: { marginTop: 2, color: C.sub, fontSize: 9 },
  recordedStatus: { width: 44, alignItems: "center" },
  recordButton: { minWidth: 48, alignItems: "center", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  recordText: { fontSize: 9, fontWeight: "700" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 42, backgroundColor: "#E9EFED" },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, minHeight: 46, paddingHorizontal: 8, borderRadius: 12 },
  secondaryAction: { borderWidth: 1.5 },
  pressed: { opacity: 0.75 },
});

export function PHMFollowups() {
  const [items, setItems] = useState(FOLLOWUP_FALLBACK);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | FollowupStatus>("all");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    api<AppointmentRecord[]>("/appointments")
      .then((appointments) => {
        const today = new Date();
        const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const liveItems = appointments.flatMap((appointment): FollowupItem[] => {
          if (!appointment.mother?.name || !appointment.date || appointment.status === "done" || appointment.status === "cancelled") return [];
          const date = new Date(appointment.date);
          if (Number.isNaN(date.getTime())) return [];
          const dayDistance = Math.round(
            (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - todayUtc) / 86400000,
          );
          const status: FollowupStatus = appointment.status === "missed" || dayDistance < 0
            ? "overdue"
            : dayDistance === 0 ? "today" : "upcoming";
          const dueLabel = status === "overdue"
            ? `Overdue ${Math.abs(dayDistance)}d`
            : status === "today" ? "Due today" : `In ${dayDistance}d`;
          return [{
            id: appointment._id ?? appointment.mother.code ?? appointment.mother.name,
            name: appointment.mother.name,
            details: (appointment.type ?? "Follow-up").replace(/[—–]/g, " ").trim(),
            village: appointment.mother.village ?? "",
            risk: appointment.mother.risk === "high" ? "high" : appointment.mother.risk === "medium" ? "medium" : "low",
            status,
            dueLabel,
          }];
        });
        if (active) {
          setItems(liveItems);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active) {
          setItems(FOLLOWUP_FALLBACK);
          setLoadError(true);
        }
      });
    return () => { active = false; };
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const searchable = `${item.name} ${item.village} ${item.details}`.toLowerCase();
    return matchesFilter && searchable.includes(query.trim().toLowerCase());
  });
  const filters: { id: "all" | FollowupStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "overdue", label: "Overdue" },
    { id: "today", label: "Due today" },
    { id: "upcoming", label: "Upcoming" },
  ];
  const statusColors: Record<FollowupStatus, { color: string; background: string }> = {
    overdue: { color: "#B42318", background: "#FEECEB" },
    today: { color: "#A35B00", background: "#FFF4D6" },
    upcoming: { color: "#16805D", background: "#E7F6EF" },
  };

  return (
    <Shell
      title="Follow-up List"
      headerBadge={null}
      headerLeadingIcon="chevron-back"
      headerBackTo="phm-home"
    >
      <View style={followupStyles.search}>
        <Ionicons name="search" size={17} color="#82918D" />
        <TextInput
          accessibilityLabel="Search follow-ups"
          value={query}
          onChangeText={setQuery}
          placeholder="Search mother or village"
          placeholderTextColor="#94A29E"
          returnKeyType="search"
          style={followupStyles.searchInput}
        />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={17} color="#94A29E" />
          </Pressable>
        )}
      </View>

      <View style={followupStyles.filters}>
        {filters.map((option) => {
          const selected = filter === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(option.id)}
              style={[followupStyles.filter, selected && followupStyles.filterSelected]}
            >
              <Text numberOfLines={1} style={[followupStyles.filterText, selected && followupStyles.filterTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={followupStyles.count}>{filteredItems.length} {filteredItems.length === 1 ? "mother" : "mothers"} · Monaragala Division</Text>
      {loadError && (
        <View accessibilityRole="alert" style={followupStyles.notice}>
          <Ionicons name="cloud-offline-outline" size={14} color="#7C6A38" />
          <Text style={followupStyles.noticeText}>Live appointments unavailable. Showing sample follow-ups.</Text>
        </View>
      )}

      {filteredItems.length ? filteredItems.map((item) => {
        const tone = statusColors[item.status];
        return (
          <View key={item.id} style={followupStyles.itemCard}>
            <View style={[followupStyles.cardAccent, { backgroundColor: item.risk === "high" ? "#D94A45" : tone.color }]} />
            <View style={followupStyles.itemContent}>
              <View style={followupStyles.itemTop}>
                <View style={followupStyles.initial}>
                  <Text style={followupStyles.initialText}>{item.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</Text>
                </View>
                <View style={followupStyles.motherInfo}>
                  <Text numberOfLines={1} style={followupStyles.name}>{item.name}</Text>
                  <Text numberOfLines={1} style={followupStyles.details}>{item.details}</Text>
                </View>
                <View style={[followupStyles.statusBadge, { backgroundColor: tone.background }]}>
                  <Text numberOfLines={1} style={[followupStyles.statusText, { color: tone.color }]}>{item.dueLabel}</Text>
                </View>
              </View>
              <View style={followupStyles.itemBottom}>
                <View style={followupStyles.village}>
                  <Ionicons name="location-outline" size={12} color="#81918C" />
                  <Text numberOfLines={1} style={followupStyles.villageText}>{item.village}</Text>
                </View>
                {item.risk === "high" && (
                  <View style={followupStyles.riskBadge}>
                    <Ionicons name="alert-circle" size={12} color="#B42318" />
                    <Text style={followupStyles.riskText}>High risk</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      }) : (
        <View style={followupStyles.empty}>
          <Ionicons name="calendar-outline" size={24} color="#8A9994" />
          <Text style={followupStyles.emptyText}>No follow-ups match your search.</Text>
        </View>
      )}
    </Shell>
  );
}

const followupStyles = StyleSheet.create({
  search: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E3EBE7", backgroundColor: "#fff" },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, color: "#19342D", fontSize: 12 },
  filters: { flexDirection: "row", gap: 5, marginBottom: 14 },
  filter: { flex: 1, minWidth: 0, minHeight: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderRadius: 9, borderWidth: 1, borderColor: "#E3EBE7", backgroundColor: "#fff" },
  filterSelected: { borderColor: "#16805D", backgroundColor: "#16805D" },
  filterText: { color: "#687B74", fontSize: 10, fontWeight: "600" },
  filterTextSelected: { color: "#fff", fontWeight: "700" },
  count: { marginBottom: 9, color: "#687B74", fontSize: 11, fontWeight: "600" },
  notice: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9, marginBottom: 9, borderRadius: 9, backgroundColor: "#FFF8E7" },
  noticeText: { flex: 1, color: "#7C6A38", fontSize: 10 },
  itemCard: { minHeight: 74, flexDirection: "row", overflow: "hidden", marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E8EEEB", backgroundColor: "#fff", shadowColor: "#14382D", shadowOpacity: 0.035, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardAccent: { width: 3 },
  itemContent: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 9 },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  initial: { width: 32, height: 32, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#E9F5EF" },
  initialText: { color: "#16805D", fontSize: 10, fontWeight: "700" },
  motherInfo: { flex: 1, minWidth: 0 },
  name: { color: "#19342D", fontSize: 11, fontWeight: "700" },
  details: { marginTop: 2, color: "#778780", fontSize: 9 },
  statusBadge: { maxWidth: 88, flexShrink: 0, alignItems: "center", paddingHorizontal: 7, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 8, fontWeight: "700" },
  itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6, paddingLeft: 40 },
  village: { flexDirection: "row", alignItems: "center", gap: 3, flex: 1, minWidth: 0 },
  villageText: { color: "#81918C", fontSize: 9 },
  riskBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: "#FEECEB" },
  riskText: { color: "#B42318", fontSize: 8, fontWeight: "700" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 30 },
  emptyText: { color: "#778780", fontSize: 11 },
});

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
  const p = usePalette();
  const mothers = useMothers();
  const [f, setF] = useState({ motherId: "", gestationWeeks: "", weight: "", bp: "", hb: "", fetalPosition: "", notes: "" });
  const [risk, setRisk] = useState<string[]>([]);
  const [motherPickerOpen, setMotherPickerOpen] = useState(false);
  const [riskOptionsOpen, setRiskOptionsOpen] = useState(false);
  const FLAGS = ["High BP", "Bleeding", "Swelling", "Low Hb", "Reduced movements"];
  const selectedMother = mothers.find((mother) => mother.id === f.motherId);

  useEffect(() => {
    if (!selectedMother && mothers.length) {
      setF((current) => ({ ...current, motherId: mothers[0].id }));
    }
  }, [f.motherId, mothers, selectedMother]);

  const save = async () => {
    if (!f.motherId) return Alert.alert("Mother ID required");
    await queueRecord({ type: "home-visit", ...f, risk });
    refreshPending();
    if (isOnline) flushPending().then(refreshPending).catch(() => {});
    Alert.alert("Saved", isOnline ? "Uploaded to server" : "Saved offline — will sync later");
    setF({ motherId: "", gestationWeeks: "", weight: "", bp: "", hb: "", fetalPosition: "", notes: "" }); setRisk([]);
  };
  return (
    <Shell title="Record Visit" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-home">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select mother"
        accessibilityState={{ expanded: motherPickerOpen }}
        onPress={() => setMotherPickerOpen((open) => !open)}
        style={({ pressed }) => [entryStyles.motherSelector, pressed && { opacity: 0.8 }]}
      >
        <View style={entryStyles.motherIcon}>
          <Ionicons name="person" size={17} color="#fff" />
        </View>
        <View style={entryStyles.motherCopy}>
          <Text numberOfLines={1} style={entryStyles.motherName}>{selectedMother?.name ?? "Select a mother"}</Text>
          <Text numberOfLines={1} style={entryStyles.motherDetails}>
            {selectedMother ? `${selectedMother.id} · ${selectedMother.weeks} wks` : "Choose a mother for this visit"}
          </Text>
        </View>
        <Ionicons name={motherPickerOpen ? "chevron-up" : "chevron-down"} size={15} color="#8A9A96" />
      </Pressable>
      {motherPickerOpen && (
        <View style={entryStyles.motherList}>
          {mothers.map((mother) => (
            <Pressable
              key={mother.id}
              accessibilityRole="button"
              onPress={() => {
                setF((current) => ({ ...current, motherId: mother.id }));
                setMotherPickerOpen(false);
              }}
              style={entryStyles.motherOption}
            >
              <View style={entryStyles.motherOptionCopy}>
                <Text numberOfLines={1} style={entryStyles.motherName}>{mother.name}</Text>
                <Text style={entryStyles.motherDetails}>{mother.id} · {mother.village}</Text>
              </View>
              {mother.id === f.motherId && <Ionicons name="checkmark-circle" size={18} color={p.color} />}
            </Pressable>
          ))}
        </View>
      )}

      <EntryField
        label="GESTATION (WEEKS)"
        value={f.gestationWeeks}
        onChangeText={(gestationWeeks) => setF({ ...f, gestationWeeks })}
        placeholder="e.g. 28"
        unit="wks"
        keyboardType="number-pad"
      />
      <EntryField
        label="WEIGHT (KG)"
        value={f.weight}
        onChangeText={(weight) => setF({ ...f, weight })}
        placeholder="e.g. 62.5"
        unit="kg"
        keyboardType="decimal-pad"
      />
      <EntryField
        label="BLOOD PRESSURE"
        value={f.bp}
        onChangeText={(bp) => setF({ ...f, bp })}
        placeholder="e.g. 120/80"
        unit="mmHg"
        keyboardType="decimal-pad"
      />
      <EntryField
        label="HB LEVEL (G/DL)"
        value={f.hb}
        onChangeText={(hb) => setF({ ...f, hb })}
        placeholder="e.g. 11.5"
        unit="g/dL"
        keyboardType="decimal-pad"
      />
      <EntryField
        label="FETAL POSITION"
        value={f.fetalPosition}
        onChangeText={(fetalPosition) => setF({ ...f, fetalPosition })}
        placeholder="e.g. Cephalic"
      />
      <View style={entryStyles.fieldWrap}>
        <Text style={entryStyles.label}>CLINICAL NOTES</Text>
        <TextInput
          accessibilityLabel="Clinical notes"
          value={f.notes}
          onChangeText={(notes) => setF({ ...f, notes })}
          placeholder="Any clinical issues, referrals..."
          placeholderTextColor="#A0B0AC"
          multiline
          textAlignVertical="top"
          style={[entryStyles.input, entryStyles.notesInput]}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: riskOptionsOpen }}
        onPress={() => setRiskOptionsOpen((open) => !open)}
        style={entryStyles.riskToggle}
      >
        <View style={entryStyles.riskToggleLabel}>
          <Ionicons name="alert-circle-outline" size={15} color={risk.length ? C.danger : "#81918C"} />
          <Text style={entryStyles.riskToggleText}>
            {risk.length ? `Danger signs · ${risk.length} selected` : "Add danger signs (optional)"}
          </Text>
        </View>
        <Ionicons name={riskOptionsOpen ? "chevron-up" : "chevron-down"} size={15} color="#81918C" />
      </Pressable>
      {riskOptionsOpen && (
        <View style={entryStyles.riskOptions}>
          {FLAGS.map((flag) => {
            const selected = risk.includes(flag);
            return (
              <Pressable
                key={flag}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => setRisk((current) => selected ? current.filter((item) => item !== flag) : [...current, flag])}
                style={[entryStyles.riskOption, selected && entryStyles.riskOptionSelected]}
              >
                <Text style={[entryStyles.riskOptionText, selected && entryStyles.riskOptionTextSelected]}>{flag}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={save}
        style={({ pressed }) => [entryStyles.saveButton, { backgroundColor: p.color }, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="save-outline" size={16} color="#fff" />
        <Text style={entryStyles.saveText}>Save Record</Text>
      </Pressable>
    </Shell>
  );
}

function EntryField({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  unit?: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}) {
  return (
    <View style={entryStyles.fieldWrap}>
      <Text style={entryStyles.label}>{label}</Text>
      <View style={entryStyles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0B0AC"
          keyboardType={keyboardType}
          style={entryStyles.input}
        />
        {unit && <Text style={entryStyles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const entryStyles = StyleSheet.create({
  motherSelector: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 9, borderRadius: 11, borderWidth: 1, borderColor: "#E3ECEA", backgroundColor: "#fff" },
  motherIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#059669" },
  motherCopy: { flex: 1, minWidth: 0 },
  motherName: { color: "#173B35", fontSize: 11, fontWeight: "700" },
  motherDetails: { marginTop: 1, color: "#879994", fontSize: 9 },
  motherList: { marginTop: -7, marginBottom: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: "#E3ECEA", borderRadius: 11, backgroundColor: "#fff" },
  motherOption: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7EEEB" },
  motherOptionCopy: { flex: 1, minWidth: 0, paddingVertical: 7 },
  fieldWrap: { marginBottom: 6 },
  label: { marginBottom: 3, color: "#81918C", fontSize: 8, fontWeight: "800", letterSpacing: 0.45 },
  inputRow: { minHeight: 33, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: "#E2EAE7", backgroundColor: "#fff" },
  input: { flex: 1, minWidth: 0, minHeight: 31, paddingVertical: 5, color: "#173B35", fontSize: 11 },
  unit: { marginLeft: 6, color: "#97A6A2", fontSize: 9 },
  notesInput: { minHeight: 56, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: "#E2EAE7", backgroundColor: "#fff" },
  riskToggle: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 4 },
  riskToggleLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  riskToggleText: { color: "#71827D", fontSize: 9, fontWeight: "600" },
  riskOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  riskOption: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "#F0F5F4" },
  riskOptionSelected: { backgroundColor: "#FEE2E2" },
  riskOptionText: { color: "#5B7275", fontSize: 9, fontWeight: "600" },
  riskOptionTextSelected: { color: "#B42318" },
  saveButton: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, shadowColor: "#0F2A2E", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  saveText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

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
