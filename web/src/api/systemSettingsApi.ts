import { api } from "./httpClient";
import type { SystemStartupSettings } from "@/types/models";

// GET /api/system-settings
export async function getSystemSettings(): Promise<SystemStartupSettings> {
  return api.get<SystemStartupSettings>("/api/system-settings");
}

// POST /api/system-settings
export async function updateSystemSettings(settings: SystemStartupSettings): Promise<SystemStartupSettings> {
  return api.post<SystemStartupSettings>("/api/system-settings", settings);
}

export interface DiagnosticsResult {
  reportPath: string;
  report: string;
}

// POST /api/system-settings/diagnostics
export async function runDiagnostics(): Promise<DiagnosticsResult> {
  return api.post<DiagnosticsResult>("/api/system-settings/diagnostics");
}
