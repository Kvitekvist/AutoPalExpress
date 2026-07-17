import { api } from "./httpClient";
import type {
  Mod,
  ModsPathInfo,
  ModWishlistRequest,
  NexusModFile,
  NexusModResult,
  VerifiedFileInstall,
} from "@/types/models";

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

// GET /api/mods/from-nexus/{nexusModId}/files
export async function getNexusModFiles(nexusModId: number): Promise<NexusModFile[]> {
  return api.get<NexusModFile[]>(`/api/mods/from-nexus/${nexusModId}/files`);
}

// POST /api/mods/from-nexus/{nexusModId}/install
export async function installFromNexus(nexusModId: number, fileId?: number): Promise<Mod[]> {
  const query = fileId != null ? `?file_id=${fileId}` : "";
  return api.post<Mod[]>(`/api/mods/from-nexus/${nexusModId}/install${query}`);
}

export async function getWishlist(): Promise<ModWishlistRequest[]> {
  return api.get<ModWishlistRequest[]>("/api/mods/wishlist");
}

export async function addToWishlist(mod: NexusModResult): Promise<ModWishlistRequest[]> {
  return api.post<ModWishlistRequest[]>("/api/mods/wishlist", {
    nexusModId: mod.modId,
    name: mod.name,
    author: mod.author,
    summary: mod.summary,
    pictureUrl: mod.pictureUrl,
  });
}

// Requests an update for an already-installed Nexus-sourced mod through the
// same wishlist the super admin already reviews - installing a new mod and
// updating one already went through the same backend approve path anyway.
export async function requestModUpdate(mod: Mod): Promise<ModWishlistRequest[]> {
  return api.post<ModWishlistRequest[]>("/api/mods/wishlist", {
    nexusModId: mod.sourceModId,
    name: mod.name,
    author: mod.author,
    summary: mod.description,
    pictureUrl: null,
  });
}

export async function approveWishlistRequest(id: string): Promise<ModWishlistRequest[]> {
  return api.post<ModWishlistRequest[]>(`/api/mods/wishlist/${id}/approve`);
}

export async function denyWishlistRequest(id: string): Promise<ModWishlistRequest[]> {
  return api.post<ModWishlistRequest[]>(`/api/mods/wishlist/${id}/deny`);
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
export async function confirmInstallFromFile(token: string, modName?: string): Promise<Mod[]> {
  return api.post<Mod[]>("/api/mods/install-from-file/confirm", { token, modName });
}

// DELETE /api/mods/install-from-file/{token}
export async function cancelInstallFromFile(token: string): Promise<void> {
  await api.delete(`/api/mods/install-from-file/${token}`);
}
