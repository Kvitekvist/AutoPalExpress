import { delay } from "./client";
import { generateMockLogs } from "./mockData";
import type { LogEntry } from "@/types/models";

let logs: LogEntry[] = generateMockLogs(120);

// GET /api/logs
export async function getLogs(): Promise<LogEntry[]> {
  return delay(logs.map((l) => ({ ...l })), 350);
}

// GET /api/logs/latest - simulate a live tail by prepending a new entry
export async function pollNewLogs(): Promise<LogEntry[]> {
  const fresh = generateMockLogs(1);
  logs = [...fresh, ...logs].slice(0, 500);
  return delay(logs.map((l) => ({ ...l })), 200);
}

// GET /api/logs/export
export async function exportLogs(): Promise<Blob> {
  const text = logs
    .slice()
    .reverse()
    .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
    .join("\n");
  return delay(new Blob([text], { type: "text/plain" }), 300);
}
