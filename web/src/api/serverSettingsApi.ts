import { api } from "./httpClient";
import type { WorldSettingsView } from "@/types/models";

// GET /api/server-settings
export async function getSettings(): Promise<WorldSettingsView> {
  return api.get<WorldSettingsView>("/api/server-settings");
}

// POST /api/server-settings
export async function updateSettings(values: Record<string, unknown>): Promise<WorldSettingsView> {
  return api.post<WorldSettingsView>("/api/server-settings", { values });
}
