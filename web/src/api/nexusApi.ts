import { api } from "./httpClient";
import type { NexusAccount, NexusModList, NexusModResult } from "@/types/models";

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

export async function getModList(list: NexusModList): Promise<NexusModResult[]> {
  return api.get<NexusModResult[]>(`/api/integrations/nexus/mods?list=${list}`);
}
