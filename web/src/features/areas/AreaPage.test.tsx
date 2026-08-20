import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import {
  USER_ID,
  areasHandler,
  goalProgressHandler,
  goalsHandler,
  habitSummaryHandler,
  habitsHandler,
  makeArea,
  makeGoal,
  makeHabit,
  makeHabitSummary,
  makeMetric,
  meHandler,
  metricsHandler,
} from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { AreaPage } from "./AreaPage";

const HEALTH_ID = "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f";
const WORK_ID = "1c9d6f2a-7b3e-4c5d-8e9f-0a1b2c3d4e5f";

const HEALTH = makeArea({ id: HEALTH_ID, name: "Health", color: "#22c55e" });
const WORK = makeArea({ id: WORK_ID, name: "Work" });

function renderArea(areaId = HEALTH_ID) {
  window.localStorage.setItem("lifeos.userId", USER_ID);

  return renderWithProviders(
    <Routes>
      <Route path="areas/:areaId" element={<AreaPage />} />
    </Routes>,
    { route: `/areas/${areaId}` },
  );
}

describe("AreaPage", () => {
  it("names the area and shows the habits filed under it", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH, WORK]),
      goalsHandler([]),
      goalProgressHandler([]),
      habitsHandler([
        makeHabit({ id: "h1", name: "Drink water", frequencyTarget: 8, areaId: HEALTH_ID }),
        // Belongs to another area, so it must not appear here.
        makeHabit({ id: "h2", name: "Inbox zero", areaId: WORK_ID }),
      ]),
      habitSummaryHandler([makeHabitSummary({ habitId: "h1", completionsInPeriod: 6 })]),
      metricsHandler([]),
    );

    renderArea();

    expect(await screen.findByRole("heading", { name: /Health/ })).toBeInTheDocument();
    expect(await screen.findByText("Drink water")).toBeInTheDocument();
    // completionsInPeriod over frequencyTarget — what the habit was defined by.
    expect(screen.getByText(/6\s*\/\s*8/)).toBeInTheDocument();
    expect(screen.queryByText("Inbox zero")).not.toBeInTheDocument();
  });

  it("groups the area's measurements into one card per series", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      goalsHandler([]),
      goalProgressHandler([]),
      habitsHandler([]),
      habitSummaryHandler([]),
      metricsHandler([
        makeMetric({
          id: "m1",
          key: "body_weight",
          value: 76,
          unit: "kg",
          recordedAt: "2026-08-17T09:00:00.000Z",
          areaId: HEALTH_ID,
        }),
        makeMetric({
          id: "m2",
          key: "body_weight",
          value: 74.5,
          unit: "kg",
          recordedAt: "2026-08-19T09:00:00.000Z",
          areaId: HEALTH_ID,
        }),
        makeMetric({
          id: "m3",
          key: "sleep_hours",
          value: 7,
          recordedAt: "2026-08-19T09:00:00.000Z",
          areaId: WORK_ID,
        }),
      ]),
    );

    renderArea();

    // The key is the only name a series has, so it becomes the heading.
    expect(await screen.findByText("Body weight")).toBeInTheDocument();
    // The latest reading leads, not the average of the window. Both are
    // formatted in the user's own locale — pt-BR here, so the decimal is a comma.
    expect(screen.getByText("74,5")).toBeInTheDocument();
    expect(screen.getByText(/Average 75,25 over 2 readings, last 90 days/)).toBeInTheDocument();
    // Another area's series is filtered out by the request itself.
    expect(screen.queryByText("Sleep hours")).not.toBeInTheDocument();
  });

  it("lists the area's goals with the progress the list already carries", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      goalsHandler([
        makeGoal({
          id: "g1",
          title: "Run a half marathon",
          areas: [HEALTH],
          targetValue: 21,
          currentValue: 14,
          unit: "km",
        }),
      ]),
      // No metricKey on that goal, so no derived read is spent on it.
      goalProgressHandler([]),
      habitsHandler([]),
      habitSummaryHandler([]),
      metricsHandler([]),
    );

    renderArea();

    expect(await screen.findByText("Run a half marathon")).toBeInTheDocument();
    expect(screen.getByText("14 of 21 km")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
  });

  it("says so when the area has nothing filed under it", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      goalsHandler([]),
      goalProgressHandler([]),
      habitsHandler([]),
      habitSummaryHandler([]),
      metricsHandler([]),
    );

    renderArea();

    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
  });

  it("reports an area id that matches nothing", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      goalsHandler([]),
      goalProgressHandler([]),
      habitsHandler([]),
      habitSummaryHandler([]),
      metricsHandler([]),
    );

    renderArea("2b6b2f4e-0f8e-4b7a-9a3c-8d1e2f3a4b5c");

    expect(await screen.findByText("Area not found")).toBeInTheDocument();
  });
});
