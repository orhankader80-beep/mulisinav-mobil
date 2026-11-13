import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";

import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/m`;
const ACCESS_KEY = "muli_access_token";
const REFRESH_KEY = "muli_refresh_token";

export type User = { user_id: string; email: string; name: string; picture?: string | null };
export type AuthResponse = { user: User; access_token?: string; refresh_token?: string };

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export const setAuthLostHandler = (fn: (() => void) | null) => {
  onAuthLost = fn;
};

export async function loadTokens() {
  accessToken = await storage.secureGet(ACCESS_KEY, null);
  refreshToken = await storage.secureGet(REFRESH_KEY, null);
  return !!(accessToken || refreshToken);
}

export async function saveTokens(r: AuthResponse) {
  if (r.access_token) {
    accessToken = r.access_token;
    await storage.secureSet(ACCESS_KEY, r.access_token);
  }
  if (r.refresh_token) {
    refreshToken = r.refresh_token;
    await storage.secureSet(REFRESH_KEY, r.refresh_token);
  }
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await storage.secureRemove(ACCESS_KEY);
  await storage.secureRemove(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const errText = (detail: unknown, fallback = "Bir şeyler ters gitti, tekrar dene."): string => {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return "Lütfen bilgilerini kontrol et.";
  const msg = (detail as { msg?: unknown }).msg;
  return typeof msg === "string" ? msg : fallback;
};

const headers = () => ({
  "Content-Type": "application/json",
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

async function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE}/session/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthResponse;
    await saveTokens(data);
    return data;
  } catch {
    return null;
  }
}

type Opts = { method?: string; body?: unknown };

export async function api<T>(path: string, opts: Opts = {}, retry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? "GET",
      headers: headers(),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("İnternet bağlantını kontrol et.", 0);
  }
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, opts, false);
    await clearTokens();
    onAuthLost?.();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(errText((data as { detail?: unknown })?.detail), res.status);
  return data as T;
}

// ---- Auth -----------------------------------------------------------------

export async function authenticate(mode: "login" | "register", body: Record<string, string>) {
  const data = await api<AuthResponse>(`/auth/${mode}`, { method: "POST", body });
  await saveTokens(data);
  return data.user;
}

export async function restoreSession(): Promise<User | null> {
  const has = await loadTokens();
  if (!has) return null;
  try {
    return await api<User>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 0) throw e;
    const refreshed = await refreshSession();
    if (refreshed) return refreshed.user;
    await clearTokens();
    return null;
  }
}

export async function logout() {
  try {
    await fetch(`${BASE}/session/logout`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // tokens are cleared locally anyway
  }
  await clearTokens();
}

// ---- Exam generation (streamed) ------------------------------------------------

export type GenerateForm = { grade: number; subject: string; topic: string; difficulty: string; qtype: string };

const streamFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
  Platform.OS === "web" ? fetch(url, init) : (expoFetch(url, init) as unknown as Promise<Response>);

export async function generateExam(form: GenerateForm, onProgress: (questions: number) => void, retry = true): Promise<string> {
  let res: Response;
  try {
    res = await streamFetch(`${BASE}/generate`, { method: "POST", headers: headers(), body: JSON.stringify(form) });
  } catch {
    throw new ApiError("İnternet bağlantını kontrol et.", 0);
  }
  if (res.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) return generateExam(form, onProgress, false);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(errText((err as { detail?: unknown })?.detail), res.status);
  }
  let text = "";
  let examId: string | null = null;
  const handle = (chunk: string) => {
    const line = chunk.replace(/^data: /, "").trim();
    if (!line || line === "[DONE]") return;
    const msg = JSON.parse(line);
    if (msg.error) throw new ApiError(String(msg.error), 500);
    if (msg.exam_id) examId = msg.exam_id;
    text += msg.t || "";
  };
  const reader = res.body?.getReader();
  if (reader) {
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      parts.forEach(handle);
      onProgress((text.match(/"question"\s*:/g) || []).length);
    }
    if (buf) handle(buf);
  } else {
    (await res.text()).split("\n\n").forEach(handle);
  }
  if (!examId) throw new ApiError("Sorular okunamadı, lütfen tekrar dene.", 500);
  return examId;
}
