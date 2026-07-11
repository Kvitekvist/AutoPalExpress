import { api } from "./httpClient";
import type { LogEntry, LogStreams } from "@/types/models";

// GET /api/logs - newest first
export async function getLogs(): Promise<LogEntry[]> {
  return api.get<LogEntry[]>("/api/logs");
}

// GET /api/logs again - simplest correct "check for anything new" contract;
// the list is already capped server-side, so a full refetch is cheap.
export async function pollNewLogs(): Promise<LogEntry[]> {
  return api.get<LogEntry[]>("/api/logs");
}

// GET /api/logs/streams - app stdout/stderr plus activity feed
export async function getLogStreams(): Promise<LogStreams> {
  return api.get<LogStreams>("/api/logs/streams");
}

export async function pollLogStreams(): Promise<LogStreams> {
  return api.get<LogStreams>("/api/logs/streams");
}

export function exportLogs(logs: LogEntry[], appLines: string[] = []): Blob {
  // Both `logs` and `appLines` arrive newest-first for on-screen display; flip
  // to chronological order for the exported text file.
  const appText = ["== AutoPalExpress output ==", ...appLines.slice().reverse()].join("\n");
  const text = logs
    .slice()
    .reverse()
    .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
    .join("\n");
  return new Blob([`${appText}\n\n== Server activity ==\n${text}`], { type: "text/plain" });
}
