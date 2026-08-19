import { http } from "@/api/http";
import type { CreateAreaBody, UpdateAreaBody } from "./area.schemas";
import type { Area } from "./area.types";

/** GET /areas takes no query params and returns a bare array, sorted by name. */
export function listAreas(): Promise<Area[]> {
  return http.get<Area[]>("/areas");
}

export function createArea(body: CreateAreaBody): Promise<Area> {
  return http.post<Area>("/areas", body);
}

export function updateArea(id: string, body: UpdateAreaBody): Promise<Area> {
  return http.patch<Area>(`/areas/${id}`, body);
}

export function deleteArea(id: string): Promise<void> {
  return http.delete(`/areas/${id}`);
}
