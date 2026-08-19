import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { USER_ID, areasHandler, goalsHandler, makeArea, makeGoal, meHandler } from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { DashboardPage } from "./DashboardPage";

const HEALTH = makeArea({
  id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f",
  name: "Health",
  color: "#2b5e3c",
});

/** The dashboard greets by name, which only loads for a signed-in user. */
function signIn() {
  window.localStorage.setItem("lifeos.userId", USER_ID);
}

describe("DashboardPage", () => {
  it("summarizes each area from the goals it owns", async () => {
    signIn();
    server.use(
      meHandler(),
      areasHandler([HEALTH, makeArea({ id: "1c9d6f2a-7b3e-4c5d-8e9f-0a1b2c3d4e5f", name: "Work" })]),
      goalsHandler([
        makeGoal({
          id: "406f3367-a339-4aa8-a763-7b5164ef2a3e",
          title: "Run a half marathon",
          areas: [HEALTH],
          targetDate: "2026-12-01T00:00:00.000Z",
        }),
        makeGoal({
          id: "5170c1b9-0b1e-4a2c-9f3d-6e7a8b9c0d1e",
          title: "Sleep eight hours",
          areas: [HEALTH],
          status: "COMPLETED",
        }),
      ]),
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Health")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
    expect(screen.getByText("1 goal in progress")).toBeInTheDocument();
    // The nearest dated active goal, not the completed one.
    expect(screen.getByText("Run a half marathon")).toBeInTheDocument();

    // An area with no goals still gets a card.
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("No goals yet")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Guilherme");
  });

  it("links each card to that area's filtered goals", async () => {
    server.use(areasHandler([HEALTH]), goalsHandler([]));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /Health/ })).toHaveAttribute(
      "href",
      `/goals?areaId=${HEALTH.id}`,
    );
  });

  it("points at the areas page when there is nothing to summarize", async () => {
    server.use(areasHandler([]), goalsHandler([]));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("No areas yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New area" })).toHaveAttribute("href", "/areas");
  });
});
