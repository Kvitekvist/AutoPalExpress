import { api } from "./httpClient";
import type { AuthUser, AuthStatus } from "@/types/models";

// GET /api/auth/status
export async function getStatus(): Promise<AuthStatus> {
  return api.get<AuthStatus>("/api/auth/status");
}

// GET /api/auth/me
export async function me(): Promise<AuthUser> {
  return api.get<AuthUser>("/api/auth/me");
}

// POST /api/auth/setup
export async function setup(username: string, password: string): Promise<AuthUser> {
  return api.post<AuthUser>("/api/auth/setup", { username, password });
}

// POST /api/auth/register
export async function register(username: string, password: string, inviteCode: string): Promise<AuthUser> {
  return api.post<AuthUser>("/api/auth/register", { username, password, inviteCode });
}

// POST /api/auth/login
export async function login(username: string, password: string): Promise<AuthUser> {
  return api.post<AuthUser>("/api/auth/login", { username, password });
}

// POST /api/auth/logout
export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

// PATCH /api/auth/me/language
export async function setLanguage(language: string): Promise<AuthUser> {
  return api.patch<AuthUser>("/api/auth/me/language", { language });
}
