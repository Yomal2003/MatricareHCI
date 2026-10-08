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

type EntryKind = "anc" | "vaccination" | "growth";
type EntryForm = {
  motherId: string;
  gestationWeeks: string;
  weight: string;
  bp: string;
  hb: string;
  fetalPosition: string;
  vaccine: string;
  lotNumber: string;
  expiryDate: string;
  vaccineNotes: string;
  childAgeMonths: string;
  height: string;
  headCircumference: string;
  muac: string;
  notes: string;
};
type PendingRecord = {
  localId?: string;
  type?: string;
  recordCategory?: EntryKind;
  visitType?: string;
  motherId?: string;
  motherName?: string;
  vaccine?: string;
  createdAt?: string;
  [key: string]: unknown;
};

const createEntryForm = (): EntryForm => ({
  motherId: "",
  gestationWeeks: "",
  weight: "",
  bp: "",
  hb: "",
  fetalPosition: "",
  vaccine: "",
  lotNumber: "",
  expiryDate: "",
  vaccineNotes: "",
  childAgeMonths: "",
  height: "",
  headCircumference: "",
  muac: "",
  notes: "",
});

const ENTRY_TABS: { id: EntryKind; label: string }[] = [
  { id: "anc", label: "ANC Visit" },
  { id: "vaccination", label: "Vaccination" },
  { id: "growth", label: "Growth" },
];

const isSyncSupported = (item: PendingRecord) =>
  item.recordCategory !== "vaccination" &&
  item.recordCategory !== "growth" &&
  item.type !== "immunization" &&
  item.type !== "growth";

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
      headerPressTo="phm-profile"
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

export function PHMProfile() {
  const { user } = useApp();
  const p = usePalette();
  const details = [
    { icon: "person-outline" as const, label: "Name", value: user?.name || "Kamani Rathnayake" },
    { icon: "ribbon-outline" as const, label: "Role", value: "PHM" },
    { icon: "location-outline" as const, label: "PHM Division", value: "Monaragala Division" },
    { icon: "id-card-outline" as const, label: "PHM ID", value: "PHM001" },
    { icon: "call-outline" as const, label: "Contact Number", value: "Not provided" },
  ];

  return (
    <Shell title="Profile Details" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-home">
      <Card style={profileStyles.card}>
        <View style={[profileStyles.avatar, { backgroundColor: p.colorLight }]}>
          <Ionicons name="person" size={28} color={p.colorDark} />
        </View>
        <Text style={profileStyles.name}>{user?.name || "Kamani Rathnayake"}</Text>
        <Text style={[profileStyles.role, { color: p.colorDark }]}>PHM · Monaragala Division</Text>
      </Card>

      <Card style={profileStyles.detailsCard}>
        {details.map((detail, index) => (
          <React.Fragment key={detail.label}>
            {index > 0 && <View style={profileStyles.separator} />}
            <Row
              icon={detail.icon}
              title={detail.label}
              sub={detail.value}
              iconTone={p.colorDark}
            />
          </React.Fragment>
        ))}
      </Card>
    </Shell>
  );
}

const profileStyles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: 22 },
  avatar: { width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 32 },
  name: { marginTop: 10, color: C.ink, fontSize: 18, fontWeight: "800" },
  role: { marginTop: 4, fontSize: 11, fontWeight: "700" },
  detailsCard: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
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
  const { navigate, refreshPending } = useApp();
  const p = usePalette();
  const mothers = useMothers();
  const [f, setF] = useState<EntryForm>(createEntryForm);
  const [kind, setKind] = useState<EntryKind>("anc");
  const [risk, setRisk] = useState<string[]>([]);
  const [motherPickerOpen, setMotherPickerOpen] = useState(false);
  const [riskOptionsOpen, setRiskOptionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ kind: EntryKind; motherName: string } | null>(null);
  const FLAGS = ["High BP", "Bleeding", "Swelling", "Low Hb", "Reduced movements"];
  const selectedMother = mothers.find((mother) => mother.id === f.motherId);

  useEffect(() => {
    if (!selectedMother && mothers.length) {
      setF((current) => ({ ...current, motherId: mothers[0].id }));
    }
  }, [f.motherId, mothers, selectedMother]);

  const update = (key: keyof EntryForm, value: string) => {
    setF((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!selectedMother) {
      Alert.alert("Mother required", "Select a mother before saving this record.");
      return;
    }
    if (kind === "vaccination" && !f.vaccine.trim()) {
      Alert.alert("Vaccine required", "Enter a vaccine name before saving.");
      return;
    }
    if (kind === "growth" && ![f.weight, f.height, f.headCircumference, f.muac].some((value) => value.trim())) {
      Alert.alert("Growth measurement required", "Enter at least one growth measurement before saving.");
      return;
    }

    const shared = {
      recordCategory: kind,
      motherId: selectedMother.id,
      motherName: selectedMother.name,
      notes: f.notes,
      risk,
    };
    const record: Record<string, unknown> = kind === "anc"
      ? {
          ...shared,
          type: "home-visit",
          visitType: "anc",
          gestationWeeks: f.gestationWeeks,
          weight: f.weight,
          bp: f.bp,
          hb: f.hb,
          fetalPosition: f.fetalPosition,
        }
      : kind === "vaccination"
        ? {
            ...shared,
            type: "immunization",
            vaccine: f.vaccine.trim(),
            batch: f.lotNumber,
            expiryDate: f.expiryDate,
            vaccineNotes: f.vaccineNotes,
          }
        : {
            ...shared,
            type: "growth",
            childAgeMonths: f.childAgeMonths,
            weight: f.weight,
            height: f.height,
            headCircumference: f.headCircumference,
            muac: f.muac,
          };

    setSaving(true);
    try {
      await queueRecord(record);
      refreshPending();
      setSaved({ kind, motherName: selectedMother.name });
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "The record could not be saved on this device.");
    } finally {
      setSaving(false);
    }
  };

  const newEntry = () => {
    setF(createEntryForm());
    setRisk([]);
    setRiskOptionsOpen(false);
    setMotherPickerOpen(false);
    setKind("anc");
    setSaved(null);
    navigate("phm-entry");
  };

  return (
    <Shell title="Record Visit" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-home" mobileWebFrame={!!saved} fillContent={!!saved}>
      {saved ? (
        <View style={entryStyles.success}>
          <View style={entryStyles.successIcon}>
            <Ionicons name="checkmark" size={34} color={p.colorDark} />
          </View>
          <Text style={entryStyles.successTitle}>Saved Successfully</Text>
          <Text style={entryStyles.successSubtitle}>{saved.motherName} · {ENTRY_TABS.find((tab) => tab.id === saved.kind)?.label}</Text>
          <Text style={entryStyles.successNote}>
            {saved.kind === "anc"
              ? "Saved on this device and ready to sync."
              : `${saved.kind === "vaccination" ? "Vaccination" : "Growth"} record saved locally. Sync requires backend support for this record type.`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={newEntry}
            style={({ pressed }) => [entryStyles.saveButton, { backgroundColor: p.color, marginTop: 20 }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={entryStyles.saveText}>New Entry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={entryStyles.tabs} accessibilityRole="tablist">
            {ENTRY_TABS.map((tab) => {
              const selected = kind === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setKind(tab.id)}
                  style={[entryStyles.tab, selected && { backgroundColor: "#fff" }]}
                >
                  <Text style={[entryStyles.tabText, selected && { color: p.colorDark, fontWeight: "800" }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

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

          {kind === "anc" && (
            <>
              <EntryField label="GESTATION (WEEKS)" value={f.gestationWeeks} onChangeText={(value) => update("gestationWeeks", value)} placeholder="e.g. 28" unit="wks" keyboardType="number-pad" />
              <EntryField label="WEIGHT (KG)" value={f.weight} onChangeText={(value) => update("weight", value)} placeholder="e.g. 62.5" unit="kg" keyboardType="decimal-pad" />
              <EntryField label="BLOOD PRESSURE" value={f.bp} onChangeText={(value) => update("bp", value)} placeholder="e.g. 120/80" unit="mmHg" />
              <EntryField label="HB LEVEL (G/DL)" value={f.hb} onChangeText={(value) => update("hb", value)} placeholder="e.g. 11.5" unit="g/dL" keyboardType="decimal-pad" />
              <EntryField label="FETAL POSITION" value={f.fetalPosition} onChangeText={(value) => update("fetalPosition", value)} placeholder="e.g. Cephalic" />
            </>
          )}
          {kind === "vaccination" && (
            <>
              <EntryField label="VACCINE NAME" value={f.vaccine} onChangeText={(value) => update("vaccine", value)} placeholder="e.g. TT2" />
              <EntryField label="LOT NUMBER" value={f.lotNumber} onChangeText={(value) => update("lotNumber", value)} placeholder="e.g. LOT2024-A" />
              <EntryField label="EXPIRY DATE" value={f.expiryDate} onChangeText={(value) => update("expiryDate", value)} placeholder="YYYY-MM-DD" />
              <EntryField label="NOTES" value={f.vaccineNotes} onChangeText={(value) => update("vaccineNotes", value)} placeholder="Reactions, notes..." />
            </>
          )}
          {kind === "growth" && (
            <>
              <EntryField label="CHILD AGE (MONTHS)" value={f.childAgeMonths} onChangeText={(value) => update("childAgeMonths", value)} placeholder="e.g. 6" unit="mths" keyboardType="number-pad" />
              <EntryField label="WEIGHT (KG)" value={f.weight} onChangeText={(value) => update("weight", value)} placeholder="e.g. 7.5" unit="kg" keyboardType="decimal-pad" />
              <EntryField label="HEIGHT (CM)" value={f.height} onChangeText={(value) => update("height", value)} placeholder="e.g. 67" unit="cm" keyboardType="decimal-pad" />
              <EntryField label="HEAD CIRCUMFERENCE (CM)" value={f.headCircumference} onChangeText={(value) => update("headCircumference", value)} placeholder="e.g. 43" unit="cm" keyboardType="decimal-pad" />
              <EntryField label="MUAC (CM)" value={f.muac} onChangeText={(value) => update("muac", value)} placeholder="e.g. 14.5" unit="cm" keyboardType="decimal-pad" />
            </>
          )}

          {kind !== "vaccination" && (
            <View style={entryStyles.fieldWrap}>
              <Text style={entryStyles.label}>CLINICAL NOTES</Text>
              <TextInput
                accessibilityLabel="Clinical notes"
                value={f.notes}
                onChangeText={(value) => update("notes", value)}
                placeholder="Any clinical issues, referrals..."
                placeholderTextColor="#A0B0AC"
                multiline
                textAlignVertical="top"
                style={[entryStyles.input, entryStyles.notesInput]}
              />
            </View>
          )}
          {kind === "vaccination" && (
            <View style={entryStyles.fieldWrap}>
              <Text style={entryStyles.label}>CLINICAL NOTES</Text>
              <TextInput
                accessibilityLabel="Clinical notes"
                value={f.notes}
                onChangeText={(value) => update("notes", value)}
                placeholder="Any clinical issues, referrals..."
                placeholderTextColor="#A0B0AC"
                multiline
                textAlignVertical="top"
                style={[entryStyles.input, entryStyles.notesInput]}
              />
            </View>
          )}

          {kind === "anc" && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: riskOptionsOpen }}
                onPress={() => setRiskOptionsOpen((open) => !open)}
                style={entryStyles.riskToggle}
              >
                <View style={entryStyles.riskToggleLabel}>
                  <Ionicons name="alert-circle-outline" size={15} color={risk.length ? C.danger : "#81918C"} />
                  <Text style={entryStyles.riskToggleText}>{risk.length ? `Danger signs · ${risk.length} selected` : "Add danger signs (optional)"}</Text>
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
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={save}
            style={({ pressed }) => [entryStyles.saveButton, { backgroundColor: p.color }, (pressed || saving) && { opacity: 0.75 }]}
          >
            {saving ? <Ionicons name="hourglass-outline" size={16} color="#fff" /> : <Ionicons name="save-outline" size={16} color="#fff" />}
            <Text style={entryStyles.saveText}>{saving ? "Saving..." : "Save Record"}</Text>
          </Pressable>
        </>
      )}
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
  tabs: { minHeight: 34, flexDirection: "row", padding: 3, marginBottom: 11, borderRadius: 999, backgroundColor: "#E5E9EB" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 999 },
  tabText: { color: "#718087", fontSize: 9, fontWeight: "600" },
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
  success: { flexGrow: 1, alignItems: "center", paddingHorizontal: 18, paddingTop: 2 },
  successIcon: { width: 58, height: 58, alignItems: "center", justifyContent: "center", marginBottom: 12, borderRadius: 13, backgroundColor: "#D1FAE5" },
  successTitle: { color: "#173B35", fontSize: 14, fontWeight: "800", textAlign: "center" },
  successSubtitle: { marginTop: 5, color: "#71827D", fontSize: 9, textAlign: "center" },
  successNote: { maxWidth: 230, marginTop: 6, color: "#81918C", fontSize: 9, lineHeight: 13, textAlign: "center" },
});

export function PHMSync() {
  const { isOnline, refreshPending } = useApp();
  const [items, setItems] = useState<PendingRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState("—");
  const load = () => getPending().then((pendingItems) => {
    setItems(pendingItems);
    refreshPending();
  }).catch((error) => {
    Alert.alert("Unable to load sync queue", error instanceof Error ? error.message : "The local queue could not be read.");
  });
  useEffect(() => { void load(); }, [refreshPending]);
  const unsupported = items.filter((item) => !isSyncSupported(item));
  const syncable = items.length - unsupported.length;
  const today = new Date().toDateString();
  const savedToday = items.filter((item) => item.createdAt && new Date(item.createdAt).toDateString() === today).length;

  const sync = async () => {
    if (!isOnline) {
      Alert.alert("You are offline", "Reconnect before syncing records.");
      return;
    }
    if (unsupported.length) {
      Alert.alert(
        "Some records need backend support",
        "Vaccination and Growth entries are safely saved on this device, but the current PHM sync endpoint cannot accept them. They will remain queued.",
      );
      return;
    }
    if (!syncable) return;

    setBusy(true);
    try {
      const count = await flushPending();
      setLastSync("Just now");
      Alert.alert("Sync request completed", `${count} queued records were submitted.`);
      await load();
      refreshPending();
    } catch (error) {
      Alert.alert("Sync failed", error instanceof Error ? error.message : "The records could not be synced.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Sync Status" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-entry">
      <View style={[syncStyles.connection, { backgroundColor: isOnline ? "#E8FBF2" : "#FFF5E6" }]}>
        <View style={[syncStyles.connectionIcon, { backgroundColor: isOnline ? "#D1FAE5" : "#FEF3C7" }]}>
          <Ionicons name={isOnline ? "checkmark" : "cloud-offline-outline"} size={17} color={isOnline ? "#047857" : "#A35B00"} />
        </View>
        <View style={syncStyles.connectionCopy}>
          <Text style={syncStyles.connectionTitle}>{isOnline ? "Connected" : "Offline"}</Text>
          <Text style={syncStyles.connectionSub}>
            {items.length ? `${items.length} ${items.length === 1 ? "record" : "records"} pending upload` : "No records waiting to upload"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !isOnline || !syncable || unsupported.length > 0 }}
          disabled={busy || !isOnline || !syncable || unsupported.length > 0}
          onPress={sync}
          style={({ pressed }) => [
            syncStyles.syncButton,
            { backgroundColor: isOnline && syncable && !unsupported.length ? "#059669" : "#A9B9B3" },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={syncStyles.syncButtonText}>{busy ? "Syncing..." : "Sync Now"}</Text>
        </Pressable>
      </View>

      {unsupported.length > 0 && (
        <View style={syncStyles.warning}>
          <Ionicons name="information-circle-outline" size={16} color="#946200" />
          <Text style={syncStyles.warningText}>
            {unsupported.length} {unsupported.length === 1 ? "Vaccination/Growth record is" : "Vaccination/Growth records are"} held safely on this device. The current PHM endpoint does not support syncing these record types.
          </Text>
        </View>
      )}

      <View style={syncStyles.metrics}>
        <SyncMetric value={items.length} label="Pending" tone="#D97706" />
        <SyncMetric value={syncable} label="Ready to sync" tone="#059669" />
        <SyncMetric value={lastSync} label="Last sync" tone="#7666E8" />
      </View>

      <View style={syncStyles.listHeading}>
        <Text style={syncStyles.listTitle}>PENDING UPLOAD</Text>
        <Text style={syncStyles.listCount}>{items.length}</Text>
      </View>
      {items.length ? items.map((item, index) => {
        const category = item.recordCategory ?? (item.type === "immunization" ? "vaccination" : item.type === "growth" ? "growth" : "anc");
        const kindLabel = category === "vaccination" ? "Vaccination" : category === "growth" ? "Growth Entry" : "ANC Visit";
        const title = item.motherName || item.motherId || "Visit record";
        const subtitle = [kindLabel, item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""].filter(Boolean).join(" · ");
        const supported = isSyncSupported(item);
        return (
          <View key={item.localId ?? `${title}-${index}`} style={syncStyles.pendingRow}>
            <View style={syncStyles.fileIcon}>
              <Ionicons name="document-text" size={15} color="#C28A19" />
            </View>
            <View style={syncStyles.pendingCopy}>
              <Text numberOfLines={1} style={syncStyles.pendingName}>{title}</Text>
              <Text numberOfLines={1} style={syncStyles.pendingSub}>{subtitle}</Text>
            </View>
            <View style={[syncStyles.pendingBadge, { backgroundColor: supported ? "#E6F7EF" : "#FFF4D6" }]}>
              <Text style={[syncStyles.pendingBadgeText, { color: supported ? "#16805D" : "#946200" }]}>
                {supported ? "Ready" : "Local only"}
              </Text>
            </View>
          </View>
        );
      }) : (
        <View style={syncStyles.empty}>
          <View style={syncStyles.emptyIcon}><Ionicons name="cloud-done-outline" size={22} color="#059669" /></View>
          <Text style={syncStyles.emptyTitle}>Everything is up to date</Text>
          <Text style={syncStyles.emptySub}>{savedToday ? `${savedToday} record${savedToday === 1 ? "" : "s"} saved today` : "New records will appear here until synced."}</Text>
        </View>
      )}
    </Shell>
  );
}

function SyncMetric({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <View style={syncStyles.metric}>
      <Text style={[syncStyles.metricValue, { color: tone }]}>{value}</Text>
      <Text numberOfLines={1} style={syncStyles.metricLabel}>{label}</Text>
    </View>
  );
}

const syncStyles = StyleSheet.create({
  connection: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: "#DCEFE6" },
  connectionIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  connectionCopy: { flex: 1, minWidth: 0 },
  connectionTitle: { color: "#173B35", fontSize: 11, fontWeight: "800" },
  connectionSub: { marginTop: 2, color: "#82918C", fontSize: 8 },
  syncButton: { minHeight: 29, minWidth: 58, alignItems: "center", justifyContent: "center", paddingHorizontal: 9, borderRadius: 9 },
  syncButtonText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  warning: { flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 9, marginBottom: 10, borderRadius: 10, backgroundColor: "#FFF8E7" },
  warningText: { flex: 1, color: "#795B19", fontSize: 9, lineHeight: 13 },
  metrics: { flexDirection: "row", gap: 8, marginBottom: 16 },
  metric: { flex: 1, minWidth: 0, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#fff", shadowColor: "#183B32", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  metricValue: { fontSize: 14, fontWeight: "800" },
  metricLabel: { marginTop: 3, color: "#8A9994", fontSize: 8 },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  listTitle: { color: "#71827D", fontSize: 9, fontWeight: "800", letterSpacing: 0.45 },
  listCount: { color: "#81918C", fontSize: 9, fontWeight: "700" },
  pendingRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 6, borderRadius: 10, borderWidth: 1, borderColor: "#EDF1EF", backgroundColor: "#fff" },
  fileIcon: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#FFF4D6" },
  pendingCopy: { flex: 1, minWidth: 0 },
  pendingName: { color: "#244139", fontSize: 9, fontWeight: "700" },
  pendingSub: { marginTop: 2, color: "#91A09B", fontSize: 8 },
  pendingBadge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 999 },
  pendingBadgeText: { fontSize: 7, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 12 },
  emptyIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", marginBottom: 9, borderRadius: 15, backgroundColor: "#D1FAE5" },
  emptyTitle: { color: "#244139", fontSize: 12, fontWeight: "800" },
  emptySub: { marginTop: 4, color: "#81918C", fontSize: 9, textAlign: "center" },
});
