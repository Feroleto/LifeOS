import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("turns the area in the URL into a query param, and never sends a status", async () => {
    const urls = captureGoalRequests();

    renderWithProviders(<GoalsPage />, { route: `/goals?areaId=${HEALTH.id}&status=ACTIVE` });

    expect(await screen.findByText("No goals match these filters")).toBeInTheDocument();
    // The board is the status view, so every status has to come back at once.
    expect(new URL(urls[0] ?? "").search).toBe(`?areaId=${HEALTH.id}`);
  });

  it("asks for everything with no query string at all when nothing is filtered", async () => {
    const urls = captureGoalRequests();

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByText("No goals yet")).toBeInTheDocument();
    expect(new URL(urls[0] ?? "").search).toBe("");
  });

  it("groups the goals into a column per status and counts them", async () => {
    captureGoalRequests([
      makeGoal({ id: "406f3367-a339-4aa8-a763-7b5164ef2a3e", title: "Run weekly" }),
      makeGoal({
        id: "5170c1b9-0b1e-4a2c-9f3d-6e7a8b9c0d1e",
        title: "Save monthly",
        status: "PAUSED",
      }),
    ]);

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByRole("heading", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByText("Run weekly")).toBeInTheDocument();
    expect(screen.getByText("Save monthly")).toBeInTheDocument();
    expect(screen.getByText("1 goal in progress, 2 in total")).toBeInTheDocument();
    // Completed has none, and says so rather than disappearing.
    expect(screen.getByText("Nothing completed yet.")).toBeInTheDocument();
  });

  it("keeps cancelled goals off the board until they are asked for", async () => {
    captureGoalRequests([
      makeGoal({
        id: "406f3367-a339-4aa8-a763-7b5164ef2a3e",
        title: "Learn guitar",
        status: "CANCELLED",
      }),
    ]);

    const user = userEvent.setup();

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByRole("button", { name: "Show cancelled (1)" })).toBeInTheDocument();
    expect(screen.queryByText("Learn guitar")).not.toBeInTheDocument();
    // Hidden, not filtered out: the header still counts it.
    expect(screen.getByText("0 goals in progress, 1 in total")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show cancelled (1)" }));

    expect(screen.getByText("Learn guitar")).toBeInTheDocument();
  });

  it("derives manual progress from the goal itself and asks only about metric-fed ones", async () => {
    const requested: string[] = [];

    captureGoalRequests([
      makeGoal({
        id: "406f3367-a339-4aa8-a763-7b5164ef2a3e",
        title: "Read 12 books",
        targetValue: 12,
        currentValue: 7,
        unit: "books",
      }),
      makeGoal({
        id: "5170c1b9-0b1e-4a2c-9f3d-6e7a8b9c0d1e",
        title: "Run 15 km",
        targetValue: 15,
        currentValue: 999,
        unit: "km",
        period: "WEEKLY",
        metricKey: "running_km",
      }),
    ]);

    server.use(
      msw.get("/api/goals/:id/progress", ({ params }) => {
        requested.push(String(params.id));

        return HttpResponse.json({
          goalId: params.id,
          targetValue: 15,
          currentValue: 9.5,
          percentage: 63.3,
          source: "METRIC",
        });
      }),
    );

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    expect(await screen.findByText("7 of 12 books")).toBeInTheDocument();
    expect(screen.getByText("58.3%")).toBeInTheDocument();

    // The stored 999 is ignored; the aggregate answers instead.
    expect(await screen.findByText("9.5 of 15 km · weekly")).toBeInTheDocument();
    expect(screen.getByText("63.3%")).toBeInTheDocument();

    expect(requested).toEqual(["5170c1b9-0b1e-4a2c-9f3d-6e7a8b9c0d1e"]);
  });

  it("moves a goal between columns with a status-only patch", async () => {
    let body: unknown = null;

    captureGoalRequests([
      makeGoal({ id: "406f3367-a339-4aa8-a763-7b5164ef2a3e", title: "Run weekly", areas: [HEALTH] }),
    ]);

    server.use(
      msw.patch("/api/goals/:id", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );

    const user = userEvent.setup();

    renderWithProviders(<GoalsPage />, { route: "/goals" });

    await user.click(await screen.findByRole("button", { name: "Pause Run weekly" }));

    // areaIds is deliberately absent: sending it would replace the whole set.
    await expect.poll(() => body).toEqual({ status: "PAUSED" });
  });
});
