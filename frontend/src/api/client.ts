import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export function getApiBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra as any)?.apiUrl;
  if (configured) return configured;

  return "http://192.168.8.131:4000";
}

export const API_URL: string = getApiBaseUrl();
if (__DEV__) console.info(`[MatriCare] API base URL: ${API_URL}`);

let token: string | null = null;
export const setToken = (t: string | null) => (token = t);

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
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
