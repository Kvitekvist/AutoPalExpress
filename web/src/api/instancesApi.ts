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
export async function removeInstance(id: string, deleteFiles = false): Promise<InstanceListView> {
  const suffix = deleteFiles ? "?deleteFiles=true" : "";
  return api.delete<InstanceListView>(`/api/instances/${id}${suffix}`);
}

// POST /api/instances/{id}/open
export async function openInstanceFolder(id: string): Promise<{ opened: boolean }> {
  return api.post<{ opened: boolean }>(`/api/instances/${id}/open`);
}

// POST /api/instances/{id}/community-server
export async function setCommunityServer(id: string, enabled: boolean): Promise<InstanceListView> {
  return api.post<InstanceListView>(`/api/instances/${id}/community-server`, { enabled });
}

// POST /api/instances/{id}/query-port
export async function setQueryPort(id: string, port: number): Promise<InstanceListView> {
  return api.post<InstanceListView>(`/api/instances/${id}/query-port`, { port });
}

export interface LaunchOptionsParams {
  usePerfThreads: boolean;
  noAsyncLoadingThread: boolean;
  useMultithreadForDs: boolean;
  publicLobby: boolean;
  usePublicIpOverride: boolean;
  usePublicPortOverride: boolean;
  useQueryPort: boolean;
}

// POST /api/instances/{id}/launch-options
export async function setLaunchOptions(id: string, params: LaunchOptionsParams): Promise<InstanceListView> {
  return api.post<InstanceListView>(`/api/instances/${id}/launch-options`, params);
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

// GET /api/instances/deploy/default-location
export async function getDefaultDeployLocation(): Promise<{ path: string }> {
  return api.get<{ path: string }>("/api/instances/deploy/default-location");
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
