import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

export function getApiBaseUrl(): string {
  if (Platform.OS === "web") {
    return "http://localhost:4000";
  }

  // 1. Try to extract IP directly from Metro / Expo Go host
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:4000`;
    }
  }

  // 2. Extra apiUrl in app.json
  const configured = (Constants.expoConfig?.extra as any)?.apiUrl;
  if (configured) return configured;

  // 3. Fallback to current computer IP
  return "http://172.20.10.3:4000";
}

export const API_URL: string = getApiBaseUrl();

let token: string | null = null;
export const setToken = (t: string | null) => (token = t);

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10000);

  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`${res.status} ${errData.error || ""}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export type HealthRecordType = "visit" | "immunization" | "growth";
export type HealthRecord = {
  _id: string;
  recordType: HealthRecordType;
  date: string;
  type?: string;
  gestationWeeks?: number | null;
  weight?: number | null;
  bp?: string | null;
  hb?: number | null;
  fetalPosition?: string | null;
  riskFlags?: string[];
  notes?: string | null;
  vaccine?: string;
  dose?: number | null;
  batch?: string;
  height?: number | null;
  muac?: number | null;
  mother: { _id: string; code: string; name: string; village?: string };
  child?: { _id: string; code?: string; name?: string };
};

export const getMotherRecords = (motherId: string) =>
  api<HealthRecord[]>(`/records?motherId=${encodeURIComponent(motherId)}`);

export const updateHealthRecord = (
  recordType: HealthRecordType,
  id: string,
  fields: Record<string, unknown>,
) =>
  api<HealthRecord>(`/records/${recordType}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: fields,
  });

export const deleteHealthRecord = (recordType: HealthRecordType, id: string) =>
  api<{ deleted: boolean; id: string; recordType: HealthRecordType }>(
    `/records/${recordType}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

// ---- Offline queue: entries are saved locally and pushed when back online ----
const QKEY = "matricare.pending";
export async function getPending(): Promise<any[]> {
  return JSON.parse((await AsyncStorage.getItem(QKEY)) ?? "[]");
}
export async function queueRecord(rec: Record<string, unknown>) {
  const list = await getPending();
  list.push({ ...rec, localId: Date.now().toString(), createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(QKEY, JSON.stringify(list));
  return list.length;
}
export async function flushPending(): Promise<number> {
  const list = await getPending();
  if (!list.length) return 0;
  await api("/records/batch", { method: "POST", body: { items: list } });
  await AsyncStorage.setItem(QKEY, "[]");
  return list.length;
}
