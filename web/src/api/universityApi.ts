import { api } from "./httpClient";
import type { UniversityCatalog } from "@/types/models";

export const getCatalog = () => api.get<UniversityCatalog>("/api/university");
export const activate = (courseId: string) => api.post<UniversityCatalog>(`/api/university/${courseId}/activate`);
export const completeStep = (courseId: string, stepId: string) =>
  api.post<UniversityCatalog>(`/api/university/${courseId}/steps/${stepId}/complete`);
