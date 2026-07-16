import { api } from "./httpClient";
import type {
  AutomationConfig,
  BackupRecord,
  BackupRestoreResult,
  BackupVerifyResult,
  SaveImportCandidate,
  SaveImportResult,
} from "@/types/models";

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

// POST /api/automation/backups/{timestamp}/verify
export async function verifyBackup(timestamp: string): Promise<BackupVerifyResult> {
  return api.post<BackupVerifyResult>(`/api/automation/backups/${encodeURIComponent(timestamp)}/verify`);
}

// POST /api/automation/backups/{timestamp}/restore
export async function restoreBackup(timestamp: string): Promise<BackupRestoreResult> {
  return api.post<BackupRestoreResult>(`/api/automation/backups/${encodeURIComponent(timestamp)}/restore`);
}

// PATCH /api/automation/backups/{timestamp}/notes
export async function setBackupNotes(timestamp: string, notes: string): Promise<BackupRecord> {
  return api.patch<BackupRecord>(`/api/automation/backups/${encodeURIComponent(timestamp)}/notes`, { notes });
}

// GET /api/automation/backups/{timestamp}/export - triggers a real browser download
export function backupExportUrl(timestamp: string): string {
  return `/api/automation/backups/${encodeURIComponent(timestamp)}/export`;
}

// POST /api/automation/save-import/browse
export async function browseSaveImportDir(): Promise<{ path: string | null }> {
  return api.post<{ path: string | null }>("/api/automation/save-import/browse");
}

// POST /api/automation/save-import/inspect
export async function inspectSaveImport(path: string): Promise<{ candidates: SaveImportCandidate[] }> {
  return api.post<{ candidates: SaveImportCandidate[] }>("/api/automation/save-import/inspect", { path });
}

// GET /api/automation/save-import/destination
export async function getSaveImportDestination(): Promise<{ current: SaveImportCandidate | null }> {
  return api.get<{ current: SaveImportCandidate | null }>("/api/automation/save-import/destination");
}

// POST /api/automation/save-import/apply
export async function applySaveImport(path: string): Promise<SaveImportResult> {
  return api.post<SaveImportResult>("/api/automation/save-import/apply", { path });
}
