import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Field, usePalette } from "../components/ui";

type MotherOption = {
  id: string;
  name: string;
  village?: string;
};

type ChildRecord = {
  _id: string;
  code: string;
  name: string;
  dob: string;
  sex?: "male" | "female";
  birthWeight?: number | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  mother?: string | { _id?: string; code?: string; name?: string; village?: string } | null;
};

type ChildDetailsResponse = {
  child: ChildRecord;
  immunizations: { _id: string }[];
  growth: { _id: string }[];
};

const childDateLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

const childDateInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function PHMChildManagement() {
  const palette = usePalette();
  const [query, setQuery] = useState("");
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedChild, setSelectedChild] = useState<ChildRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsRefresh, setDetailsRefresh] = useState(0);
  const [childDetails, setChildDetails] = useState<ChildDetailsResponse | null>(null);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [motherOptions, setMotherOptions] = useState<MotherOption[]>([]);
  const [motherError, setMotherError] = useState("");
  const [motherRefresh, setMotherRefresh] = useState(0);
  const [selectedMother, setSelectedMother] = useState<MotherOption | null>(null);
  const [motherPickerOpen, setMotherPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"" | "male" | "female">("");
  const [birthWeight, setBirthWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    api<ChildRecord[]>("/children")
      .then((items) => { if (active) setChildren(items); })
      .catch((error) => {
        if (active) {
          setChildren([]);
          setLoadError(error instanceof Error ? error.message : "Children could not be loaded.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!selectedChild) {
      setChildDetails(null);
      setDetailsError("");
      setDetailsLoading(false);
      return;
    }
    let active = true;
    setDetailsLoading(true);
    setDetailsError("");
    api<ChildDetailsResponse>(`/children/${encodeURIComponent(selectedChild.code)}`)
      .then((details) => {
        if (active) {
          setChildDetails(details);
          setSelectedChild(details.child);
        }
      })
      .catch((error) => {
        if (active) {
          setChildDetails(null);
          setDetailsError(error instanceof Error ? error.message : "Child details could not be loaded.");
        }
      })
      .finally(() => { if (active) setDetailsLoading(false); });
    return () => { active = false; };
  }, [selectedChild?._id, selectedChild?.code, detailsRefresh]);

  useEffect(() => {
    let active = true;
    setMotherError("");
    api<(MotherOption & { _id?: string })[]>("/mothers?excludeClosed=true")
      .then((items) => {
        if (active) setMotherOptions(items.map((item) => ({ ...item, id: item.id })));
      })
      .catch((error) => {
        if (active) setMotherError(error instanceof Error ? error.message : "Mother choices could not be loaded.");
      });
    return () => { active = false; };
  }, [motherRefresh]);

  const filteredChildren = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return children;
    return children.filter((child) => {
      const mother = typeof child.mother === "object" && child.mother ? child.mother : null;
      const searchable = [
        child.name,
        child.code,
        mother?.name,
        mother?.code,
        childDateLabel(child.dob),
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(term);
    });
  }, [children, query]);

  const resetForm = () => {
    setName("");
    setDob("");
    setSex("");
    setBirthWeight("");
    setSelectedMother(null);
    setNotice("");
  };

  const openAddForm = () => {
    resetForm();
    setFormMode("add");
    setSelectedChild(null);
    setFormOpen(true);
  };

  const openEditForm = () => {
    if (!selectedChild) return;
    setName(selectedChild.name ?? "");
    setDob(childDateInputValue(selectedChild.dob));
    setSex(selectedChild.sex ?? "");
    setBirthWeight(selectedChild.birthWeight == null ? "" : String(selectedChild.birthWeight));
    setFormMode("edit");
    setNotice("");
    setFormOpen(true);
  };

  const saveChild = async () => {
    if (formMode === "add" && !selectedMother) {
      setNotice("Select the child's mother.");
      return;
    }
    if (!name.trim()) {
      setNotice("Enter the child's name.");
      return;
    }
    if (!dob.trim() || Number.isNaN(new Date(dob).getTime())) {
      setNotice("Enter a valid date of birth (YYYY-MM-DD).");
      return;
    }
    if (birthWeight.trim() && (!Number.isFinite(Number(birthWeight)) || Number(birthWeight) < 0)) {
      setNotice("Enter a valid birth weight.");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      const payload = {
        name: name.trim(),
        dob,
        sex: sex || null,
        birthWeight: birthWeight.trim() ? Number(birthWeight) : null,
      };
      if (formMode === "add") {
        await api<ChildRecord>("/children", {
          method: "POST",
          body: { ...payload, motherCode: selectedMother!.id },
        });
      } else if (selectedChild) {
        await api<ChildRecord>(`/children/${encodeURIComponent(selectedChild.code)}`, {
          method: "PATCH",
          body: payload,
        });
        setSelectedChild((current) => current ? {
          ...current,
          name: payload.name,
          dob: payload.dob,
          sex: sex || undefined,
          birthWeight: birthWeight.trim() ? Number(birthWeight) : undefined,
        } : current);
        setDetailsRefresh((value) => value + 1);
        setRefresh((value) => value + 1);
      }
      setFormOpen(false);
      if (formMode === "add") {
        resetForm();
        setNotice("Child added successfully.");
        setRefresh((value) => value + 1);
      } else {
        setNotice("Child details saved successfully.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? `Child could not be saved: ${error.message}` : "Child could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const deleteChild = async () => {
    if (!selectedChild) return;
    setSaving(true);
    try {
      await api<{ deactivated: boolean; id: string }>(
        `/children/${encodeURIComponent(selectedChild.code)}`,
        { method: "DELETE" },
      );
      setChildren((current) => current.filter((child) => child._id !== selectedChild._id));
      setSelectedChild(null);
      setChildDetails(null);
      setDeleteConfirmOpen(false);
      setFormOpen(false);
      setNotice("Child deleted successfully.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? `Child could not be deleted: ${error.message}` : "Child could not be deleted.");
      setDeleteConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="Child Management" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-home">
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

      {!formOpen && !selectedChild ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.heading}>Children</Text>
            <Button title="Add Child" icon="add" onPress={openAddForm} style={styles.addButton} />
          </View>
          <Field
            icon="search"
            placeholder="Search by child name or ID"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search by child name or ID"
          />
          <Card label="CHILD LIST">
            {loading ? <Text style={styles.empty}>Loading children...</Text> : null}
            {!loading && loadError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>Children unavailable: {loadError}</Text>
                <Button title="Retry" icon="refresh" variant="ghost" onPress={() => setRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!loading && !loadError && filteredChildren.length === 0 ? (
              <Text style={styles.empty}>{query.trim() ? "No children match your search." : "No children found."}</Text>
            ) : null}
            {!loading && !loadError ? filteredChildren.map((child) => {
              const mother = typeof child.mother === "object" && child.mother ? child.mother : null;
              const secondary = [
                child.code,
                mother?.name,
                childDateLabel(child.dob),
                child.sex,
                child.birthWeight == null ? "" : `${child.birthWeight} kg`,
              ].filter(Boolean).join(" · ");
              return (
                <Pressable
                  key={child._id}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${child.name}`}
                  onPress={() => { setSelectedChild(child); setNotice(""); }}
                  style={({ pressed }) => [styles.childRow, pressed && styles.pressed]}
                >
                  <View style={[styles.avatar, { backgroundColor: palette.colorLight }]}>
                    <Ionicons name="happy-outline" size={18} color={palette.colorDark} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={styles.name}>{child.name}</Text>
                    <Text numberOfLines={2} style={styles.sub}>{secondary}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={C.sub} />
                </Pressable>
              );
            }) : null}
          </Card>
        </>
      ) : !formOpen && selectedChild ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to child list"
            onPress={() => { setSelectedChild(null); setChildDetails(null); setDetailsError(""); setNotice(""); }}
            style={styles.backLink}
          >
            <Ionicons name="arrow-back" size={16} color={palette.colorDark} />
            <Text style={[styles.backText, { color: palette.colorDark }]}>Children</Text>
          </Pressable>
          <Card label="CHILD DETAILS">
            {detailsLoading ? <Text style={styles.empty}>Loading child details...</Text> : null}
            {!detailsLoading && detailsError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{detailsError}</Text>
                <Button title="Retry loading details" icon="refresh" variant="ghost" onPress={() => setDetailsRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!detailsLoading && !detailsError ? (
              <>
                <View style={styles.profileTitle}>
                  <View style={[styles.avatarLarge, { backgroundColor: palette.colorLight }]}>
                    <Ionicons name="happy-outline" size={22} color={palette.colorDark} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.name}>{selectedChild.name}</Text>
                    <Text style={styles.sub}>Child ID · {selectedChild.code}</Text>
                  </View>
                </View>
                <View style={styles.detailGrid}>
                  {[
                    ["Mother", typeof childDetails?.child.mother === "object" ? childDetails.child.mother?.name : ""],
                    ["Mother ID", typeof childDetails?.child.mother === "object" ? childDetails.child.mother?.code : ""],
                    ["Date of birth", childDateLabel(selectedChild.dob)],
                    ["Gender", selectedChild.sex ? selectedChild.sex[0].toUpperCase() + selectedChild.sex.slice(1) : ""],
                    ["Birth weight", selectedChild.birthWeight == null ? "" : `${selectedChild.birthWeight} kg`],
                    ["Status", selectedChild.active === false ? "Inactive" : "Active"],
                    ["Created", childDateLabel(selectedChild.createdAt)],
                    ["Last updated", childDateLabel(selectedChild.updatedAt)],
                    ["Immunization records", childDetails?.immunizations.length ? String(childDetails.immunizations.length) : "0"],
                    ["Growth records", childDetails?.growth.length ? String(childDetails.growth.length) : "0"],
                  ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                    <View key={label} style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailValue}>{value}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.actions}>
                  <Button title="Edit" icon="create-outline" variant="ghost" onPress={openEditForm} style={styles.actionButton} />
                  <Button title="Delete" icon="trash-outline" variant="ghost" onPress={() => setDeleteConfirmOpen(true)} style={{ ...styles.actionButton, ...styles.dangerButton }} />
                </View>
              </>
            ) : null}
          </Card>
        </>
      ) : (
        <Card label={formMode === "add" ? "ADD CHILD" : "EDIT CHILD"}>
          {formMode === "edit" && selectedChild ? <Text style={styles.formHint}>Child ID: {selectedChild.code}</Text> : null}
          <Field label="CHILD NAME" value={name} onChangeText={setName} placeholder="Child's full name" accessibilityLabel="Child name" />
          <Field label="DATE OF BIRTH" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" accessibilityLabel="Child date of birth" />
          {formMode === "add" ? (
            <>
              <Text style={styles.groupLabel}>MOTHER</Text>
              {motherError ? (
                <>
                  <Text accessibilityRole="alert" style={styles.error}>Mother choices unavailable: {motherError}</Text>
                  <Button title="Retry mother list" icon="refresh" variant="ghost" onPress={() => setMotherRefresh((value) => value + 1)} />
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose child's mother"
                  onPress={() => setMotherPickerOpen(true)}
                  style={styles.motherSelect}
                >
                  <Text style={[styles.motherSelectText, !selectedMother && styles.placeholder]}>
                    {selectedMother ? `${selectedMother.name} · ${selectedMother.id}` : "Select a mother"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.sub} />
                </Pressable>
              )}
            </>
          ) : null}
          <Text style={styles.groupLabel}>GENDER</Text>
          <View style={styles.choiceRow}>
            {([{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "", label: "Not specified" }] as const).map((option) => (
              <Pressable
                key={option.value || "unspecified"}
                accessibilityRole="button"
                accessibilityState={{ selected: sex === option.value }}
                onPress={() => setSex(option.value)}
                style={[styles.choice, sex === option.value && { backgroundColor: palette.color, borderColor: palette.color }]}
              >
                <Text style={[styles.choiceText, sex === option.value && styles.choiceTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="BIRTH WEIGHT (KG)" value={birthWeight} onChangeText={setBirthWeight} placeholder="e.g. 3.2" keyboardType="decimal-pad" accessibilityLabel="Child birth weight" />
          {notice ? <Text accessibilityRole="alert" style={styles.error}>{notice}</Text> : null}
          <View style={styles.actions}>
            <Button title={saving ? "Saving..." : formMode === "add" ? "Save Child" : "Save Changes"} icon="save-outline" onPress={saveChild} style={styles.actionButton} />
            <Button title="Cancel" variant="ghost" onPress={() => { setFormOpen(false); if (formMode === "add") resetForm(); setNotice(""); }} style={styles.actionButton} />
          </View>
        </Card>
      )}

      <Modal transparent visible={motherPickerOpen} animationType="fade" onRequestClose={() => setMotherPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Mother</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close mother list" onPress={() => setMotherPickerOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={21} color={C.sub} />
              </Pressable>
            </View>
            {motherOptions.length ? motherOptions.map((mother) => (
              <Pressable
                key={mother.id}
                accessibilityRole="button"
                onPress={() => { setSelectedMother(mother); setMotherPickerOpen(false); }}
                style={({ pressed }) => [styles.motherOption, pressed && styles.pressed]}
              >
                <View style={[styles.avatar, { backgroundColor: palette.colorLight }]}>
                  <Ionicons name="woman-outline" size={17} color={palette.colorDark} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.name}>{mother.name}</Text>
                  <Text style={styles.sub}>{mother.id}{mother.village ? ` · ${mother.village}` : ""}</Text>
                </View>
              </Pressable>
            )) : <Text style={styles.empty}>No mothers available.</Text>}
          </View>
        </View>
      </Modal>
      <Modal transparent visible={deleteConfirmOpen} animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.confirmCard}>
            <Text style={styles.pickerTitle}>Delete Child</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to delete this child?</Text>
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setDeleteConfirmOpen(false)} style={styles.actionButton} />
              <Button title={saving ? "Deleting..." : "Delete"} icon="trash-outline" onPress={deleteChild} style={{ ...styles.actionButton, ...styles.deleteButton }} />
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  heading: { color: C.ink, fontSize: 16, fontWeight: "800" },
  addButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10 },
  childRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, backgroundColor: "#fff" },
  avatar: { width: 36, height: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  avatarLarge: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  rowCopy: { flex: 1, minWidth: 0 },
  name: { color: C.ink, fontSize: 12, fontWeight: "700" },
  sub: { marginTop: 3, color: C.sub, fontSize: 10 },
  backLink: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, marginBottom: 8 },
  backText: { fontSize: 11, fontWeight: "700" },
  profileTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 2 },
  detailItem: { width: "47%", minWidth: 120, flexGrow: 1, paddingVertical: 5 },
  detailLabel: { color: C.sub, fontSize: 9, fontWeight: "600" },
  detailValue: { marginTop: 3, color: C.ink, fontSize: 11, fontWeight: "700" },
  empty: { paddingVertical: 14, color: C.sub, fontSize: 10, textAlign: "center" },
  error: { paddingVertical: 10, color: C.danger, fontSize: 10, textAlign: "center" },
  notice: { marginBottom: 10, padding: 10, borderRadius: 10, backgroundColor: "#E7F6EF", color: "#087F5B", fontSize: 11, fontWeight: "700" },
  formHint: { marginBottom: 10, color: C.sub, fontSize: 10 },
  groupLabel: { marginBottom: 7, color: C.sub, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  motherSelect: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 12, marginBottom: 14, borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: "#fff" },
  motherSelectText: { flex: 1, color: C.ink, fontSize: 11, fontWeight: "600" },
  placeholder: { color: "#9AABAD", fontWeight: "400" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  choice: { minHeight: 32, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: C.line, borderRadius: 9, backgroundColor: "#fff" },
  choiceText: { color: C.sub, fontSize: 9, fontWeight: "700" },
  choiceTextSelected: { color: "#fff" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 40, paddingHorizontal: 7, borderRadius: 10 },
  dangerButton: { borderColor: "#FECACA" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(7, 20, 18, 0.42)" },
  pickerCard: { width: "100%", maxWidth: 380, maxHeight: "80%", padding: 16, borderRadius: 16, backgroundColor: "#fff" },
  confirmCard: { width: "100%", maxWidth: 340, padding: 18, borderRadius: 16, backgroundColor: "#fff" },
  confirmMessage: { marginTop: 8, color: C.sub, fontSize: 12, lineHeight: 18 },
  deleteButton: { backgroundColor: C.danger },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  pickerTitle: { color: C.ink, fontSize: 15, fontWeight: "800" },
  motherOption: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  pressed: { opacity: 0.72 },
});
