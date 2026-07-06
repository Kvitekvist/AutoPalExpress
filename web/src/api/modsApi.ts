import { api } from "./httpClient";
import type { Mod, ModsPathInfo, VerifiedFileInstall } from "@/types/models";

// GET /api/mods/mods-path
export async function getModsPath(): Promise<ModsPathInfo> {
  return api.get<ModsPathInfo>("/api/mods/mods-path");
}

// POST /api/mods/mods-path
export async function setModsPath(path: string): Promise<ModsPathInfo> {
  return api.post<ModsPathInfo>("/api/mods/mods-path", { path });
}

// DELETE /api/mods/mods-path
export async function clearModsPath(): Promise<ModsPathInfo> {
  return api.delete<ModsPathInfo>("/api/mods/mods-path");
}

// POST /api/mods/mods-path/browse
export async function browseModsPath(): Promise<{ path: string | null }> {
  return api.post<{ path: string | null }>("/api/mods/mods-path/browse");
}

// GET /api/mods
export async function getMods(): Promise<Mod[]> {
  return api.get<Mod[]>("/api/mods");
}

// POST /api/mods/{id}/enable
export async function enableMod(id: string): Promise<Mod[]> {
  return api.post<Mod[]>(`/api/mods/${id}/enable`);
}

// POST /api/mods/{id}/disable
export async function disableMod(id: string): Promise<Mod[]> {
  return api.post<Mod[]>(`/api/mods/${id}/disable`);
}

// POST /api/mods/{id}/remove
export async function removeMod(id: string): Promise<Mod[]> {
  return api.post<Mod[]>(`/api/mods/${id}/remove`);
}

// POST /api/mods/{id}/update
export async function updateMod(id: string): Promise<Mod[]> {
  return api.post<Mod[]>(`/api/mods/${id}/update`);
}

// POST /api/mods/reorder
export async function reorderMods(orderedIds: string[]): Promise<Mod[]> {
  return api.post<Mod[]>("/api/mods/reorder", { orderedIds });
}

// POST /api/mods/install-from-file/prepare (multipart: file)
export async function prepareInstallFromFile(file: File): Promise<VerifiedFileInstall> {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm<VerifiedFileInstall>("/api/mods/install-from-file/prepare", formData);
}

// POST /api/mods/install-from-file/confirm
export async function confirmInstallFromFile(token: string): Promise<Mod[]> {
  return api.post<Mod[]>("/api/mods/install-from-file/confirm", { token });
}

// DELETE /api/mods/install-from-file/{token}
export async function cancelInstallFromFile(token: string): Promise<void> {
  await api.delete(`/api/mods/install-from-file/${token}`);
}
