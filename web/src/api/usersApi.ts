import { api } from "./httpClient";
import type { AuthUser, InviteCode } from "@/types/models";

// GET /api/users
export async function listUsers(): Promise<AuthUser[]> {
  return api.get<AuthUser[]>("/api/users");
}

// DELETE /api/users/{id}
export async function removeUser(id: string): Promise<AuthUser[]> {
  return api.delete<AuthUser[]>(`/api/users/${id}`);
}

// GET /api/users/invites
export async function listInvites(): Promise<InviteCode[]> {
  return api.get<InviteCode[]>("/api/users/invites");
}

// POST /api/users/invites
export async function createInvite(): Promise<InviteCode> {
  return api.post<InviteCode>("/api/users/invites");
}

// DELETE /api/users/invites/{code}
export async function revokeInvite(code: string): Promise<InviteCode[]> {
  return api.delete<InviteCode[]>(`/api/users/invites/${code}`);
}
