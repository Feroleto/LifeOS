import { HttpResponse, http as msw } from "msw";

import type { Area } from "@/features/areas/area.types";
import type { Goal } from "@/features/goals/goal.types";
import type { User } from "@/identity/user.types";

export const USER_ID = "29967d6a-f3c1-4d8d-9b52-f1c79a3bd228";

const NOW = "2026-08-19T15:00:00.000Z";

export const user: User = {
  id: USER_ID,
  name: "Guilherme Feroleto",
  email: "feroletoguilherme@gmail.com",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
  createdAt: NOW,
  updatedAt: NOW,
};

export function makeArea(overrides: Partial<Area> & Pick<Area, "id" | "name">): Area {
  return {
    userId: USER_ID,
    description: null,
    color: null,
    icon: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeGoal(overrides: Partial<Goal> & Pick<Goal, "id" | "title">): Goal {
  return {
    userId: USER_ID,
    description: null,
    status: "ACTIVE",
    startDate: null,
    targetDate: null,
    targetValue: null,
    unit: null,
    period: null,
    createdAt: NOW,
    updatedAt: NOW,
    areas: [],
    ...overrides,
  };
}

export const meHandler = () => msw.get("/api/users/me", () => HttpResponse.json(user));

export const areasHandler = (areas: Area[]) =>
  msw.get("/api/areas", () => HttpResponse.json(areas));
