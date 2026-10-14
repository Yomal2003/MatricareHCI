/**
 * Shared MOH State Components
 * Skeletons, Error states with Retry, and Empty states matching the purple #7B4FE0 design system.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getApiBaseUrl, setCustomApiUrl, testApiConnection } from "../api/client";

const PRIMARY = "#7B4FE0";
const TEXT_MAIN = "#1E293B";
const TEXT_MUTED = "#64748B";

/**
 * Animated Skeleton Shimmer Box
 */
export function SkeletonBox({ width, height, borderRadius = 8, style }: { width?: number | string; height?: number | string; borderRadius?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width || "100%",
          height: height || 16,
          borderRadius,
          backgroundColor: "#E2E8F0",
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Dashboard Skeleton Loader
 */
export function DashboardSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.grid2x2}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonKpiCard}>
            <SkeletonBox width={80} height={14} borderRadius={4} />
            <SkeletonBox width={50} height={10} borderRadius={4} style={{ marginTop: 8 }} />
            <SkeletonBox width="100%" height={24} borderRadius={6} style={{ marginTop: 14 }} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonCard}>
        <SkeletonBox width={140} height={16} borderRadius={4} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ alignItems: "center", width: 44 }}>
              <SkeletonBox width={32} height={80} borderRadius={6} />
              <SkeletonBox width={36} height={10} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.skeletonCard}>
        <SkeletonBox width={120} height={16} borderRadius={4} />
        <SkeletonBox width="100%" height={40} borderRadius={8} style={{ marginTop: 12 }} />
        <SkeletonBox width="100%" height={40} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * Modal to configure and test the backend Server URL on physical devices
 */
export function ServerConfigModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (savedUrl: string) => void;
}) {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(getApiBaseUrl());
      setTestResult(null);
    }
  }, [visible]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testApiConnection(url.trim());
    setTesting(false);
    if (res.ok) {
      setTestResult({ ok: true, message: "Connected! Backend API reachable (200 OK)." });
    } else {
      setTestResult({
        ok: false,
        message: `Failed to connect: ${res.error || "Server unreachable"}`,
      });
    }
  };

  const handleSave = async () => {
    const cleaned = url.trim().replace(/\/+$/, "");
    await setCustomApiUrl(cleaned || null);
    onSave(cleaned);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Server Configuration</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={TEXT_MUTED} />
            </Pressable>
          </View>

          <Text style={styles.modalLabel}>API Backend Base URL</Text>
          <TextInput
            style={styles.urlInput}
            value={url}
            onChangeText={(txt) => {
              setUrl(txt);
              setTestResult(null);
            }}
            placeholder="http://10.56.15.217:4000"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.presetsRow}>
            <Text style={styles.presetsLabel}>Presets:</Text>
            <Pressable
              style={styles.presetChip}
              onPress={() => setUrl("http://10.56.15.217:4000")}
            >
              <Text style={styles.presetChipText}>PC Wi-Fi (10.56.15.217)</Text>
            </Pressable>
            <Pressable
              style={styles.presetChip}
              onPress={() => setUrl("http://10.0.2.2:4000")}
            >
              <Text style={styles.presetChipText}>Emulator</Text>
            </Pressable>
          </View>

          <Text style={styles.modalHelp}>
            If using a physical phone on mobile LTE, please connect to the same Wi-Fi network as your computer, or enter your tunnel URL.
          </Text>

          {testResult && (
            <View
              style={[
                styles.testResultBox,
                { backgroundColor: testResult.ok ? "#DCFCE7" : "#FEE2E2" },
              ]}
            >
              <Ionicons
                name={testResult.ok ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={testResult.ok ? "#16A34A" : "#DC2626"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.testResultText,
                  { color: testResult.ok ? "#15803D" : "#B91C1C" },
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          )}

          <View style={styles.modalActions}>
            <Pressable
              onPress={handleTest}
              disabled={testing}
              style={[styles.testBtn, testing && { opacity: 0.6 }]}
            >
              {testing ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={16} color={PRIMARY} style={{ marginRight: 4 }} />
                  <Text style={styles.testBtnText}>Test</Text>
                </>
              )}
            </Pressable>

            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save & Connect</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Full-width Error Card with Retry Button and Server Configuration
 */
export function ErrorState({
  message = "Failed to load data from server.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const currentUrl = getApiBaseUrl();

  const isNetworkError =
    message.toLowerCase().includes("canceled") ||
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("fetch failed");

  return (
    <View style={styles.errorCard}>
      <View style={styles.errorIconCircle}>
        <Ionicons name="alert-circle-outline" size={26} color="#EF4444" />
      </View>
      <Text style={styles.errorTitle}>Connection Problem</Text>
      <Text style={styles.errorMsg}>{message}</Text>

      <View style={styles.serverInfoPill}>
        <Ionicons name="server-outline" size={13} color={TEXT_MUTED} style={{ marginRight: 5 }} />
        <Text style={styles.serverInfoText} numberOfLines={1}>
          Server: {currentUrl}
        </Text>
      </View>

      {isNetworkError && (
        <Text style={styles.networkHintText}>
          If your phone is on LTE mobile data, please connect to the same Wi-Fi as your computer, or configure the server URL.
        </Text>
      )}

      <View style={styles.errorBtnGroup}>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => setShowConfigModal(true)}
          style={({ pressed }) => [
            styles.configServerBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Ionicons name="settings-outline" size={15} color={PRIMARY} style={{ marginRight: 5 }} />
          <Text style={styles.configServerBtnText}>Configure Server</Text>
        </Pressable>
      </View>

      <ServerConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={() => {
          if (onRetry) onRetry();
        }}
      />
    </View>
  );
}

/**
 * Clean Empty State Card
 */
export function EmptyState({
  icon = "folder-open-outline",
  title = "No data yet",
  description,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={28} color={PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptySub}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyActionBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.emptyActionBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  skeletonKpiCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    height: 120,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    margin: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_MAIN,
    marginBottom: 4,
  },
  errorMsg: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  serverInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  serverInfoText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  networkHintText: {
    fontSize: 12,
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 16,
  },
  errorBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  configServerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  configServerBtnText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  urlInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: TEXT_MAIN,
    backgroundColor: "#F8FAFC",
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  presetsLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  presetChip: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetChipText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: "600",
  },
  modalHelp: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 10,
    lineHeight: 15,
  },
  testResultBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MAIN,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 14,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
