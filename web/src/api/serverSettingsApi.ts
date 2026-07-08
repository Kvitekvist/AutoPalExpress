import { api } from "./httpClient";
import type { SettingField } from "@/types/models";

// GET /api/server-settings
export async function getSettings(): Promise<{ fields: SettingField[] }> {
  return api.get<{ fields: SettingField[] }>("/api/server-settings");
}

// POST /api/server-settings
export async function updateSettings(values: Record<string, unknown>): Promise<{ fields: SettingField[] }> {
  return api.post<{ fields: SettingField[] }>("/api/server-settings", { values });
}
