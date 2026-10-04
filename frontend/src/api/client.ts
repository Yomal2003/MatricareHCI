import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Set this to your computer's LAN IP in app.json -> expo.extra.apiUrl (Expo Go can't reach "localhost").
export const API_URL: string = (Constants.expoConfig?.extra as any)?.apiUrl ?? "http://192.168.1.10:4000";

let token: string | null = null;
export const setToken = (t: string | null) => (token = t);

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error ?? ""}`);
  return res.json();
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
