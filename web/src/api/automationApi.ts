import { api } from "./httpClient";
import type { AutomationConfig, BackupRecord } from "@/types/models";

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
