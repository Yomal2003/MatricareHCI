import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

let customApiUrl: string | null = null;
const CUSTOM_URL_KEY = "matricare.customApiUrl";

// Hydrate cached customApiUrl from storage
AsyncStorage.getItem(CUSTOM_URL_KEY)
  .then((stored) => {
    if (stored) customApiUrl = stored.trim().replace(/\/+$/, "");
  })
  .catch(() => {});

export function setCustomApiUrl(url: string | null): Promise<void> {
  customApiUrl = url ? url.trim().replace(/\/+$/, "") : null;
  if (customApiUrl) {
    return AsyncStorage.setItem(CUSTOM_URL_KEY, customApiUrl).catch(() => {});
  } else {
    return AsyncStorage.removeItem(CUSTOM_URL_KEY).catch(() => {});
  }
}

export function getCustomApiUrl(): string | null {
  return customApiUrl;
}

export function getApiBaseUrl(): string {
  // 0. Explicit user-configured URL overrides all auto-detection
  if (customApiUrl) {
    return customApiUrl;
  }

  // 1. Web browser: connect to backend on same host as webpage (e.g., localhost or LAN IP)
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:4000`;
    }
    return "http://localhost:4000";
  }

  // 2. Native mobile (Expo Go): connect to backend host using Expo bundler IP ONLY if it is an IPv4 address
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const rawHost = hostUri.split(":")[0];
    // Check if rawHost is an IPv4 address (e.g. 10.x.x.x, 192.168.x.x, 172.x.x.x).
    // NEVER attach :4000 to tunnel hostnames (e.g. *.exp.direct or *.ngrok.app) as they only tunnel port 8081.
    const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(rawHost);
    if (isIpv4) {
      return `http://${rawHost}:4000`;
    }
  }

  // 3. Configured via app.json
  const configured = (Constants.expoConfig?.extra as any)?.apiUrl;
  if (
    configured &&
    !configured.includes("192.168.8.131") &&
    !configured.includes("192.168.8.198")
  ) {
    return configured;
  }

  return "http://10.56.15.217:4000";
}

export async function testApiConnection(url?: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const target = (url || getApiBaseUrl()).replace(/\/+$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${target}/health`, { signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Connection failed" };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const API_URL: string = getApiBaseUrl();
if (__DEV__) console.info(`[MatriCare] API base URL: ${API_URL}`);

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
  if (t) {
    AsyncStorage.setItem("matricare.token", t).catch(() => {});
  } else {
    AsyncStorage.removeItem("matricare.token").catch(() => {});
  }
};
export const getToken = () => token;

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  // If token is missing and accessing protected mother endpoints in dev, auto-fetch demo mother token
  if (!token && (path.startsWith("/me") || path.startsWith("/family-member"))) {
    try {
      const authRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "mother" }),
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData?.token) {
          setToken(authData.token);
        }
      }
    } catch {
      // Continue and let standard fetch handle or report error
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
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
  const response = await api<{ accepted?: number; results?: Array<{ localId?: string; status: string }> }>('/records/batch', { method: 'POST', body: { items: list } });
  const failedIds = new Set((response.results || []).filter((result) => result.status === 'error').map((result) => result.localId));
  const remaining = list.filter((item) => failedIds.has(item.localId));
  await AsyncStorage.setItem(QKEY, JSON.stringify(remaining));
  return list.length - remaining.length;
}
