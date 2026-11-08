import { apiFetch } from "./client";
import { saveTokens } from "@/lib/auth/tokens";
import type { AuthTokens, User } from "@/types";

export async function login(username: string, password: string) {
  const tokens = await apiFetch<AuthTokens>("/auth/token/", { method: "POST", body: JSON.stringify({ username, password }) });
  saveTokens(tokens);
  return tokens;
}

export function register(username: string, email: string, password: string) {
  return apiFetch<User>("/users/register/", { method: "POST", body: JSON.stringify({ username, email, password }) });
}

export function getCurrentUser() { return apiFetch<User>("/users/me/"); }
