import React, { useState, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { api } from "../api/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS (Matching MOH Dashboard Design System)
// ─────────────────────────────────────────────────────────────
const PRIMARY = "#7B4FE0";
const PRIMARY_DARK = "#6B3FD4";
const PRIMARY_LIGHT = "#EDE9FE";
const PRIMARY_TINT = "#F5F3FF";
const BG_COLOR = "#F5F6FA";
const CARD_BG = "#FFFFFF";

const SUCCESS = "#10B981";
const SUCCESS_BG = "#DCFCE7";
const SUCCESS_TEXT = "#15803D";

const DANGER = "#EF4444";
const DANGER_BG = "#FEE2E2";
const DANGER_TEXT = "#B91C1C";

const WARNING = "#F59E0B";
const WARNING_BG = "#FEF3C7";
const WARNING_TEXT = "#B45309";

const INFO_BLUE = "#3B82F6";
const INFO_BLUE_BG = "#DBEAFE";
const INFO_BLUE_TEXT = "#1D4ED8";

const TEXT_MAIN = "#1E293B";
const TEXT_MUTED = "#64748B";
const TEXT_LIGHT = "#94A3B8";
const BORDER_COLOR = "#EEF2F6";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type StaffRole = "PHM" | "Nursing Officer" | "Clinic Staff";

export interface StaffActivity {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
  type?: "primary" | "success" | "warning" | "danger";
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  zone: string;
  phone: string;
  email?: string;
  username?: string;
  active: boolean;
  dateJoined: string;
  avatarBg: string;
  activities: StaffActivity[];
}

export const ZONES_LIST = [
  "Buttala",
  "Hella",
  "Gonagala",
  "Baevi",
  "Medawe",
] as const;

export const ROLES_LIST: StaffRole[] = [
  "PHM",
  "Nursing Officer",
  "Clinic Staff",
];

// Helper for Role colors
export function getRoleBadgeStyle(role: StaffRole) {
  switch (role) {
    case "PHM":
      return { bg: SUCCESS_BG, text: SUCCESS_TEXT, border: "#86EFAC" };
    case "Nursing Officer":
      return { bg: WARNING_BG, text: WARNING_TEXT, border: "#FDE68A" };
    case "Clinic Staff":
      return { bg: INFO_BLUE_BG, text: INFO_BLUE_TEXT, border: "#BAE6FD" };
    default:
      return { bg: PRIMARY_LIGHT, text: PRIMARY, border: PRIMARY_LIGHT };
  }
}

// Initial Mock Staff Dataset (Buttala MOH Division)
const INITIAL_STAFF: StaffMember[] = [
  {
    id: "staff-1",
    name: "Kamani Rathnayake",
    role: "PHM",
    zone: "Buttala",
    phone: "+94 77 123 4567",
    email: "kamani.rathnayake@health.gov.lk",
    active: true,
    dateJoined: "Jan 12, 2023",
    avatarBg: "#8B5CF6",
    activities: [
      {
        id: "act-1",
        icon: "location",
        title: "Assigned to Buttala zone",
        time: "Mar 2026",
        type: "primary",
      },
      {
        id: "act-2",
        icon: "checkmark-done-circle",
        title: "18 home visits recorded this month",
        time: "3d ago",
        type: "success",
      },
      {
        id: "act-3",
        icon: "document-text",
        title: "Submitted monthly clinic tally (H509)",
        time: "1w ago",
        type: "primary",
      },
    ],
  },
  {
    id: "staff-2",
    name: "Sunethra Bandara",
    role: "PHM",
    zone: "Hella",
    phone: "+94 71 234 5678",
    email: "sunethra.bandara@health.gov.lk",
    active: true,
    dateJoined: "Mar 15, 2022",
    avatarBg: "#EC4899",
    activities: [
      {
        id: "act-4",
        icon: "location",
        title: "Assigned to Hella zone",
        time: "Mar 2026",
        type: "primary",
      },
      {
        id: "act-5",
        icon: "calendar",
        title: "12 visits recorded this month",
        time: "4d ago",
        type: "primary",
      },
      {
        id: "act-6",
        icon: "alert-circle",
        title: "High-risk escalation flagged for ANC",
        time: "2w ago",
        type: "danger",
      },
    ],
  },
  {
    id: "staff-3",
    name: "Priyanthi Silva",
    role: "Nursing Officer",
    zone: "Gonagala",
    phone: "+94 76 345 6789",
    email: "priyanthi.silva@health.gov.lk",
    active: true,
    dateJoined: "Nov 04, 2023",
    avatarBg: "#F59E0B",
    activities: [
      {
        id: "act-7",
        icon: "medkit",
        title: "Assigned to Gonagala clinic",
        time: "Nov 2023",
        type: "warning",
      },
      {
        id: "act-8",
        icon: "shield-checkmark",
        title: "Immunization session: 42 infants verified",
        time: "5d ago",
        type: "success",
      },
    ],
  },
  {
    id: "staff-4",
    name: "Nirosha Jayatilleke",
    role: "PHM",
    zone: "Baevi",
    phone: "+94 78 456 7890",
    email: "nirosha.j@health.gov.lk",
    active: true,
    dateJoined: "Jun 20, 2021",
    avatarBg: "#10B981",
    activities: [
      {
        id: "act-9",
        icon: "location",
        title: "Assigned to Baevi zone",
        time: "Jun 2021",
        type: "primary",
      },
      {
        id: "act-10",
        icon: "fitness",
        title: "15 prenatal consultations completed",
        time: "1w ago",
        type: "success",
      },
    ],
  },
  {
    id: "staff-5",
    name: "Chamari Warnakulasuriya",
    role: "Nursing Officer",
    zone: "Buttala",
    phone: "+94 75 987 6543",
    email: "chamari.w@health.gov.lk",
    active: true,
    dateJoined: "Aug 18, 2024",
    avatarBg: "#3B82F6",
    activities: [
      {
        id: "act-11",
        icon: "medkit",
        title: "Assigned to Central Clinic",
        time: "Aug 2024",
        type: "primary",
      },
      {
        id: "act-12",
        icon: "heart",
        title: "9 maternal health checks recorded",
        time: "1w ago",
        type: "success",
      },
    ],
  },
  {
    id: "staff-6",
    name: "K. G. Perera",
    role: "Clinic Staff",
    zone: "Medawe",
    phone: "+94 72 345 6781",
    email: "kg.perera@health.gov.lk",
    active: false,
    dateJoined: "Feb 10, 2020",
    avatarBg: "#64748B",
    activities: [
      {
        id: "act-13",
        icon: "pause-circle",
        title: "Account inactive on study leave",
        time: "Sep 2026",
        type: "warning",
      },
      {
        id: "act-14",
        icon: "cube",
        title: "Equipment ledger handed over",
        time: "1mo ago",
        type: "primary",
      },
    ],
  },
  {
    id: "staff-7",
    name: "Dilani Wickramasinghe",
    role: "Clinic Staff",
    zone: "Hella",
    phone: "+94 70 876 5432",
    email: "dilani.w@health.gov.lk",
    active: true,
    dateJoined: "Apr 05, 2025",
    avatarBg: "#06B6D4",
    activities: [
      {
        id: "act-15",
        icon: "calendar",
        title: "Assigned to Hella Sub-centre",
        time: "Apr 2025",
        type: "primary",
      },
      {
        id: "act-16",
        icon: "clipboard",
        title: "Appointment booking roster updated",
        time: "2w ago",
        type: "primary",
      },
    ],
  },
];

// Helper to extract initials
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface StaffManagementProps {
  activeSegment?: "missed" | "staff";
  onSegmentChange?: (segment: "missed" | "staff") => void;
  onBackToHome: () => void;
  renderBottomNav?: () => React.ReactNode;
}

export function StaffManagement({
  activeSegment = "staff",
  onSegmentChange,
  onBackToHome,
  renderBottomNav,
}: StaffManagementProps) {
  // Screen state: "list" (Screen 1) | "add" (Screen 2) | "detail" (Screen 3)
  const [currentScreen, setCurrentScreen] = useState<"list" | "add" | "detail">("list");
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Screen 4 modal state
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);

  // Screen 3 edit mode state
  const [isEditing, setIsEditing] = useState(false);

  // Screen 1 Search and Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("All Roles");
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("All Zones");
  const [filterPickerType, setFilterPickerType] = useState<"role" | "zone" | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing staff from MongoDB backend on mount
  useEffect(() => {
    let active = true;
    api<{ staff: any[] }>("/api/moh/staff")
      .then((res) => {
        if (!active || !res?.staff || !Array.isArray(res.staff) || res.staff.length === 0) return;
        const fromDb: StaffMember[] = res.staff.map((s) => ({
          id: s.id || s._id,
          name: s.fullName,
          role: (s.role === "NURSING_OFFICER" ? "Nursing Officer" : s.role === "CLINIC_STAFF" ? "Clinic Staff" : "PHM") as StaffRole,
          zone: s.zone,
          phone: s.phone,
          email: s.email,
          username: s.username,
          active: s.status === "active",
          dateJoined: s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recent",
          avatarBg: "#8B5CF6",
          activities: [
            {
              id: `act-${s.id || s._id}`,
              icon: "person-add",
              title: `Account registered as ${s.username}`,
              time: "Database Active",
              type: "success",
            },
          ],
        }));
        setStaffList(fromDb);
      })
      .catch((e) => {
        console.log("Using default demo staff (backend offline):", e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.zone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoleFilter === "All Roles" || item.role === selectedRoleFilter;

      const matchesZone =
        selectedZoneFilter === "All Zones" || item.zone === selectedZoneFilter;

      return matchesSearch && matchesRole && matchesZone;
    });
  }, [staffList, searchQuery, selectedRoleFilter, selectedZoneFilter]);

  // Handlers
  const handleOpenDetail = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsEditing(false);
    setCurrentScreen("detail");
  };

  const handleSaveNewStaff = async (newStaff: StaffMember) => {
    setIsSaving(true);
    try {
      const backendRole =
        newStaff.role === "Nursing Officer"
          ? "NURSING_OFFICER"
          : newStaff.role === "Clinic Staff"
          ? "CLINIC_STAFF"
          : "PHM";

      const res = await api<{
        id: string;
        username: string;
        status: string;
        emailStatus: string;
        message: string;
      }>("/api/moh/staff", {
        method: "POST",
        body: {
          fullName: newStaff.name,
          role: backendRole,
          zone: newStaff.zone,
          phone: newStaff.phone,
          email: newStaff.email,
        },
      });

      const savedMember: StaffMember = {
        ...newStaff,
        id: res.id || newStaff.id,
        username: res.username,
      };

      setStaffList((prev) => [savedMember, ...prev]);
      setCurrentScreen("list");
      showToast(
        res.emailStatus === "sent"
          ? `Saved to database! Username: ${res.username} (Credentials emailed)`
          : `Saved to database! Username: ${res.username}`
      );
    } catch (err: any) {
      console.warn("Failed to save to database via API:", err.message);
      const isClientError =
        err.message?.includes("409") ||
        err.message?.includes("400") ||
        err.message?.toLowerCase().includes("conflict") ||
        err.message?.toLowerCase().includes("already registered");

      if (isClientError) {
        showToast(err.message);
      } else {
        // Offline / Network fallback
        setStaffList((prev) => [newStaff, ...prev]);
        setCurrentScreen("list");
        showToast(`Saved locally (DB: ${err.message || "Server offline"})`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStaff = (updatedStaff: StaffMember) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s))
    );
    setSelectedStaff(updatedStaff);
    setIsEditing(false);
    showToast("Staff details updated");
  };

  const handleConfirmDeactivation = () => {
    if (!selectedStaff) return;
    const deactivatedStaff = { ...selectedStaff, active: false };
    setStaffList((prev) =>
      prev.map((s) => (s.id === selectedStaff.id ? deactivatedStaff : s))
    );
    setSelectedStaff(deactivatedStaff);
    setDeactivateModalVisible(false);
    setCurrentScreen("list");
    showToast("Staff member deactivated");
  };

  const handleReactivateStaff = (staff: StaffMember) => {
    const reactivatedStaff = { ...staff, active: true };
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? reactivatedStaff : s))
    );
    setSelectedStaff(reactivatedStaff);
    showToast("Staff account reactivated");
  };

  const handleResendCredentials = async (staff: StaffMember) => {
    try {
      showToast("Generating new credentials & sending email...");
      const res = await api(`/api/moh/staff/${staff.id}/resend-credentials`, {
        method: "POST",
      });
      showToast(res.message || "Credentials resent successfully");
    } catch (err: any) {
      showToast(`Resend failed: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <View style={styles.toastIconBox}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* RENDER SCREENS */}
      {currentScreen === "list" && (
        <Screen1StaffList
          staffList={filteredStaff}
          allStaffCount={staffList.length}
          activeSegment={activeSegment}
          onSegmentChange={onSegmentChange}
          onBackToHome={onBackToHome}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedRoleFilter={selectedRoleFilter}
          selectedZoneFilter={selectedZoneFilter}
          onOpenFilterPicker={(type) => setFilterPickerType(type)}
          onSelectStaff={handleOpenDetail}
          onPressAdd={() => setCurrentScreen("add")}
          renderBottomNav={renderBottomNav}
        />
      )}

      {currentScreen === "add" && (
        <Screen2AddStaff
          onBack={() => setCurrentScreen("list")}
          onSave={handleSaveNewStaff}
          isSaving={isSaving}
        />
      )}

      {currentScreen === "detail" && selectedStaff && (
        <Screen3StaffDetail
          staff={selectedStaff}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing(!isEditing)}
          onBack={() => {
            setIsEditing(false);
            setCurrentScreen("list");
          }}
          onSave={handleUpdateStaff}
          onDeactivatePress={() => setDeactivateModalVisible(true)}
          onReactivatePress={() => handleReactivateStaff(selectedStaff)}
          onResendCredentials={handleResendCredentials}
        />
      )}

      {/* SCREEN 4: Deactivate Confirmation Modal */}
      <Screen4DeactivateModal
        visible={deactivateModalVisible}
        staffName={selectedStaff?.name || "Staff Member"}
        onCancel={() => setDeactivateModalVisible(false)}
        onConfirm={handleConfirmDeactivation}
      />

      {/* Filter Options Picker Modal */}
      <FilterPickerModal
        type={filterPickerType}
        currentRole={selectedRoleFilter}
        currentZone={selectedZoneFilter}
        onSelectRole={(r) => {
          setSelectedRoleFilter(r);
          setFilterPickerType(null);
        }}
        onSelectZone={(z) => {
          setSelectedZoneFilter(z);
          setFilterPickerType(null);
        }}
        onClose={() => setFilterPickerType(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 1: Staff List (Read)
// ─────────────────────────────────────────────────────────────
interface Screen1Props {
  staffList: StaffMember[];
  allStaffCount: number;
  activeSegment?: "missed" | "staff";
  onSegmentChange?: (seg: "missed" | "staff") => void;
  onBackToHome: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRoleFilter: string;
  selectedZoneFilter: string;
  onOpenFilterPicker: (type: "role" | "zone") => void;
  onSelectStaff: (staff: StaffMember) => void;
  onPressAdd: () => void;
  renderBottomNav?: () => React.ReactNode;
}

function Screen1StaffList({
  staffList,
  allStaffCount,
  activeSegment,
  onSegmentChange,
  onBackToHome,
  searchQuery,
  onSearchChange,
  selectedRoleFilter,
  selectedZoneFilter,
  onOpenFilterPicker,
  onSelectStaff,
  onPressAdd,
  renderBottomNav,
}: Screen1Props) {
  return (
    <View style={styles.screenWrapper}>
      {/* Top Header with Gradient & Segmented Control */}
      <LinearGradient
        colors={[PRIMARY, PRIMARY_DARK]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]}>
          {/* Sub-header Navigation Row */}
          <View style={[styles.headerTopRow, { marginBottom: 4 }]}>
            <Pressable onPress={onBackToHome} style={styles.backCircleBtn}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Staff Management</Text>
              <Text style={styles.headerSubtitle}>
                MOH Buttala Field Healthcare Force
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Staff Controls & List */}
      <ScrollView
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={TEXT_MUTED}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search staff by name or zone"
            placeholderTextColor={TEXT_LIGHT}
            value={searchQuery}
            onChangeText={onSearchChange}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => onSearchChange("")}
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={18} color={TEXT_LIGHT} />
            </Pressable>
          )}
        </View>

        {/* Horizontal Filter Row: "All Roles" and "All Zones" */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => onOpenFilterPicker("role")}
            style={[
              styles.filterChip,
              selectedRoleFilter !== "All Roles" && styles.filterChipSelected,
            ]}
          >
            <Ionicons
              name="medical-outline"
              size={14}
              color={selectedRoleFilter !== "All Roles" ? PRIMARY : TEXT_MUTED}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedRoleFilter !== "All Roles" && styles.filterChipTextSelected,
              ]}
            >
              {selectedRoleFilter}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={selectedRoleFilter !== "All Roles" ? PRIMARY : TEXT_LIGHT}
            />
          </Pressable>

          <Pressable
            onPress={() => onOpenFilterPicker("zone")}
            style={[
              styles.filterChip,
              selectedZoneFilter !== "All Zones" && styles.filterChipSelected,
            ]}
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={selectedZoneFilter !== "All Zones" ? PRIMARY : TEXT_MUTED}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedZoneFilter !== "All Zones" && styles.filterChipTextSelected,
              ]}
            >
              {selectedZoneFilter}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={selectedZoneFilter !== "All Zones" ? PRIMARY : TEXT_LIGHT}
            />
          </Pressable>

          {(selectedRoleFilter !== "All Roles" ||
            selectedZoneFilter !== "All Zones") && (
            <Pressable
              onPress={() => {
                onOpenFilterPicker("role");
              }}
              style={styles.clearFilterChip}
            >
              <Text style={styles.clearFilterText}>Filters Active</Text>
            </Pressable>
          )}
        </View>

        {/* List Count Summary */}
        <View style={styles.countSummaryRow}>
          <Text style={styles.countSummaryText}>
            STAFF DIRECTORY ({staffList.length})
          </Text>
          <Text style={styles.countSummaryActive}>
            {staffList.filter((s) => s.active).length} Active
          </Text>
        </View>

        {/* Staff Cards List */}
        {staffList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search" size={28} color={TEXT_LIGHT} />
            </View>
            <Text style={styles.emptyTitle}>No staff members found</Text>
            <Text style={styles.emptySub}>
              Try adjusting your search terms or filters
            </Text>
          </View>
        ) : (
          staffList.map((staff) => {
            const roleStyle = getRoleBadgeStyle(staff.role);
            return (
              <Pressable
                key={staff.id}
                onPress={() => onSelectStaff(staff)}
                style={({ pressed }) => [
                  styles.staffCard,
                  !staff.active && styles.staffCardInactive,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                ]}
              >
                {/* Left Circular Avatar with Initials */}
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: staff.avatarBg || PRIMARY },
                  ]}
                >
                  <Text style={styles.avatarInitials}>
                    {getInitials(staff.name)}
                  </Text>
                </View>

                {/* Middle Info Column */}
                <View style={styles.staffCardMiddle}>
                  <View style={styles.staffCardNameRow}>
                    <Text
                      style={[
                        styles.staffNameText,
                        !staff.active && styles.staffNameInactive,
                      ]}
                      numberOfLines={1}
                    >
                      {staff.name}
                    </Text>
                    {/* Role Badge */}
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor: roleStyle.bg,
                          borderColor: roleStyle.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.roleBadgeText, { color: roleStyle.text }]}
                      >
                        {staff.role}
                      </Text>
                    </View>
                  </View>

                  {/* Zone/Clinic Subtitle */}
                  <View style={styles.staffZoneRow}>
                    <Ionicons
                      name="location-outline"
                      size={12.5}
                      color={TEXT_MUTED}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={styles.staffZoneText}>
                      {staff.zone} Zone • {staff.phone}
                    </Text>
                  </View>
                </View>

                {/* Right Column: Status Dot & Chevron */}
                <View style={styles.staffCardRight}>
                  {/* Status Dot */}
                  <View style={styles.statusIndicatorRow}>
                    <View
                      style={[
                        styles.statusDot,
                        staff.active
                          ? styles.statusDotActive
                          : styles.statusDotInactive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusLabelText,
                        staff.active
                          ? styles.statusLabelActive
                          : styles.statusLabelInactive,
                      ]}
                    >
                      {staff.active ? "Active" : "Inactive"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={TEXT_LIGHT}
                    style={{ marginTop: 8 }}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button: Add Staff (Bottom-Right, fixed above bottom nav) */}
      <Pressable
        onPress={onPressAdd}
        style={({ pressed }) => [
          styles.fabBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Shared Bottom Navigation (Screen 1 only) */}
      {renderBottomNav?.()}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 2: Add Staff (Create)
// ─────────────────────────────────────────────────────────────
interface Screen2Props {
  onBack: () => void;
  onSave: (newStaff: StaffMember) => void;
  isSaving?: boolean;
}

function Screen2AddStaff({ onBack, onSave, isSaving = false }: Screen2Props) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("PHM");
  const [zone, setZone] = useState<string>("Buttala");
  const [phone, setPhone] = useState("+94 ");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateAndSubmit = () => {
    const errs: { [key: string]: string } = {};
    if (!fullName.trim()) {
      errs.fullName = "Please enter staff full name";
    }
    if (!phone.trim() || phone.trim() === "+94") {
      errs.phone = "Please enter contact phone number";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const avatarColors = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#06B6D4"];
    const randomBg = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const createdMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: fullName.trim(),
      role,
      zone,
      phone: phone.trim(),
      email: email.trim() || undefined,
      active: isActive,
      dateJoined: "Oct 2026",
      avatarBg: randomBg,
      activities: [
        {
          id: `act-${Date.now()}`,
          icon: "person-add",
          title: `Account registered as ${role}`,
          time: "Just now",
          type: "success",
        },
        {
          id: `act-${Date.now() + 1}`,
          icon: "location",
          title: `Assigned to ${zone} zone`,
          time: "Just now",
          type: "primary",
        },
      ],
    };

    onSave(createdMember);
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.appBarContent}>
            <Pressable onPress={onBack} style={styles.appBarBackBtn}>
              <Ionicons name="arrow-back" size={22} color={TEXT_MAIN} />
            </Pressable>
            <Text style={styles.appBarTitle}>Add Staff Member</Text>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* Form Fields ScrollView */}
      <ScrollView
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* 1. Full Name */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>
              Full Name <Text style={{ color: DANGER }}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={TEXT_MUTED}
                style={styles.inputFieldIcon}
              />
              <TextInput
                placeholder="e.g. Chandani Rathnapala"
                placeholderTextColor={TEXT_LIGHT}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors({ ...errors, fullName: "" });
                }}
                style={styles.textInput}
              />
            </View>
            {errors.fullName ? (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            ) : null}
          </View>

          {/* 2. Role Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Role (Designation)</Text>
            <View style={styles.pillsRow}>
              {ROLES_LIST.map((r) => {
                const isSel = role === r;
                const rStyle = getRoleBadgeStyle(r);
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.roleOptionPill,
                      isSel && {
                        backgroundColor: rStyle.bg,
                        borderColor: rStyle.text,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        isSel && { color: rStyle.text, fontWeight: "700" },
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3. Assigned Zone */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Assigned Zone</Text>
            <View style={styles.zonePillsGrid}>
              {ZONES_LIST.map((z) => {
                const isSel = zone === z;
                return (
                  <Pressable
                    key={z}
                    onPress={() => setZone(z)}
                    style={[
                      styles.zoneOptionPill,
                      isSel && styles.zoneOptionPillActive,
                    ]}
                  >
                    <Ionicons
                      name="location"
                      size={14}
                      color={isSel ? "#FFFFFF" : PRIMARY}
                    />
                    <Text
                      style={[
                        styles.zoneOptionText,
                        isSel && styles.zoneOptionTextActive,
                      ]}
                    >
                      {z}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Phone Number */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>
              Phone Number <Text style={{ color: DANGER }}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={18}
                color={TEXT_MUTED}
                style={styles.inputFieldIcon}
              />
              <TextInput
                placeholder="+94 7X XXX XXXX"
                placeholderTextColor={TEXT_LIGHT}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) setErrors({ ...errors, phone: "" });
                }}
                style={styles.textInput}
              />
            </View>
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          {/* 5. Email (Optional) */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={TEXT_MUTED}
                style={styles.inputFieldIcon}
              />
              <TextInput
                placeholder="staff.name@health.gov.lk"
                placeholderTextColor={TEXT_LIGHT}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* 6. Status Toggle Switch */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.toggleTitle}>Account Status</Text>
              <Text style={styles.toggleSubtitle}>
                {isActive
                  ? "Active — Available for clinic & home visit assignments"
                  : "Inactive — Excluded from new duty schedules"}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#CBD5E1", true: PRIMARY }}
              thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
            />
          </View>
        </View>

        {/* Primary Save Button */}
        <Pressable
          onPress={validateAndSubmit}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.primaryButton,
            isSaving && { opacity: 0.7 },
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving to Database..." : "Save Staff Member"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 3: Staff Detail / Edit (Read + Update)
// ─────────────────────────────────────────────────────────────
interface Screen3Props {
  staff: StaffMember;
  isEditing: boolean;
  onToggleEdit: () => void;
  onBack: () => void;
  onSave: (updated: StaffMember) => void;
  onDeactivatePress: () => void;
  onReactivatePress: () => void;
  onResendCredentials?: (staff: StaffMember) => void;
}

function Screen3StaffDetail({
  staff,
  isEditing,
  onToggleEdit,
  onBack,
  onSave,
  onDeactivatePress,
  onReactivatePress,
  onResendCredentials,
}: Screen3Props) {
  // Local edit states
  const [name, setName] = useState(staff.name);
  const [role, setRole] = useState<StaffRole>(staff.role);
  const [zone, setZone] = useState(staff.zone);
  const [phone, setPhone] = useState(staff.phone);
  const [email, setEmail] = useState(staff.email || "");

  const roleStyle = getRoleBadgeStyle(staff.role);

  const handleCommitChanges = () => {
    onSave({
      ...staff,
      name: name.trim() || staff.name,
      role,
      zone,
      phone: phone.trim() || staff.phone,
      email: email.trim() || undefined,
    });
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.appBarContent}>
            <Pressable onPress={onBack} style={styles.appBarBackBtn}>
              <Ionicons name="arrow-back" size={22} color={TEXT_MAIN} />
            </Pressable>
            <Text style={styles.appBarTitle}>
              {isEditing ? "Edit Staff Details" : "Staff Profile"}
            </Text>
            {/* Edit / Done Action Button */}
            <Pressable
              onPress={isEditing ? onToggleEdit : onToggleEdit}
              style={styles.editToggleBtn}
            >
              <Ionicons
                name={isEditing ? "close-outline" : "pencil-sharp"}
                size={16}
                color={PRIMARY}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.editToggleText}>
                {isEditing ? "Cancel" : "Edit"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.detailScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block: Large Avatar & Name & Pills */}
        <View style={styles.detailHeaderCard}>
          <View
            style={[
              styles.detailLargeAvatar,
              { backgroundColor: staff.avatarBg || PRIMARY },
            ]}
          >
            <Text style={styles.detailAvatarInitials}>
              {getInitials(name)}
            </Text>
          </View>

          <Text style={styles.detailStaffName}>{name}</Text>

          {/* Role Badge and Zone Pills Row */}
          <View style={styles.detailPillsRow}>
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: roleStyle.bg,
                  borderColor: roleStyle.border,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  { color: roleStyle.text, fontSize: 12 },
                ]}
              >
                {role}
              </Text>
            </View>

            <View style={styles.zonePill}>
              <Ionicons
                name="location-outline"
                size={13}
                color={TEXT_MUTED}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.zonePillText}>{zone} Zone</Text>
            </View>

            {/* Status Indicator */}
            <View
              style={[
                styles.detailStatusPill,
                staff.active
                  ? styles.detailStatusActive
                  : styles.detailStatusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  staff.active
                    ? styles.statusDotActive
                    : styles.statusDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.statusLabelText,
                  staff.active
                    ? styles.statusLabelActive
                    : styles.statusLabelInactive,
                ]}
              >
                {staff.active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card: Read-only or Editable fields */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeaderTitle}>CONTACT & ASSIGNMENT</Text>

          {isEditing ? (
            /* Editable Mode */
            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.editFieldLabel}>Full Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.editTextInput}
                />
              </View>

              <View>
                <Text style={styles.editFieldLabel}>Role</Text>
                <View style={styles.pillsRow}>
                  {ROLES_LIST.map((r) => {
                    const isSel = role === r;
                    const rStyle = getRoleBadgeStyle(r);
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setRole(r)}
                        style={[
                          styles.roleOptionPill,
                          isSel && {
                            backgroundColor: rStyle.bg,
                            borderColor: rStyle.text,
                            borderWidth: 1.5,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            isSel && { color: rStyle.text, fontWeight: "700" },
                          ]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.editFieldLabel}>Zone</Text>
                <View style={styles.pillsRow}>
                  {ZONES_LIST.map((z) => {
                    const isSel = zone === z;
                    return (
                      <Pressable
                        key={z}
                        onPress={() => setZone(z)}
                        style={[
                          styles.roleOptionPill,
                          isSel && {
                            backgroundColor: PRIMARY_LIGHT,
                            borderColor: PRIMARY,
                            borderWidth: 1.5,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            isSel && { color: PRIMARY, fontWeight: "700" },
                          ]}
                        >
                          {z}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.editFieldLabel}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={styles.editTextInput}
                />
              </View>

              <View>
                <Text style={styles.editFieldLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.editTextInput}
                />
              </View>
            </View>
          ) : (
            /* Read-only Mode */
            <View style={styles.readOnlyList}>
              {/* Phone */}
              <View style={styles.readOnlyRow}>
                <View style={styles.readOnlyIconBox}>
                  <Ionicons name="call" size={17} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyLabel}>Phone Number</Text>
                  <Text style={styles.readOnlyValue}>{staff.phone}</Text>
                </View>
              </View>

              {/* Email */}
              <View style={styles.readOnlyRow}>
                <View style={styles.readOnlyIconBox}>
                  <Ionicons name="mail" size={17} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyLabel}>Email Address</Text>
                  <Text style={styles.readOnlyValue}>
                    {staff.email || "Not specified"}
                  </Text>
                </View>
              </View>

              {/* Zone */}
              <View style={styles.readOnlyRow}>
                <View style={styles.readOnlyIconBox}>
                  <Ionicons name="location" size={17} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyLabel}>Designated Zone</Text>
                  <Text style={styles.readOnlyValue}>
                    {staff.zone} Field Area
                  </Text>
                </View>
              </View>

              {/* Role */}
              <View style={styles.readOnlyRow}>
                <View style={styles.readOnlyIconBox}>
                  <Ionicons name="shield-checkmark" size={17} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyLabel}>Official Role</Text>
                  <Text style={styles.readOnlyValue}>{staff.role}</Text>
                </View>
              </View>

              {/* Date Joined */}
              <View style={[styles.readOnlyRow, { borderBottomWidth: 0 }]}>
                <View style={styles.readOnlyIconBox}>
                  <Ionicons name="calendar" size={17} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyLabel}>Service Joined</Text>
                  <Text style={styles.readOnlyValue}>{staff.dateJoined}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Activity Section: Reusing MOH Dashboard Recent Activity Style */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionHeaderTitle}>RECENT ACTIVITY</Text>
          <View style={styles.activityCard}>
            {staff.activities && staff.activities.length > 0 ? (
              staff.activities.map((act, index) => {
                const isLast = index === staff.activities.length - 1;
                let circleBg = PRIMARY_LIGHT;
                let iconColor = PRIMARY;

                if (act.type === "danger") {
                  circleBg = DANGER_BG;
                  iconColor = DANGER;
                } else if (act.type === "warning") {
                  circleBg = WARNING_BG;
                  iconColor = WARNING;
                } else if (act.type === "success") {
                  circleBg = SUCCESS_BG;
                  iconColor = SUCCESS;
                }

                return (
                  <View
                    key={act.id}
                    style={[
                      styles.activityRow,
                      isLast && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View
                      style={[
                        styles.activityIconCircle,
                        { backgroundColor: circleBg },
                      ]}
                    >
                      <Ionicons name={act.icon} size={18} color={iconColor} />
                    </View>
                    <View style={styles.activityTextCol}>
                      <Text style={styles.activityTitleText}>{act.title}</Text>
                      <Text style={styles.activityTimeText}>{act.time}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={styles.emptyActivityText}>
                  No recent logged activities
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.detailActionsBlock}>
          {isEditing ? (
            <View style={{ gap: 8 }}>
              <Pressable onPress={onToggleEdit} style={styles.cancelLinkBtn}>
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleCommitChanges}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name="save-outline"
                  size={19}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              </Pressable>
            </View>
          ) : staff.active ? (
            <>
              {staff.email ? (
                <Pressable
                  onPress={() => onResendCredentials?.(staff)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: PRIMARY_LIGHT,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: PRIMARY,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={PRIMARY}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.primaryButtonText, { color: PRIMARY }]}>
                    Resend Onboarding Credentials
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onDeactivatePress}
                style={({ pressed }) => [
                  styles.deactivateBtn,
                  pressed && { backgroundColor: DANGER_BG, opacity: 0.8 },
                ]}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={18}
                  color={DANGER}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.deactivateBtnText}>Deactivate Account</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onReactivatePress}
              style={({ pressed }) => [
                styles.reactivateBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.reactivateBtnText}>Reactivate Account</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCREEN 4: Deactivate Confirmation (Delete — soft delete)
// ─────────────────────────────────────────────────────────────
interface Screen4ModalProps {
  visible: boolean;
  staffName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function Screen4DeactivateModal({
  visible,
  staffName,
  onCancel,
  onConfirm,
}: Screen4ModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Centered Red Warning Icon Circle */}
          <View style={styles.modalWarningIconBox}>
            <Ionicons name="alert" size={32} color={DANGER} />
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>Deactivate {staffName}?</Text>

          {/* Body Text */}
          <Text style={styles.modalBodyText}>
            They will no longer be assigned new visits or appear in active zone
            lists. Their past records will be kept.
          </Text>

          {/* Two Buttons Side by Side */}
          <View style={styles.modalActionsRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.modalCancelBtn,
                pressed && { backgroundColor: "#F1F5F9" },
              ]}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.modalDeactivateBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.modalDeactivateBtnText}>Deactivate</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter Picker Modal (Role or Zone selection sheet)
// ─────────────────────────────────────────────────────────────
function FilterPickerModal({
  type,
  currentRole,
  currentZone,
  onSelectRole,
  onSelectZone,
  onClose,
}: {
  type: "role" | "zone" | null;
  currentRole: string;
  currentZone: string;
  onSelectRole: (role: string) => void;
  onSelectZone: (zone: string) => void;
  onClose: () => void;
}) {
  if (!type) return null;

  const isRole = type === "role";
  const title = isRole ? "Select Staff Role" : "Select Health Zone";
  const options = isRole
    ? ["All Roles", ...ROLES_LIST]
    : ["All Zones", ...ZONES_LIST];
  const selected = isRole ? currentRole : currentZone;

  return (
    <Modal transparent animationType="slide" visible={!!type} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>

          <View style={{ gap: 8, marginTop: 12 }}>
            {options.map((opt) => {
              const isSel = selected === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => (isRole ? onSelectRole(opt) : onSelectZone(opt))}
                  style={[
                    styles.sheetOptionRow,
                    isSel && styles.sheetOptionRowActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetOptionText,
                      isSel && styles.sheetOptionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSel && (
                    <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  screenWrapper: {
    flex: 1,
  },

  // Toast
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  toastIconBox: {
    marginRight: 10,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Screen 1 Header & Segmented Control
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  segmentedControlContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderRadius: 24,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 20,
  },
  segmentTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
  },
  segmentTabTextActive: {
    color: PRIMARY,
  },

  // Screen 1 List Content
  listScrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_MAIN,
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  filterChipSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_TINT,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  filterChipTextSelected: {
    color: PRIMARY,
  },
  clearFilterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
  },
  countSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  countSummaryText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  countSummaryActive: {
    fontSize: 12,
    fontWeight: "700",
    color: SUCCESS_TEXT,
  },

  // Staff Card (White, Rounded 18px, Shadow)
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  staffCardInactive: {
    opacity: 0.6,
    backgroundColor: "#F8FAFC",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  staffCardMiddle: {
    flex: 1,
  },
  staffCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  staffNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  staffNameInactive: {
    color: TEXT_MUTED,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  staffZoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  staffZoneText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  staffCardRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotActive: {
    backgroundColor: SUCCESS,
  },
  statusDotInactive: {
    backgroundColor: TEXT_LIGHT,
    borderWidth: 1,
    borderColor: TEXT_MUTED,
  },
  statusLabelText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusLabelActive: {
    color: SUCCESS_TEXT,
  },
  statusLabelInactive: {
    color: TEXT_MUTED,
  },

  // FAB
  fabBtn: {
    position: "absolute",
    bottom: 92,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 100,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  // Screen 2 / 3 Top App Bar
  topAppBar: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  appBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  appBarBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_MAIN,
    textAlign: "center",
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },

  // Form Styles (Screen 2)
  formScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFieldIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: TEXT_MAIN,
    padding: 0,
  },
  errorText: {
    fontSize: 11.5,
    color: DANGER,
    marginTop: 4,
    fontWeight: "600",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleOptionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  zonePillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  zoneOptionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  zoneOptionPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  zoneOptionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  zoneOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  toggleSubtitle: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // Screen 3 Staff Detail Styles
  detailScrollContent: {
    padding: 16,
    paddingBottom: 70,
  },
  detailHeaderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  detailLargeAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  detailAvatarInitials: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  detailStaffName: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_MAIN,
    marginBottom: 8,
    textAlign: "center",
  },
  detailPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  zonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zonePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  detailStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailStatusActive: {
    backgroundColor: SUCCESS_BG,
  },
  detailStatusInactive: {
    backgroundColor: "#E2E8F0",
  },

  // Info Card (Screen 3)
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  readOnlyList: {
    gap: 2,
  },
  readOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  readOnlyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  readOnlyLabel: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  readOnlyValue: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginTop: 1,
  },
  editFieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  editTextInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: TEXT_MAIN,
  },

  // Activity Section (Screen 3)
  activitySection: {
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityTextCol: {
    flex: 1,
  },
  activityTitleText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  activityTimeText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  emptyActivityText: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  // Detail Actions
  detailActionsBlock: {
    marginTop: 6,
  },
  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: DANGER,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: "#FEF2F2",
  },
  deactivateBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: DANGER,
  },
  reactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS,
    borderRadius: 16,
    paddingVertical: 14,
  },
  reactivateBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cancelLinkBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },

  // Screen 4 Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalWarningIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DANGER_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_MAIN,
    textAlign: "center",
    marginBottom: 8,
  },
  modalBodyText: {
    fontSize: 13.5,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  modalDeactivateBtn: {
    flex: 1,
    backgroundColor: DANGER,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DANGER,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  modalDeactivateBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Sheet Modal
  sheetCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_MAIN,
    textAlign: "center",
    marginBottom: 6,
  },
  sheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  sheetOptionRowActive: {
    backgroundColor: PRIMARY_LIGHT,
  },
  sheetOptionText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: TEXT_MAIN,
  },
  sheetOptionTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },
  sheetCloseBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetCloseText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
});
