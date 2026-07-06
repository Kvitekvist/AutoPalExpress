import { api } from "./httpClient";
import type { Mod, NexusAccount, NexusModList, NexusModResult } from "@/types/models";

// GET /api/integrations/nexus/account
export async function getAccount(): Promise<NexusAccount> {
  return api.get<NexusAccount>("/api/integrations/nexus/account");
}

// POST /api/integrations/nexus/connect
export async function connectApiKey(apiKey: string): Promise<NexusAccount> {
  return api.post<NexusAccount>("/api/integrations/nexus/connect", { api_key: apiKey });
}

// POST /api/integrations/nexus/disconnect
export async function disconnectAccount(): Promise<NexusAccount> {
  return api.post<NexusAccount>("/api/integrations/nexus/disconnect");
}

// GET /api/integrations/nexus/mods?list=trending|latest_added|latest_updated
// Nexus Mods' public API has no free-text search endpoint - only these curated lists
// (plus lookup by exact mod id). Filtering by name/category happens client-side over
// whichever list is currently loaded.
export async function getModList(list: NexusModList): Promise<NexusModResult[]> {
  return api.get<NexusModResult[]>(`/api/integrations/nexus/mods?list=${list}`);
}

// POST /api/mods/from-nexus/{modId}/install (Premium accounts only - Nexus restricts
// automated file downloads via the API to Premium members)
export async function installFromNexus(modId: number): Promise<Mod[]> {
  return api.post<Mod[]>(`/api/mods/from-nexus/${modId}/install`);
}
