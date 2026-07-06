import { delay } from "./client";
import { api } from "./httpClient";
import type { Player } from "@/types/models";

// GET /api/players
export async function getPlayers(): Promise<Player[]> {
  return api.get<Player[]>("/api/players");
}

// POST /api/players/{id}/kick
export async function kickPlayer(id: string): Promise<Player[]> {
  return api.post<Player[]>(`/api/players/${id}/kick`);
}

// POST /api/players/{id}/ban
export async function banPlayer(id: string): Promise<Player[]> {
  return api.post<Player[]>(`/api/players/${id}/ban`);
}

// POST /api/players/{id}/unban
export async function unbanPlayer(id: string): Promise<Player[]> {
  return api.post<Player[]>(`/api/players/${id}/unban`);
}

// POST /api/players/{id}/message
export async function sendPlayerMessage(id: string, message: string): Promise<{ id: string; message: string }> {
  return delay({ id, message }, 400);
}

// POST /api/players/{id}/teleport (future)
export async function teleportPlayer(id: string, destination: string): Promise<{ id: string; destination: string }> {
  return delay({ id, destination }, 400);
}
