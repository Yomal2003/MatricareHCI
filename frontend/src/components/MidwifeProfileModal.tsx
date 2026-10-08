import React from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MidwifeData {
  id?: string;
  _id?: string;
  name: string;
  staffId: string;
  phone: string;
  badge: string;
  area: string;
  locations?: string[];
  clinic?: string;
  qualifications?: string;
  experienceYears?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  midwife: MidwifeData | null;
}

export default function MidwifeProfileModal({ visible, onClose, midwife }: Props) {
  if (!midwife) return null;

  const handleCall = () => {
    if (midwife.phone) {
      Linking.openURL(`tel:${midwife.phone}`).catch(() => {});
    }
  };

  const coverageAreas = midwife.locations && midwife.locations.length > 0
    ? midwife.locations
    : [midwife.area || "Clinic Division"];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.card}>
          {/* Top Close Button */}
          <Pressable onPress={onClose} style={st.closeBtn}>
            <Ionicons name="close" size={20} color="#64748B" />
          </Pressable>

          {/* Avatar & Header */}
          <View style={st.avatarWrap}>
            <View style={st.avatar}>
              <Text style={{ fontSize: 32 }}>👩‍⚕️</Text>
            </View>
            <View style={st.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>

          <Text style={st.name}>{midwife.name}</Text>
          <Text style={st.staffId}>Staff ID: {midwife.staffId}</Text>

          <View style={st.badgePill}>
            <Text style={st.badgePillText}>{midwife.badge || `PHM · ${midwife.area}`}</Text>
          </View>

          {/* Details Section */}
          <View style={st.detailsBox}>
            {/* Phone & Quick Call */}
            <View style={st.detailRow}>
              <Ionicons name="call-outline" size={18} color="#059669" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.detailLabel}>Direct Phone</Text>
                <Text style={st.detailVal}>{midwife.phone || "Not listed"}</Text>
              </View>
              {!!midwife.phone && (
                <Pressable onPress={handleCall} style={st.callBtn}>
                  <Ionicons name="call" size={14} color="#FFFFFF" />
                  <Text style={st.callBtnText}>Call</Text>
                </Pressable>
              )}
            </View>

            {/* Assigned Clinic */}
            <View style={st.detailRow}>
              <Ionicons name="business-outline" size={18} color="#AF5819" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.detailLabel}>Assigned MOH Clinic</Text>
                <Text style={st.detailVal}>{midwife.clinic || "Buttala MOH Health Center"}</Text>
              </View>
            </View>

            {/* Qualifications */}
            <View style={st.detailRow}>
              <Ionicons name="ribbon-outline" size={18} color="#7C3AED" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.detailLabel}>SLMC Qualifications</Text>
                <Text style={st.detailVal}>
                  {midwife.qualifications || "Registered Public Health Midwife (SLMC)"}
                </Text>
              </View>
            </View>

            {/* Experience */}
            <View style={[st.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.detailLabel}>Field Service Experience</Text>
                <Text style={st.detailVal}>
                  {midwife.experienceYears || 6} years public maternal care service
                </Text>
              </View>
            </View>
          </View>

          {/* Coverage Villages / Areas */}
          <View style={st.coverageBox}>
            <Text style={st.coverageTitle}>ASSIGNED COVERAGE AREAS / VILLAGES</Text>
            <View style={st.areasRow}>
              {coverageAreas.map((loc, idx) => (
                <View key={idx} style={st.areaChip}>
                  <Ionicons name="location-sharp" size={12} color="#AF5819" />
                  <Text style={st.areaChipText}>{loc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Done Button */}
          <Pressable onPress={onClose} style={st.doneBtn}>
            <Text style={st.doneBtnText}>Close Profile</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  avatarWrap: {
    position: "relative",
    marginTop: 6,
    marginBottom: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FDE68A",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  staffId: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: "#FEF9EE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 8,
    marginBottom: 16,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  detailVal: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  coverageBox: {
    width: "100%",
    marginBottom: 18,
  },
  coverageTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  areasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  areaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  areaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  doneBtn: {
    width: "100%",
    height: 46,
    backgroundColor: "#AF5819",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
