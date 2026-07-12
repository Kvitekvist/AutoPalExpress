import { api } from "./httpClient";
import type { AppUpdateStatus } from "@/types/models";

export function getStatus(): Promise<AppUpdateStatus> {
  return api.get<AppUpdateStatus>("/api/app-update");
}
