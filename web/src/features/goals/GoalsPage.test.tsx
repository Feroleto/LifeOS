import { screen } from "@testing-library/react";
import { HttpResponse, http as msw } from "msw";
import { describe, expect, it } from "vitest";

import { areasHandler, makeArea, makeGoal } from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { GoalsPage } from "./GoalsPage";

const HEALTH = makeArea({ id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f", name: "Health" });

function captureGoalRequests(goals = [] as ReturnType<typeof makeGoal>[]) {
  const urls: string[] = [];

  server.use(
    areasHandler([HEALTH]),
    msw.get("/api/goals", ({ request }) => {
      urls.push(request.url);
      return HttpResponse.json(goals);
    }),
  );

  return urls;
}

describe("GoalsPage", () => {
  it("turns the filters in the URL into query params", async () => {
    const urls = captureGoalRequests();

    renderWithProviders(<GoalsPage />, { route: "/goals?status=ACTIVE" });

    expect(await screen.findByText("No goals match these filters")).toBeInTheDocument();
    expect(new URL(urls[0] ?? "").search).toBe("?status=ACTIVE");
  });

  it("asks for everything with no query string at all when nothing is filtered", async () => {
    const urls = captureGoalRequests();

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByText("No goals yet")).toBeInTheDocument();
    expect(new URL(urls[0] ?? "").search).toBe("");
  });

  it("shows a numeric target when there is one and marks the goal qualitative when there is not", async () => {
    captureGoalRequests([
      makeGoal({
        id: "406f3367-a339-4aa8-a763-7b5164ef2a3e",
        title: "Run weekly",
        targetValue: 10,
        unit: "km",
        period: "WEEKLY",
      }),
      makeGoal({ id: "5170c1b9-0b1e-4a2c-9f3d-6e7a8b9c0d1e", title: "Read more" }),
    ]);

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByText("10 km · WEEKLY")).toBeInTheDocument();
    expect(screen.getByText("Qualitative")).toBeInTheDocument();
  });

  it("does not read a target of 0 as an unset one", async () => {
    captureGoalRequests([
      makeGoal({ id: "6280d2ca-1c2f-4b3d-8a4e-7f8b9c0d1e2f", title: "Zero sugar", targetValue: 0, unit: "g" }),
    ]);

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByText("0 g")).toBeInTheDocument();
    expect(screen.queryByText("Qualitative")).not.toBeInTheDocument();
  });
});
