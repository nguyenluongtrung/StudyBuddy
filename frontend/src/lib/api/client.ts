import { API_URL } from "@/lib/env";
import { clearTokens, getAccessToken, getRefreshToken, updateAccessToken } from "@/lib/auth/tokens";

let refreshRequest: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshRequest) {
    const refresh = getRefreshToken();
    if (!refresh) return Promise.resolve(null);
    refreshRequest = fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      if (typeof data.access !== "string") return null;
      updateAccessToken(data.access);
      return data.access;
    }).catch(() => null).finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = (token: string | null) => {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };
  let response = await send(getAccessToken());
  if (response.status === 401 && !path.startsWith("/auth/") && getRefreshToken()) {
    const token = await refreshAccessToken();
    if (token) response = await send(token);
    else { clearTokens(); throw new Error("Session expired. Sign in again."); }
  }
  if (response.status === 401 && !path.startsWith("/auth/")) {
    clearTokens();
    throw new Error("Session expired. Sign in again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail ?? Object.values(data ?? {}).flat().join(" ") ?? "Something went wrong";
    throw new Error(message || "Something went wrong");
  }
  return data as T;
}
