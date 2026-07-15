import { api } from "./httpClient";
import type { AutomationConfig, BackupRecord, SaveImportCandidate, SaveImportResult } from "@/types/models";

// GET /api/automation
export async function getAutomation(): Promise<AutomationConfig> {
  return api.get<AutomationConfig>("/api/automation");
}

// POST /api/automation
export async function updateAutomation(config: AutomationConfig): Promise<AutomationConfig> {
  const { rconReady: _rconReady, ...body } = config;
  return api.post<AutomationConfig>("/api/automation", body);
}

// GET /api/automation/backups
export async function listBackups(): Promise<BackupRecord[]> {
  return api.get<BackupRecord[]>("/api/automation/backups");
}

// POST /api/automation/backups/run
export async function runBackupNow(): Promise<BackupRecord> {
  return api.post<BackupRecord>("/api/automation/backups/run");
}

// POST /api/automation/backups/{timestamp}/open
export async function openBackupFolder(timestamp: string): Promise<{ opened: boolean }> {
  return api.post<{ opened: boolean }>(`/api/automation/backups/${encodeURIComponent(timestamp)}/open`);
}

// POST /api/automation/save-import/browse
export async function browseSaveImportDir(): Promise<{ path: string | null }> {
  return api.post<{ path: string | null }>("/api/automation/save-import/browse");
}

// POST /api/automation/save-import/inspect
export async function inspectSaveImport(path: string): Promise<{ candidates: SaveImportCandidate[] }> {
  return api.post<{ candidates: SaveImportCandidate[] }>("/api/automation/save-import/inspect", { path });
}

// POST /api/automation/save-import/apply
export async function applySaveImport(path: string): Promise<SaveImportResult> {
  return api.post<SaveImportResult>("/api/automation/save-import/apply", { path });
}
