import { api } from "./httpClient";
import type { Ue4ssStatus, Ue4ssLatest } from "@/types/models";

// GET /api/ue4ss/status
export async function getStatus(): Promise<Ue4ssStatus> {
  return api.get<Ue4ssStatus>("/api/ue4ss/status");
}

// GET /api/ue4ss/latest
export async function getLatest(): Promise<Ue4ssLatest> {
  return api.get<Ue4ssLatest>("/api/ue4ss/latest");
}

// POST /api/ue4ss/install
export async function install(): Promise<Ue4ssStatus> {
  return api.post<Ue4ssStatus>("/api/ue4ss/install");
}

// POST /api/ue4ss/uninstall
export async function uninstall(): Promise<Ue4ssStatus> {
  return api.post<Ue4ssStatus>("/api/ue4ss/uninstall");
}
