import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Field, usePalette } from "../components/ui";

type Mother = {
  _id: string;
  code: string;
  id?: string;
  name: string;
  nic?: string;
  phone?: string;
  dob?: string;
  village?: string;
  phmArea?: string;
  lmp?: string;
  edd?: string;
  gravida?: number;
  risk?: "low" | "medium" | "high";
  bloodGroup?: string;
  status?: "pregnant" | "postnatal" | "closed";
  weeks?: number | null;
};

type Child = {
  _id: string;
  code: string;
  name: string;
  dob: string;
  sex?: "male" | "female";
  birthWeight?: number;
};

type MotherForm = Record<string, string>;
type BabyForm = Record<string, string>;
type FormMode = "view" | "new-mother" | "edit-mother" | "new-baby" | "edit-baby";
type DeleteTarget = { kind: "mother"; mother: Mother } | { kind: "baby"; child: Child } | null;

const motherFields: { key: keyof MotherForm; label: string; placeholder?: string; keyboardType?: "default" | "numeric" | "phone-pad" }[] = [
  { key: "name", label: "FULL NAME", placeholder: "Mother's full name" },
  { key: "nic", label: "NATIONAL ID", placeholder: "NIC (optional)" },
  { key: "phone", label: "CONTACT NUMBER", placeholder: "Phone number", keyboardType: "phone-pad" },
  { key: "dob", label: "DATE OF BIRTH", placeholder: "YYYY-MM-DD" },
  { key: "village", label: "VILLAGE / ADDRESS", placeholder: "Village" },
  { key: "phmArea", label: "PHM ZONE", placeholder: "PHM area" },
  { key: "bloodGroup", label: "BLOOD GROUP", placeholder: "e.g. O+" },
  { key: "gravida", label: "GRAVIDITY", placeholder: "e.g. 2", keyboardType: "numeric" },
  { key: "lmp", label: "LAST MENSTRUAL PERIOD", placeholder: "YYYY-MM-DD" },
  { key: "edd", label: "EXPECTED DELIVERY DATE", placeholder: "YYYY-MM-DD" },
];

const emptyMotherForm = (): MotherForm => ({
  name: "", nic: "", phone: "", dob: "", village: "", phmArea: "",
  bloodGroup: "", gravida: "", lmp: "", edd: "", risk: "low", status: "pregnant",
});

const motherToForm = (mother: Mother): MotherForm => ({
  name: mother.name ?? "",
  nic: mother.nic ?? "",
  phone: mother.phone ?? "",
  dob: dateInput(mother.dob),
  village: mother.village ?? "",
  phmArea: mother.phmArea ?? "",
  bloodGroup: mother.bloodGroup ?? "",
  gravida: mother.gravida == null ? "" : String(mother.gravida),
  lmp: dateInput(mother.lmp),
  edd: dateInput(mother.edd),
  risk: mother.risk ?? "low",
  status: mother.status ?? "pregnant",
});

const dateInput = (value?: string) => value ? new Date(value).toISOString().slice(0, 10) : "";
const optionalDate = (value: string) => value.trim() || null;
const optionalNumber = (value: string) => value.trim() ? Number(value) : null;
const toMotherPayload = (form: MotherForm) => ({
  name: form.name.trim(),
  nic: form.nic.trim(),
  phone: form.phone.trim(),
  dob: optionalDate(form.dob),
  village: form.village.trim(),
  phmArea: form.phmArea.trim(),
  bloodGroup: form.bloodGroup.trim(),
  gravida: optionalNumber(form.gravida),
  lmp: optionalDate(form.lmp),
  edd: optionalDate(form.edd),
  risk: form.risk,
  status: form.status,
});

function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function ageLabel(value?: string) {
  if (!value) return "";
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) years -= 1;
  return years >= 0 ? `${years} years` : "";
}

export default function PHMMotherManagement() {
  const palette = usePalette();
  const [query, setQuery] = useState("");
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [mothersLoading, setMothersLoading] = useState(false);
  const [mothersError, setMothersError] = useState("");
  const [listRefresh, setListRefresh] = useState(0);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [motherLoading, setMotherLoading] = useState(false);
  const [motherError, setMotherError] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState("");
  const [childrenRefresh, setChildrenRefresh] = useState(0);
  const [mode, setMode] = useState<FormMode>("view");
  const [motherForm, setMotherForm] = useState<MotherForm>(emptyMotherForm);
  const [babyForm, setBabyForm] = useState<BabyForm>({ name: "", dob: "", sex: "", birthWeight: "" });
  const [editingBaby, setEditingBaby] = useState<Child | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setMothersLoading(true);
    setMothersError("");
    api<(Omit<Mother, "code"> & { code?: string; id: string })[]>(`/mothers?q=${encodeURIComponent(query.trim())}&excludeClosed=true`)
      .then((items) => {
        if (active) setMothers(items.map((mother) => ({ ...mother, code: mother.code ?? mother.id })));
      })
      .catch((error) => {
        if (active) {
          setMothers([]);
          setMothersError(error instanceof Error ? error.message : "Mother list could not be loaded.");
        }
      })
      .finally(() => { if (active) setMothersLoading(false); });
    return () => { active = false; };
  }, [query, listRefresh]);

  useEffect(() => {
    if (!selectedMother) {
      setMotherLoading(false);
      setMotherError("");
      setChildren([]);
      setChildrenLoading(false);
      setChildrenError("");
      return;
    }
    let active = true;
    setMotherLoading(true);
    setChildrenLoading(true);
    setMotherError("");
    setChildrenError("");
    const motherRequest = api<{ mother: Mother }>(`/mothers/${encodeURIComponent(selectedMother.code)}`)
      .then((details) => { if (active) setSelectedMother(details.mother); })
      .catch((error) => {
        if (active) setMotherError(error instanceof Error ? error.message : "Mother information could not be loaded.");
      });
    const childRequest = api<Child[]>(`/children?mother=${encodeURIComponent(selectedMother.code)}`)
      .then((babyList) => { if (active) setChildren(babyList); })
      .catch((error) => {
        if (active) {
          setChildren([]);
          setChildrenError(error instanceof Error ? error.message : "Baby list could not be loaded.");
        }
      });
    Promise.all([motherRequest, childRequest])
      .finally(() => {
        if (active) {
          setMotherLoading(false);
          setChildrenLoading(false);
        }
      });
    return () => { active = false; };
  }, [selectedMother?._id, selectedMother?.code, listRefresh, childrenRefresh]);

  const openMother = (mother: Mother) => {
    setSelectedMother(mother);
    setMode("view");
    setNotice("");
  };

  const resetToList = () => {
    setSelectedMother(null);
    setMode("view");
    setEditingBaby(null);
    setNotice("");
    setListRefresh((value) => value + 1);
  };

  const updateMotherField = (key: string, value: string) =>
    setMotherForm((current) => ({ ...current, [key]: value }));

  const saveMother = async () => {
    if (!motherForm.name.trim()) {
      setNotice("Enter the mother's full name.");
      return;
    }
    if (motherForm.gravida.trim() && (!Number.isFinite(Number(motherForm.gravida)) || Number(motherForm.gravida) < 0)) {
      setNotice("Enter a valid gravidity.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const payload = toMotherPayload(motherForm);
      const saved = mode === "new-mother"
        ? await api<Mother>("/mothers", { method: "POST", body: payload })
        : await api<Mother>(`/mothers/${encodeURIComponent(selectedMother!.code)}`, { method: "PATCH", body: payload });
      setSelectedMother(saved);
      setMode("view");
      setListRefresh((value) => value + 1);
      setNotice(mode === "new-mother" ? "Mother added successfully." : "Mother details saved.");
    } catch (error) {
      setNotice(error instanceof Error ? `Mother could not be saved: ${error.message}` : "Mother could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const saveBaby = async () => {
    if (!selectedMother) return;
    if (!babyForm.name.trim()) {
      setNotice("Enter the baby's name.");
      return;
    }
    if (!babyForm.dob.trim() || Number.isNaN(new Date(babyForm.dob).getTime())) {
      setNotice("Enter a valid date of birth (YYYY-MM-DD).");
      return;
    }
    if (babyForm.birthWeight.trim() && (!Number.isFinite(Number(babyForm.birthWeight)) || Number(babyForm.birthWeight) < 0)) {
      setNotice("Enter a valid birth weight.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const payload = {
        name: babyForm.name.trim(),
        dob: babyForm.dob,
        sex: babyForm.sex || null,
        birthWeight: babyForm.birthWeight.trim() ? Number(babyForm.birthWeight) : undefined,
      };
      if (mode === "new-baby") {
        await api<Child>("/children", {
          method: "POST",
          body: { ...payload, motherCode: selectedMother.code },
        });
      } else if (editingBaby) {
        await api<Child>(`/children/${encodeURIComponent(editingBaby.code)}`, {
          method: "PATCH",
          body: payload,
        });
      }
      setMode("view");
      setEditingBaby(null);
      setChildrenRefresh((value) => value + 1);
      setNotice(mode === "new-baby" ? "Baby added successfully." : "Baby details saved.");
      setListRefresh((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? `Baby could not be saved: ${error.message}` : "Baby could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const startEditBaby = (child: Child) => {
    setEditingBaby(child);
    setBabyForm({
      name: child.name ?? "",
      dob: dateInput(child.dob),
      sex: child.sex ?? "",
      birthWeight: child.birthWeight == null ? "" : String(child.birthWeight),
    });
    setMode("edit-baby");
    setNotice("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === "mother") {
        await api(`/mothers/${encodeURIComponent(deleteTarget.mother.code)}`, { method: "DELETE" });
        setDeleteTarget(null);
        setSelectedMother(null);
        setMode("view");
        setListRefresh((value) => value + 1);
        setNotice("Mother deactivated successfully.");
      } else {
        await api(`/children/${encodeURIComponent(deleteTarget.child.code)}`, { method: "DELETE" });
        setDeleteTarget(null);
        setChildrenRefresh((value) => value + 1);
        setNotice("Baby deactivated successfully.");
      }
    } catch (error) {
      setDeleteTarget(null);
      setNotice(error instanceof Error ? `Delete failed: ${error.message}` : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const motherFormView = mode === "new-mother" || mode === "edit-mother";
  const babyFormView = mode === "new-baby" || mode === "edit-baby";

  return (
    <Shell title="Mother Management" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-home">
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

      {!selectedMother && !motherFormView && (
        <>
          <View style={styles.searchHeader}>
            <Text style={styles.heading}>Mothers</Text>
            <Button title="Add Mother" icon="add" onPress={() => {
              setMotherForm(emptyMotherForm());
              setMode("new-mother");
              setNotice("");
            }} style={styles.addButton} />
          </View>
          <Field
            icon="search"
            placeholder="Search by mother name or ID"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search mothers by name or ID"
          />
          <Card label="MOTHER LIST">
            {mothersLoading ? <Text style={styles.empty}>Loading mothers...</Text> : null}
            {!mothersLoading && mothersError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>Mother list unavailable: {mothersError}</Text>
                <Button title="Retry" icon="refresh" variant="ghost" onPress={() => setListRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!mothersLoading && !mothersError && mothers.length === 0 ? (
              <Text style={styles.empty}>{query.trim() ? "No mothers match your search." : "No active mothers found."}</Text>
            ) : null}
            {!mothersLoading && !mothersError ? mothers.map((mother) => (
              <Pressable
                key={mother._id}
                accessibilityRole="button"
                accessibilityLabel={`Open mother profile for ${mother.name}`}
                onPress={() => openMother(mother)}
                style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
              >
                <View style={[styles.avatar, { backgroundColor: palette.colorLight }]}>
                  <Ionicons name="woman-outline" size={18} color={palette.colorDark} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.name}>{mother.name}</Text>
                  <Text style={styles.sub}>{mother.code}{mother.village ? ` · ${mother.village}` : ""}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={C.sub} />
              </Pressable>
            )) : null}
          </Card>
        </>
      )}

      {motherFormView && (
        <Card label={mode === "new-mother" ? "ADD MOTHER" : "EDIT MOTHER"}>
          {mode === "edit-mother" && selectedMother ? (
            <Text style={styles.formHint}>Mother ID: {selectedMother.code}</Text>
          ) : null}
          {motherFields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              value={motherForm[field.key] ?? ""}
              onChangeText={(value) => updateMotherField(field.key, value)}
              placeholder={field.placeholder}
              keyboardType={field.keyboardType}
              accessibilityLabel={field.label}
            />
          ))}
          <Text style={styles.groupLabel}>RISK LEVEL</Text>
          <View style={styles.choiceRow}>
            {(["low", "medium", "high"] as const).map((risk) => (
              <Pressable key={risk} accessibilityRole="button" accessibilityState={{ selected: motherForm.risk === risk }} onPress={() => updateMotherField("risk", risk)} style={[styles.choice, motherForm.risk === risk && { backgroundColor: palette.color, borderColor: palette.color }]}>
                <Text style={[styles.choiceText, motherForm.risk === risk && styles.choiceTextSelected]}>{risk.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.groupLabel}>STATUS</Text>
          <View style={styles.choiceRow}>
            {(["pregnant", "postnatal"] as const).map((status) => (
              <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: motherForm.status === status }} onPress={() => updateMotherField("status", status)} style={[styles.choice, motherForm.status === status && { backgroundColor: palette.color, borderColor: palette.color }]}>
                <Text style={[styles.choiceText, motherForm.status === status && styles.choiceTextSelected]}>{status.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Button title={busy ? "Saving..." : mode === "new-mother" ? "Save Mother" : "Save Changes"} icon="save-outline" onPress={saveMother} style={styles.actionButton} />
            <Button title="Cancel" variant="ghost" onPress={() => { setMode("view"); if (!selectedMother) setMotherForm(emptyMotherForm()); setNotice(""); }} style={styles.actionButton} />
          </View>
        </Card>
      )}

      {selectedMother && !motherFormView && (
        <>
          <View style={styles.profileHeader}>
            <Pressable accessibilityRole="button" onPress={resetToList} style={styles.backLink}>
              <Ionicons name="arrow-back" size={16} color={palette.colorDark} />
              <Text style={[styles.backText, { color: palette.colorDark }]}>Mother list</Text>
            </Pressable>
          </View>
          <Card label="MOTHER DETAILS">
            {motherLoading ? <Text style={styles.empty}>Loading mother profile...</Text> : null}
            {motherError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{motherError}</Text>
                <Button title="Retry loading profile" icon="refresh" variant="ghost" onPress={() => setListRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!motherLoading && !motherError ? (
              <>
                <View style={styles.profileTitle}>
                  <View style={[styles.avatarLarge, { backgroundColor: palette.colorLight }]}>
                    <Ionicons name="woman-outline" size={22} color={palette.colorDark} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.name}>{selectedMother.name}</Text>
                    <Text style={styles.sub}>Mother ID · {selectedMother.code}</Text>
                  </View>
                  {selectedMother.risk ? <Text style={styles.riskTag}>{selectedMother.risk.toUpperCase()} RISK</Text> : null}
                </View>
                <View style={styles.detailGrid}>
                  {[
                    ["Age / Date of birth", [ageLabel(selectedMother.dob), dateLabel(selectedMother.dob)].filter(Boolean).join(" · ")],
                    ["Contact number", selectedMother.phone],
                    ["Village / Address", selectedMother.village],
                    ["Blood group", selectedMother.bloodGroup],
                    ["Gravidity", selectedMother.gravida == null ? "" : String(selectedMother.gravida)],
                    ["LMP", dateLabel(selectedMother.lmp)],
                    ["Expected delivery", dateLabel(selectedMother.edd)],
                    ["PHM zone", selectedMother.phmArea],
                    ["Status", selectedMother.status],
                  ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                    <View key={label} style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailValue}>{value}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.actions}>
                  <Button title="Edit Mother" icon="create-outline" variant="ghost" onPress={() => { setMotherForm(motherToForm(selectedMother)); setMode("edit-mother"); setNotice(""); }} style={styles.actionButton} />
                  <Button title="Delete Mother" icon="trash-outline" variant="ghost" onPress={() => setDeleteTarget({ kind: "mother", mother: selectedMother })} style={{ ...styles.actionButton, ...styles.dangerButton }} />
                </View>
              </>
            ) : null}
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={styles.heading}>Babies</Text>
            <Button title="Add Baby" icon="add" onPress={() => { setBabyForm({ name: "", dob: "", sex: "", birthWeight: "" }); setEditingBaby(null); setMode("new-baby"); setNotice(""); }} style={styles.addButton} />
          </View>
          <Card label="BABY DETAILS">
            {childrenLoading ? <Text style={styles.empty}>Loading babies...</Text> : null}
            {!childrenLoading && childrenError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{childrenError}</Text>
                <Button title="Retry loading babies" icon="refresh" variant="ghost" onPress={() => setChildrenRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!childrenLoading && !childrenError && children.length === 0 ? <Text style={styles.empty}>No babies are recorded for this mother.</Text> : null}
            {!childrenLoading && !childrenError ? children.map((child) => (
              <View key={child._id} style={styles.babyRow}>
                <View style={[styles.avatar, { backgroundColor: palette.colorLight }]}>
                  <Ionicons name="happy-outline" size={18} color={palette.colorDark} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.name}>{child.name}</Text>
                  <Text style={styles.sub}>{child.code} · {dateLabel(child.dob)}{child.sex ? ` · ${child.sex}` : ""}{child.birthWeight != null ? ` · ${child.birthWeight} kg` : ""}</Text>
                </View>
                <View style={styles.babyActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${child.name}`} onPress={() => startEditBaby(child)} style={styles.iconAction}>
                    <Ionicons name="create-outline" size={18} color={palette.colorDark} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${child.name}`} onPress={() => setDeleteTarget({ kind: "baby", child })} style={styles.iconAction}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </Pressable>
                </View>
              </View>
            )) : null}
          </Card>
        </>
      )}

      {babyFormView && selectedMother ? (
        <Card label={mode === "new-baby" ? "ADD BABY" : "EDIT BABY"}>
          {mode === "edit-baby" && editingBaby ? <Text style={styles.formHint}>Baby ID: {editingBaby.code}</Text> : null}
          <Text style={styles.formHint}>Mother: {selectedMother.name} · {selectedMother.code}</Text>
          <Field label="BABY NAME" value={babyForm.name} onChangeText={(name) => setBabyForm((current) => ({ ...current, name }))} placeholder="Baby's name" accessibilityLabel="Baby name" />
          <Field label="DATE OF BIRTH" value={babyForm.dob} onChangeText={(dob) => setBabyForm((current) => ({ ...current, dob }))} placeholder="YYYY-MM-DD" accessibilityLabel="Baby date of birth" />
          <Text style={styles.groupLabel}>GENDER</Text>
          <View style={styles.choiceRow}>
            {([{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "", label: "Not specified" }] as const).map((option) => (
              <Pressable key={option.value || "unspecified"} accessibilityRole="button" accessibilityState={{ selected: babyForm.sex === option.value }} onPress={() => setBabyForm((current) => ({ ...current, sex: option.value }))} style={[styles.choice, babyForm.sex === option.value && { backgroundColor: palette.color, borderColor: palette.color }]}>
                <Text style={[styles.choiceText, babyForm.sex === option.value && styles.choiceTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="BIRTH WEIGHT (KG)" value={babyForm.birthWeight} onChangeText={(birthWeight) => setBabyForm((current) => ({ ...current, birthWeight }))} placeholder="e.g. 3.2" keyboardType="decimal-pad" accessibilityLabel="Baby birth weight" />
          <View style={styles.actions}>
            <Button title={busy ? "Saving..." : mode === "new-baby" ? "Save Baby" : "Save Changes"} icon="save-outline" onPress={saveBaby} style={styles.actionButton} />
            <Button title="Cancel" variant="ghost" onPress={() => { setMode("view"); setEditingBaby(null); setNotice(""); }} style={styles.actionButton} />
          </View>
        </Card>
      ) : null}

      <Modal transparent visible={!!deleteTarget} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{deleteTarget?.kind === "mother" ? "Delete Mother" : "Delete Baby"}</Text>
            <Text style={styles.confirmMessage}>
              {deleteTarget?.kind === "mother"
                ? "Are you sure you want to delete this mother? Her linked records will be retained and the mother will be deactivated."
                : "Are you sure you want to delete this baby record? Its linked health records will be retained."}
            </Text>
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setDeleteTarget(null)} style={styles.actionButton} />
              <Button title={busy ? "Deleting..." : "Delete"} icon="trash-outline" onPress={confirmDelete} style={{ ...styles.actionButton, ...styles.deleteButton }} />
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

const styles = StyleSheet.create({
  searchHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4, marginBottom: 8 },
  heading: { color: C.ink, fontSize: 16, fontWeight: "800" },
  addButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10 },
  listRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  avatar: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  avatarLarge: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  rowCopy: { flex: 1, minWidth: 0 },
  name: { color: C.ink, fontSize: 12, fontWeight: "700" },
  sub: { marginTop: 3, color: C.sub, fontSize: 10 },
  profileHeader: { marginBottom: 8 },
  backLink: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  backText: { fontSize: 11, fontWeight: "700" },
  profileTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  riskTag: { overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "#FEF3C7", color: "#92400E", fontSize: 8, fontWeight: "800" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 2 },
  detailItem: { width: "47%", minWidth: 120, flexGrow: 1, paddingVertical: 5 },
  detailLabel: { color: C.sub, fontSize: 9, fontWeight: "600" },
  detailValue: { marginTop: 3, color: C.ink, fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 40, paddingHorizontal: 7, borderRadius: 10 },
  dangerButton: { borderColor: "#FECACA" },
  babyRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  babyActions: { flexDirection: "row", gap: 3 },
  iconAction: { width: 34, height: 36, alignItems: "center", justifyContent: "center" },
  formHint: { marginBottom: 10, color: C.sub, fontSize: 10 },
  groupLabel: { marginBottom: 7, color: C.sub, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  choice: { minHeight: 32, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: C.line, borderRadius: 9, backgroundColor: "#fff" },
  choiceText: { color: C.sub, fontSize: 9, fontWeight: "700" },
  choiceTextSelected: { color: "#fff" },
  empty: { paddingVertical: 14, color: C.sub, fontSize: 10, textAlign: "center" },
  error: { paddingVertical: 10, color: C.danger, fontSize: 10, textAlign: "center" },
  notice: { marginBottom: 10, padding: 10, borderRadius: 10, backgroundColor: "#E7F6EF", color: "#087F5B", fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(7, 20, 18, 0.42)" },
  confirmCard: { width: "100%", maxWidth: 340, padding: 18, borderRadius: 16, backgroundColor: "#fff" },
  confirmTitle: { color: C.ink, fontSize: 15, fontWeight: "800" },
  confirmMessage: { marginTop: 8, color: C.sub, fontSize: 12, lineHeight: 18 },
  deleteButton: { backgroundColor: C.danger },
});
