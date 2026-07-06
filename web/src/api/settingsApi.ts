import { delay } from "./client";
import { mockSettings } from "./mockData";
import type { ServerSettings } from "@/types/models";

let settings: ServerSettings = { ...mockSettings };

// GET /api/settings
export async function getSettings(): Promise<ServerSettings> {
  return delay({ ...settings }, 350);
}

// PUT /api/settings
export async function updateSettings(patch: Partial<ServerSettings>): Promise<ServerSettings> {
  settings = { ...settings, ...patch };
  return delay({ ...settings }, 600);
}
