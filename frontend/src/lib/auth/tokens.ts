import type { AuthTokens } from "@/types";

const ACCESS_TOKEN_KEY = "studybuddy_access_token";
const REFRESH_TOKEN_KEY = "studybuddy_refresh_token";

export function saveTokens(tokens: AuthTokens, remember = true) {
  if (typeof window === "undefined") return;
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
  target.setItem(ACCESS_TOKEN_KEY, tokens.access);
  target.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function updateAccessToken(access: string) {
  if (typeof window === "undefined") return;
  const target = sessionStorage.getItem(REFRESH_TOKEN_KEY) ? sessionStorage : localStorage;
  target.setItem(ACCESS_TOKEN_KEY, access);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
