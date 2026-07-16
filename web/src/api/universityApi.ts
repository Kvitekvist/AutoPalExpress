import { api } from "./httpClient";
import type { AdminBasicsStatus, UniversityCatalog } from "@/types/models";

export const getCatalog = () => api.get<UniversityCatalog>("/api/university");
export const activate = (courseId: string) => api.post<UniversityCatalog>(`/api/university/${courseId}/activate`);
export const retake = (courseId: string) => api.post<UniversityCatalog>(`/api/university/${courseId}/retake`);
export const completeStep = (courseId: string, stepId: string) =>
  api.post<UniversityCatalog>(`/api/university/${courseId}/steps/${stepId}/complete`);
export const getAdminBasicsStatus = () => api.get<AdminBasicsStatus[]>("/api/university/admin-basics-status");
