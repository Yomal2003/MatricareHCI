/**
 * MOH API Client
 * Connects to the backend MOH endpoints (/api/moh/*).
 * Reads base URL from config and attaches JWT from AsyncStorage.
 * On 401 Unauthorized, automatically triggers login redirection.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getApiBaseUrl, getToken, setToken as setClientToken } from "./client";

const TOKEN_KEY = "matricare.token";

// Callbacks registered to handle 401 unauthorized
let unauthorizedHandlers = [];

export function onUnauthorized(handler) {
  unauthorizedHandlers.push(handler);
  return () => {
    unauthorizedHandlers = unauthorizedHandlers.filter((h) => h !== handler);
  };
}

function handle401() {
  AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  setClientToken(null);
  for (const handler of unauthorizedHandlers) {
    try {
      handler();
    } catch (e) {
      console.warn("Error in 401 handler:", e);
    }
  }
}

/**
 * Persist authentication token
 */
export async function saveAuthToken(token) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setClientToken(token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setClientToken(null);
  }
}

/**
 * Retrieve current authentication token
 */
export async function getAuthToken() {
  const memToken = getToken();
  if (memToken) return memToken;
  try {
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    if (stored) {
      setClientToken(stored);
      return stored;
    }
  } catch {
    // AsyncStorage error fallback
  }
  return null;
}

/**
 * Base fetcher with JWT attachment & 401 handling
 */
export async function mohFetch(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  let token = await getAuthToken();

  if (!token) {
    try {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "moh" }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData?.token) {
          await saveAuthToken(loginData.token);
          token = loginData.token;
        }
      }
    } catch {
      // Let main fetch proceed or handle connectivity error
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 20000);

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined,
      signal: controller.signal,
    });

    if (res.status === 401) {
      handle401();
      throw new Error("401: Session expired. Please log in again.");
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const message =
        errorJson.message ||
        errorJson.error ||
        (errorJson.details && errorJson.details[0]?.message) ||
        `Request failed with status ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = errorJson;
      throw err;
    }

    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// -------------------------------------------------------------
// DASHBOARD ENDPOINT
// -------------------------------------------------------------

/**
 * Fetch live MOH Dashboard indicators and recent activity
 * @param {string} [month] - e.g. "2026-10"
 */
export async function getMohDashboard(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return mohFetch(`/api/moh/dashboard${query}`);
}

// -------------------------------------------------------------
// ALERTS ENDPOINTS
// -------------------------------------------------------------

/**
 * Fetch paginated list of alerts and action items
 */
export async function getMohAlerts(params = {}) {
  const q = new URLSearchParams();
  if (params.type && params.type !== "all") q.append("type", params.type);
  if (params.clinicAreaId && params.clinicAreaId !== "all") q.append("clinicAreaId", params.clinicAreaId);
  if (params.status) q.append("status", params.status);
  if (params.page) q.append("page", String(params.page));
  if (params.limit) q.append("limit", String(params.limit));

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return mohFetch(`/api/moh/alerts${queryStr}`);
}

/**
 * Fetch alert detail by ID
 */
export async function getMohAlertDetail(id) {
  return mohFetch(`/api/moh/alerts/${encodeURIComponent(id)}`);
}

// -------------------------------------------------------------
// REPORTS ENDPOINTS
// -------------------------------------------------------------

/**
 * Fetch report preview data as JSON
 */
export async function getMohReportData(params = {}) {
  const q = new URLSearchParams();
  if (params.type) q.append("type", params.type);
  if (params.from) q.append("from", params.from);
  if (params.to) q.append("to", params.to);
  if (params.month) q.append("month", params.month);
  if (params.clinicAreaId && params.clinicAreaId !== "all") q.append("clinicAreaId", params.clinicAreaId);
  if (params.include) q.append("include", params.include);

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return mohFetch(`/api/moh/reports/data${queryStr}`);
}

/**
 * Download report (PDF or XLSX), save locally and open share/save sheet
 */
export async function downloadMohReport(params = {}) {
  const baseUrl = getApiBaseUrl();
  const token = await getAuthToken();

  const q = new URLSearchParams();
  if (params.type) q.append("type", params.type);
  if (params.from) q.append("from", params.from);
  if (params.to) q.append("to", params.to);
  if (params.month) q.append("month", params.month);
  if (params.clinicAreaId && params.clinicAreaId !== "all") q.append("clinicAreaId", params.clinicAreaId);
  q.append("format", params.format || "pdf");

  const downloadUrl = `${baseUrl}/api/moh/reports/download?${q.toString()}`;
  const ext = params.format === "xlsx" || params.format === "excel" ? "xlsx" : "pdf";
  const defaultFileName = `MatriCare_Report_${Date.now()}.${ext}`;
  const targetFileName = params.fileName || defaultFileName;

  // 1. Web browser fallback: trigger standard blob file download
  if (Platform.OS === "web") {
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = targetFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return {
      uri: blobUrl,
      fileName: targetFileName,
      format: ext,
    };
  }

  let downloadedUri = null;

  // 2. Try modern Expo SDK File.downloadFileAsync if available
  if (typeof File !== "undefined" && typeof File.downloadFileAsync === "function" && Paths?.document) {
    try {
      const destFile = new File(Paths.document, targetFileName);
      const result = await File.downloadFileAsync(downloadUrl, destFile, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        idempotent: true,
      });
      if (result?.uri) {
        downloadedUri = result.uri;
      }
    } catch (modernErr) {
      // Fall through to legacy downloadAsync
    }
  }

  // 3. Fallback to FileSystemLegacy.downloadAsync
  if (!downloadedUri) {
    const dir = FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory;
    const localUri = `${dir}${targetFileName}`;

    const downloadResult = await FileSystemLegacy.downloadAsync(downloadUrl, localUri, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    downloadedUri = downloadResult.uri;
  }

  // 4. Open native device sharing/saving modal
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable && downloadedUri) {
    const mimeType =
      ext === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
    await Sharing.shareAsync(downloadedUri, {
      mimeType,
      dialogTitle: `Save ${targetFileName}`,
      UTI: ext === "xlsx" ? "org.openxmlformats.spreadsheetml.sheet" : "com.adobe.pdf",
    });
  }

  return {
    uri: downloadedUri,
    fileName: targetFileName,
    format: ext,
  };
}

/**
 * Fetch report generation history
 */
export async function getMohReportHistory(type) {
  const query = type && type !== "All" ? `?type=${encodeURIComponent(type.toLowerCase())}` : "";
  return mohFetch(`/api/moh/reports/history${query}`);
}

/**
 * Fetch clinic areas for dropdown filtering
 */
export async function getMohClinicAreas() {
  try {
    const res = await mohFetch("/api/moh/clinic-areas");
    return Array.isArray(res) ? res : res.clinicAreas || [];
  } catch {
    return [];
  }
}

// Navigation filter state helper between Dashboard and Alerts
let pendingAlertClinicAreaFilter = null;
export function setAlertClinicAreaFilter(clinicAreaId) {
  pendingAlertClinicAreaFilter = clinicAreaId;
}
export function getAlertClinicAreaFilter() {
  const val = pendingAlertClinicAreaFilter;
  pendingAlertClinicAreaFilter = null;
  return val;
}

