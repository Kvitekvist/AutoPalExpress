import { api } from "./httpClient";
import type { ServerStatus } from "@/types/models";

// GET /api/server/status
export async function getServerStatus(): Promise<ServerStatus> {
  return api.get<ServerStatus>("/api/server/status");
}

// POST /api/server/start
export async function startServer(): Promise<ServerStatus> {
  return api.post<ServerStatus>("/api/server/start");
}

// POST /api/server/stop
export async function stopServer(): Promise<ServerStatus> {
  return api.post<ServerStatus>("/api/server/stop");
}

// POST /api/server/restart
export async function restartServer(): Promise<ServerStatus> {
  return api.post<ServerStatus>("/api/server/restart");
}

// POST /api/server/save
export async function saveWorld(): Promise<{ savedAt: string }> {
  return api.post<{ savedAt: string }>("/api/server/save");
}

// POST /api/server/broadcast
export async function broadcastMessage(message: string): Promise<{ message: string }> {
  return api.post<{ message: string }>("/api/server/broadcast", { message });
}

// POST /api/server/shutdown-countdown
export async function startShutdownCountdown(seconds: number): Promise<{ seconds: number }> {
  return api.post<{ seconds: number }>("/api/server/shutdown-countdown", { seconds });
}

// POST /api/server/cancel-shutdown-countdown
export async function cancelShutdownCountdown(): Promise<{ cancelled: boolean }> {
  return api.post<{ cancelled: boolean }>("/api/server/cancel-shutdown-countdown");
}
