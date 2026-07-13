import { api } from "./httpClient";
import type { NexusAccount, NexusModList, NexusModResult, NexusSsoStart, NexusSsoStatus } from "@/types/models";

// GET /api/integrations/nexus/account
export async function getAccount(): Promise<NexusAccount> {
  return api.get<NexusAccount>("/api/integrations/nexus/account");
}

// GET /api/integrations/nexus/sso/configured
export async function getSsoConfigured(): Promise<{ configured: boolean }> {
  return api.get<{ configured: boolean }>("/api/integrations/nexus/sso/configured");
}

// POST /api/integrations/nexus/sso/start
export async function startSso(): Promise<NexusSsoStart> {
  return api.post<NexusSsoStart>("/api/integrations/nexus/sso/start");
}

// GET /api/integrations/nexus/sso/status/{requestId}
export async function getSsoStatus(requestId: string): Promise<NexusSsoStatus> {
  return api.get<NexusSsoStatus>(`/api/integrations/nexus/sso/status/${requestId}`);
}

// POST /api/integrations/nexus/disconnect
export async function disconnectAccount(): Promise<NexusAccount> {
  return api.post<NexusAccount>("/api/integrations/nexus/disconnect");
}

export async function getModList(list: NexusModList): Promise<NexusModResult[]> {
  return api.get<NexusModResult[]>(`/api/integrations/nexus/mods?list=${list}`);
}
