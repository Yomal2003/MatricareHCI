import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import Shell from "../components/Shell";
import { Button, C, Card, Chip, Field, usePalette } from "../components/ui";

type RiskLevel = "low" | "medium" | "high";
type RiskPriority = "low" | "medium" | "high" | "urgent";

type Mother = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  village?: string;
  weeks?: number | null;
  lmp?: string;
  risk?: RiskLevel;
  riskFlags?: string[];
  riskPriority?: RiskPriority | null;
  riskNotes?: string;
  riskFollowUpDate?: string | null;
  status?: string;
};

const RISK_FACTORS = ["High BP", "Bleeding", "Swelling", "Low Hb", "Reduced movements", "Other"];
const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];
const PRIORITIES: RiskPriority[] = ["low", "medium", "high", "urgent"];

const dateLabel = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

const dateInput = (value?: string | null) => {
  if (!value) return "";
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "";
};

const priorityLabel = (priority?: RiskPriority | null) =>
  priority ? priority[0].toUpperCase() + priority.slice(1) : "Not set";

export default function PHMHighRiskMothers() {
  const palette = usePalette();
  const [query, setQuery] = useState("");
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsRefresh, setDetailsRefresh] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formFromDetails, setFormFromDetails] = useState(false);
  const [formRisk, setFormRisk] = useState<RiskLevel>("high");
  const [formFactors, setFormFactors] = useState<string[]>([]);
  const [formPriority, setFormPriority] = useState<RiskPriority>("high");
  const [formFollowUp, setFormFollowUp] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [candidates, setCandidates] = useState<Mother[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState("");
  const [pickerRefresh, setPickerRefresh] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    api<Mother[]>(
      `/mothers?risk=high&excludeClosed=true&q=${encodeURIComponent(query.trim())}`,
    )
      .then((items) => {
        if (active) setMothers(items.map((mother) => ({ ...mother, code: mother.code ?? mother.id ?? "" })));
      })
      .catch((error) => {
        if (active) {
          setMothers([]);
          setLoadError(error instanceof Error ? error.message : "High-risk mothers could not be loaded.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, refresh]);

  useEffect(() => {
    if (!pickerOpen) return;
    let active = true;
    setCandidatesLoading(true);
    setCandidatesError("");
    api<Mother[]>(
      `/mothers?excludeClosed=true&q=${encodeURIComponent(pickerQuery.trim())}`,
    )
      .then((items) => {
        if (active) setCandidates(items.map((mother) => ({ ...mother, code: mother.code ?? mother.id ?? "" })));
      })
      .catch((error) => {
        if (active) {
          setCandidates([]);
          setCandidatesError(error instanceof Error ? error.message : "Mother list could not be loaded.");
        }
      })
      .finally(() => { if (active) setCandidatesLoading(false); });
    return () => { active = false; };
  }, [pickerOpen, pickerQuery, pickerRefresh]);

  useEffect(() => {
    if (!selectedMother || !detailsOpen) {
      setDetailsLoading(false);
      setDetailsError("");
      return;
    }
    let active = true;
    setDetailsLoading(true);
    setDetailsError("");
    api<{ mother: Mother }>(`/mothers/${encodeURIComponent(selectedMother.code)}`)
      .then(({ mother }) => {
        if (active) setSelectedMother({ ...mother, code: mother.code ?? mother.id ?? selectedMother.code });
      })
      .catch((error) => {
        if (active) setDetailsError(error instanceof Error ? error.message : "Risk details could not be loaded.");
      })
      .finally(() => { if (active) setDetailsLoading(false); });
    return () => { active = false; };
  }, [selectedMother?.code, detailsOpen, detailsRefresh]);

  const visibleCandidates = useMemo(
    () => candidates.filter((mother) => mother.code),
    [candidates],
  );

  const startAssessment = (mother: Mother, fromDetails = false) => {
    setSelectedMother(mother);
    setFormRisk(mother.risk === "high" || fromDetails ? mother.risk ?? "high" : "high");
    setFormFactors(mother.riskFlags ?? []);
    setFormPriority(mother.riskPriority ?? "high");
    setFormFollowUp(dateInput(mother.riskFollowUpDate));
    setFormNotes(mother.riskNotes ?? "");
    setFormFromDetails(fromDetails);
    setFormOpen(true);
    setDetailsOpen(false);
    setNotice("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setDetailsOpen(formFromDetails);
    if (!formFromDetails) setSelectedMother(null);
    setNotice("");
  };

  const openDetails = (mother: Mother) => {
    setSelectedMother(mother);
    setFormOpen(false);
    setDetailsOpen(true);
    setNotice("");
  };

  const resetToList = () => {
    setSelectedMother(null);
    setFormOpen(false);
    setDetailsOpen(false);
    setDetailsError("");
    setNotice("");
    setRefresh((value) => value + 1);
  };

  const toggleFactor = (factor: string) => {
    setFormFactors((current) =>
      current.includes(factor) ? current.filter((item) => item !== factor) : [...current, factor],
    );
  };

  const saveAssessment = async () => {
    if (!selectedMother) return;
    if (formFollowUp.trim() && Number.isNaN(new Date(formFollowUp).getTime())) {
      setNotice("Enter a valid follow-up date (YYYY-MM-DD).");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const saved = await api<Mother>(`/mothers/${encodeURIComponent(selectedMother.code)}`, {
        method: "PATCH",
        body: {
          risk: formRisk,
          riskFlags: formFactors,
          riskPriority: formPriority,
          riskFollowUpDate: formFollowUp.trim() || null,
          riskNotes: formNotes.trim(),
        },
      });
      const updated = { ...saved, code: saved.code ?? saved.id ?? selectedMother.code };
      setSelectedMother(updated);
      setFormOpen(false);
      setRefresh((value) => value + 1);
      if (updated.risk === "high") {
        setDetailsOpen(true);
        setDetailsRefresh((value) => value + 1);
      } else {
        setDetailsOpen(false);
        setSelectedMother(null);
      }
      setNotice(updated.risk === "high" ? "Risk assessment saved successfully." : "Risk level updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? `Risk assessment could not be saved: ${error.message}` : "Risk assessment could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const removeAssessment = async () => {
    if (!selectedMother) return;
    setSaving(true);
    setNotice("");
    try {
      await api<Mother>(`/mothers/${encodeURIComponent(selectedMother.code)}`, {
        method: "PATCH",
        body: {
          risk: "low",
          riskFlags: [],
          riskPriority: null,
          riskFollowUpDate: null,
          riskNotes: "",
        },
      });
      setDeleteConfirmOpen(false);
      setSelectedMother(null);
      setDetailsOpen(false);
      setFormOpen(false);
      setRefresh((value) => value + 1);
      setNotice("High-risk status removed. The mother record remains active.");
    } catch (error) {
      setDeleteConfirmOpen(false);
      setNotice(error instanceof Error ? `Risk status could not be removed: ${error.message}` : "Risk status could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="High-Risk Patients" headerBadge={null} headerLeadingIcon="chevron-back" headerBackTo="phm-home">
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

      {!selectedMother && !formOpen ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.heading}>High-Risk Mothers</Text>
            <Button
              title="Add High-Risk Patient"
              icon="add"
              onPress={() => {
                setPickerQuery("");
                setPickerOpen(true);
                setNotice("");
              }}
              style={styles.addButton}
            />
          </View>
          <Field
            icon="search"
            placeholder="Search by mother name or Mother ID"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search by mother name or Mother ID"
          />
          <Card label="HIGH-RISK MOTHERS">
            {loading ? <Text style={styles.empty}>Loading high-risk mothers...</Text> : null}
            {!loading && loadError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>High-risk mothers unavailable: {loadError}</Text>
                <Button title="Retry" icon="refresh" variant="ghost" onPress={() => setRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!loading && !loadError && mothers.length === 0 ? (
              <Text style={styles.empty}>{query.trim() ? "No high-risk mothers match your search." : "No high-risk mothers found."}</Text>
            ) : null}
            {!loading && !loadError ? mothers.map((mother) => (
              <Pressable
                key={mother._id ?? mother.code}
                accessibilityRole="button"
                accessibilityLabel={`View risk details for ${mother.name}`}
                onPress={() => openDetails(mother)}
                style={({ pressed }) => [styles.motherRow, pressed && styles.pressed]}
              >
                <View style={styles.riskIcon}>
                  <Ionicons name="warning" size={18} color={C.danger} />
                </View>
                <View style={styles.rowCopy}>
                  <View style={styles.nameLine}>
                    <Text style={styles.name}>{mother.name}</Text>
                    <Chip text="HIGH RISK" tone="danger" />
                  </View>
                  <Text style={styles.sub}>
                    {mother.code}
                    {mother.weeks != null ? ` · ${mother.weeks} weeks` : ""}
                    {mother.village ? ` · ${mother.village}` : ""}
                  </Text>
                  {mother.riskFlags?.length ? (
                    <Text numberOfLines={2} style={styles.factorSummary}>Factors: {mother.riskFlags.join(", ")}</Text>
                  ) : null}
                  {mother.riskFollowUpDate ? (
                    <Text style={styles.followUp}>Follow-up · {dateLabel(mother.riskFollowUpDate)}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={17} color={C.sub} />
              </Pressable>
            )) : null}
          </Card>
        </>
      ) : null}

      {formOpen && selectedMother ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel risk assessment" onPress={closeForm} style={styles.backLink}>
            <Ionicons name="arrow-back" size={16} color={palette.colorDark} />
            <Text style={[styles.backText, { color: palette.colorDark }]}>Cancel</Text>
          </Pressable>
          <Card label={selectedMother.risk === "high" ? "EDIT RISK ASSESSMENT" : "ADD RISK ASSESSMENT"}>
            <View style={styles.profileTitle}>
              <View style={styles.riskIcon}>
                <Ionicons name="woman-outline" size={18} color={C.danger} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.name}>{selectedMother.name}</Text>
                <Text style={styles.sub}>{selectedMother.code}{selectedMother.village ? ` · ${selectedMother.village}` : ""}</Text>
              </View>
            </View>
            <Text style={styles.groupLabel}>RISK LEVEL</Text>
            <View style={styles.choiceRow}>
              {RISK_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formRisk === level }}
                  onPress={() => setFormRisk(level)}
                  style={[styles.choice, formRisk === level && styles.selectedChoice]}
                >
                  <Text style={[styles.choiceText, formRisk === level && styles.selectedChoiceText]}>{level.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.groupLabel}>RISK FACTORS</Text>
            <View style={styles.factorGrid}>
              {RISK_FACTORS.map((factor) => {
                const selected = formFactors.includes(factor);
                return (
                  <Pressable
                    key={factor}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => toggleFactor(factor)}
                    style={[styles.factorChoice, selected && styles.selectedFactor]}
                  >
                    <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={17} color={selected ? C.danger : C.sub} />
                    <Text style={[styles.factorText, selected && styles.selectedFactorText]}>{factor}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.groupLabel}>PRIORITY</Text>
            <View style={styles.choiceRow}>
              {PRIORITIES.map((priority) => (
                <Pressable
                  key={priority}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formPriority === priority }}
                  onPress={() => setFormPriority(priority)}
                  style={[styles.choice, formPriority === priority && styles.selectedChoice]}
                >
                  <Text style={[styles.choiceText, formPriority === priority && styles.selectedChoiceText]}>{priority.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="FOLLOW-UP DATE"
              value={formFollowUp}
              onChangeText={setFormFollowUp}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Risk follow-up date"
            />
            <Field
              label="NOTES"
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Add assessment notes"
              accessibilityLabel="Risk assessment notes"
              multiline
              style={styles.notesInput}
            />
            <Button
              title={saving ? "Saving..." : "Save Assessment"}
              icon="checkmark"
              onPress={() => { if (!saving) void saveAssessment(); }}
            />
          </Card>
        </>
      ) : null}

      {detailsOpen && selectedMother ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to high-risk mothers"
            onPress={resetToList}
            style={styles.backLink}
          >
            <Ionicons name="arrow-back" size={16} color={palette.colorDark} />
            <Text style={[styles.backText, { color: palette.colorDark }]}>High-Risk Patients</Text>
          </Pressable>
          <Card label="RISK DETAILS">
            {detailsLoading ? <Text style={styles.empty}>Loading risk details...</Text> : null}
            {!detailsLoading && detailsError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{detailsError}</Text>
                <Button title="Retry" icon="refresh" variant="ghost" onPress={() => setDetailsRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!detailsLoading && !detailsError ? (
              <>
                <View style={styles.profileTitle}>
                  <View style={styles.riskIcon}>
                    <Ionicons name="woman-outline" size={18} color={C.danger} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.name}>{selectedMother.name}</Text>
                    <Text style={styles.sub}>Mother ID · {selectedMother.code}</Text>
                  </View>
                  <Chip text={(selectedMother.risk ?? "high").toUpperCase()} tone="danger" />
                </View>
                <View style={styles.detailGrid}>
                  <Detail label="Current pregnancy weeks" value={selectedMother.weeks == null ? "Not available" : `${selectedMother.weeks} weeks`} />
                  <Detail label="Risk level" value={(selectedMother.risk ?? "high").toUpperCase()} />
                  <Detail label="Priority" value={priorityLabel(selectedMother.riskPriority)} />
                  <Detail label="Follow-up date" value={dateLabel(selectedMother.riskFollowUpDate) || "Not set"} />
                  <Detail label="Village" value={selectedMother.village || "Not available"} />
                  <Detail label="Risk factors" value={selectedMother.riskFlags?.length ? selectedMother.riskFlags.join(", ") : "None recorded"} />
                  <Detail label="Notes" value={selectedMother.riskNotes?.trim() || "No notes"} />
                </View>
                <View style={styles.actions}>
                  <Button title="Edit Assessment" icon="create-outline" variant="ghost" onPress={() => startAssessment(selectedMother, true)} style={styles.actionButton} />
                  <Button title="Remove Risk" icon="trash-outline" variant="ghost" onPress={() => setDeleteConfirmOpen(true)} style={styles.removeButton} />
                </View>
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Select an existing mother</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close mother selection" onPress={() => setPickerOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={C.sub} />
              </Pressable>
            </View>
            <Field
              icon="search"
              placeholder="Search by mother name or ID"
              value={pickerQuery}
              onChangeText={setPickerQuery}
              accessibilityLabel="Search existing mothers"
            />
            {candidatesLoading ? <Text style={styles.empty}>Loading mothers...</Text> : null}
            {!candidatesLoading && candidatesError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>Mother list unavailable: {candidatesError}</Text>
                <Button title="Retry" icon="refresh" variant="ghost" onPress={() => setPickerRefresh((value) => value + 1)} />
              </>
            ) : null}
            {!candidatesLoading && !candidatesError && visibleCandidates.length === 0 ? (
              <Text style={styles.empty}>No existing mothers match your search.</Text>
            ) : null}
            {!candidatesLoading && !candidatesError ? (
              <ScrollView style={styles.candidateList} keyboardShouldPersistTaps="handled">
                {visibleCandidates.map((mother) => (
                  <Pressable
                    key={mother._id ?? mother.code}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${mother.name}, ${mother.code}`}
                    onPress={() => {
                      setPickerOpen(false);
                      startAssessment(mother);
                    }}
                    style={({ pressed }) => [styles.candidateRow, pressed && styles.pressed]}
                  >
                    <View style={styles.rowCopy}>
                      <View style={styles.nameLine}>
                        <Text style={styles.name}>{mother.name}</Text>
                        {mother.risk === "high" ? <Chip text="HIGH RISK" tone="danger" /> : null}
                      </View>
                      <Text style={styles.sub}>
                        {mother.code}{mother.village ? ` · ${mother.village}` : ""}
                        {mother.weeks == null ? "" : ` · ${mother.weeks} weeks`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={C.sub} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Remove High-Risk Status</Text>
            <Text style={styles.confirmText}>
              Remove this risk assessment? The mother record will remain active.
            </Text>
            <View style={styles.confirmActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setDeleteConfirmOpen(false)} style={styles.actionButton} />
              <Button
                title={saving ? "Removing..." : "Remove Risk"}
                icon="trash-outline"
                onPress={() => { if (!saving) void removeAssessment(); }}
                style={styles.deleteButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  heading: { flex: 1, color: C.ink, fontSize: 20, fontWeight: "800" },
  addButton: { minHeight: 46, paddingHorizontal: 12, borderRadius: 14 },
  motherRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  candidateRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  riskIcon: { width: 42, height: 42, flexShrink: 0, borderRadius: 21, backgroundColor: C.dangerBg, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  name: { color: C.ink, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  sub: { color: C.sub, fontSize: 12, marginTop: 3 },
  factorSummary: { color: "#9F2525", fontSize: 12, marginTop: 5, lineHeight: 17 },
  followUp: { color: C.sub, fontSize: 12, marginTop: 4, fontWeight: "700" },
  empty: { color: C.sub, fontSize: 14, paddingVertical: 14, textAlign: "center" },
  error: { color: C.danger, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  notice: { color: C.ink, backgroundColor: "#E8F6F1", borderRadius: 12, padding: 11, marginBottom: 12, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.72 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingVertical: 8, marginBottom: 6 },
  backText: { fontSize: 14, fontWeight: "700" },
  profileTitle: { flexDirection: "row", alignItems: "center", gap: 11, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 14 },
  detailGrid: { gap: 12 },
  detailItem: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  detailLabel: { color: C.sub, fontSize: 12, fontWeight: "700", marginBottom: 3 },
  detailValue: { color: C.ink, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  groupLabel: { color: C.sub, fontSize: 12, fontWeight: "800", letterSpacing: 0.4, marginTop: 8, marginBottom: 8 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  choice: { minWidth: 64, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, alignItems: "center", backgroundColor: "#fff" },
  selectedChoice: { backgroundColor: C.danger, borderColor: C.danger },
  choiceText: { color: C.sub, fontSize: 11, fontWeight: "800" },
  selectedChoiceText: { color: "#fff" },
  factorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  factorChoice: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#fff" },
  selectedFactor: { borderColor: "#F2B7B7", backgroundColor: "#FFF5F5" },
  factorText: { color: C.sub, fontSize: 12, fontWeight: "700" },
  selectedFactorText: { color: "#9F2525" },
  notesInput: { minHeight: 88, textAlignVertical: "top" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 16 },
  actionButton: { flex: 1, minWidth: 140, minHeight: 46 },
  removeButton: { flex: 1, minWidth: 130, minHeight: 46, borderColor: "#F3B5B5", backgroundColor: "#FFF" },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18, backgroundColor: "rgba(15,42,46,0.42)" },
  modalCard: { width: "100%", maxWidth: 420, maxHeight: "82%", backgroundColor: "#fff", borderRadius: 20, padding: 18 },
  candidateList: { flexShrink: 1 },
  confirmCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  modalTitle: { color: C.ink, fontSize: 17, fontWeight: "800", flex: 1 },
  confirmText: { color: C.sub, fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 18 },
  confirmActions: { flexDirection: "row", gap: 9 },
  deleteButton: { flex: 1, minHeight: 46, backgroundColor: C.danger },
});
