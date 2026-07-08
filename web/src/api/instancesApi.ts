import { api } from "./httpClient";
import type { InstanceListView, ServerInstance, DeployJob } from "@/types/models";

// GET /api/instances
export async function list(): Promise<InstanceListView> {
  return api.get<InstanceListView>("/api/instances");
}

// GET /api/instances/active
export async function getActive(): Promise<ServerInstance | null> {
  return api.get<ServerInstance | null>("/api/instances/active");
}

// POST /api/instances/active
export async function setActive(id: string): Promise<InstanceListView> {
  return api.post<InstanceListView>("/api/instances/active", { id });
}

// DELETE /api/instances/{id}
export async function removeInstance(id: string): Promise<InstanceListView> {
  return api.delete<InstanceListView>(`/api/instances/${id}`);
}

// POST /api/instances/{id}/community-server
export async function setCommunityServer(id: string, enabled: boolean): Promise<InstanceListView> {
  return api.post<InstanceListView>(`/api/instances/${id}/community-server`, { enabled });
}

// POST /api/instances/import
export async function importExisting(name: string, path: string): Promise<InstanceListView> {
  return api.post<InstanceListView>("/api/instances/import", { name, path });
}

// POST /api/instances/import/detect
export async function importDetected(): Promise<InstanceListView> {
  return api.post<InstanceListView>("/api/instances/import/detect");
}

// POST /api/instances/import/browse
export async function browseImportDir(): Promise<{ path: string | null }> {
  return api.post<{ path: string | null }>("/api/instances/import/browse");
}

// POST /api/instances/deploy/browse
export async function browseDeployParentDir(): Promise<{ path: string | null }> {
  return api.post<{ path: string | null }>("/api/instances/deploy/browse");
}

export interface DeployParams {
  name: string;
  gamePort: number;
  rconPort: number;
  maxPlayers: number;
  installParentDir?: string | null;
}

// POST /api/instances/deploy
export async function deploy(params: DeployParams): Promise<{ jobId: string }> {
  return api.post<{ jobId: string }>("/api/instances/deploy", params);
}

// GET /api/instances/deploy/{jobId}
export async function getDeployStatus(jobId: string): Promise<DeployJob> {
  return api.get<DeployJob>(`/api/instances/deploy/${jobId}`);
}
