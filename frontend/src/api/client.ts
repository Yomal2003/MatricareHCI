import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export function getApiBaseUrl(): string {
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
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

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
      const message =
        errData.message ||
        (errData.details && errData.details[0]?.message) ||
        errData.error ||
        res.statusText ||
        "Request failed";
      throw new Error(`${res.status}: ${message}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

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
