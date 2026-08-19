import { screen } from "@testing-library/react";
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
  meHandler,
} from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { DashboardPage } from "./DashboardPage";

const HEALTH = makeArea({
  id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f",
  name: "Health",
  color: "#2b5e3c",
});

const WORK = makeArea({ id: "1c9d6f2a-7b3e-4c5d-8e9f-0a1b2c3d4e5f", name: "Work" });

const MARATHON = "406f3367-a339-4aa8-a763-7b5164ef2a3e";
const SLEEP = "5170c1b9-0b1e-4a2c-9f3d-6e7a8b9c0d1e";

/** The dashboard greets by name, which only loads for a signed-in user. */
function signIn() {
  window.localStorage.setItem("lifeos.userId", USER_ID);
}

/** Habits are queried on every render, so every test has to answer for them. */
function noHabits() {
  return [habitsHandler([]), habitSummaryHandler([])];
}

describe("DashboardPage", () => {
  it("summarizes each area from the goals it owns", async () => {
    signIn();
    server.use(
      meHandler(),
      areasHandler([HEALTH, WORK]),
      goalsHandler([
        makeGoal({
          id: MARATHON,
          title: "Run a half marathon",
          areas: [HEALTH],
          targetDate: "2026-12-01T00:00:00.000Z",
        }),
        makeGoal({ id: SLEEP, title: "Sleep eight hours", areas: [HEALTH], status: "COMPLETED" }),
      ]),
      goalProgressHandler([]),
      ...noHabits(),
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Health")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
    expect(screen.getByText("1 goal in progress")).toBeInTheDocument();
    expect(screen.getByText("Run a half marathon")).toBeInTheDocument();

    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("No goals yet")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Guilherme");
  });

  it("shows the next goal's own percentage once the API can give one", async () => {
    server.use(
      areasHandler([HEALTH]),
      goalsHandler([
        makeGoal({
          id: MARATHON,
          title: "Study 15h",
          areas: [HEALTH],
          targetValue: 15,
          targetDate: "2026-12-01T00:00:00.000Z",
        }),
      ]),
      goalProgressHandler([
        {
          goalId: MARATHON,
          targetValue: 15,
          currentValue: 9.5,
          percentage: 63.3,
          source: "METRIC",
        },
      ]),
      ...noHabits(),
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("63.3%")).toBeInTheDocument();
    expect(screen.getByText("Study 15h")).toBeInTheDocument();
  });

  it("does not ask about a goal that can have no percentage", async () => {
    const asked: string[] = [];

    server.use(
      areasHandler([HEALTH]),
      goalsHandler([
        // Qualitative: no targetValue, so no progress request is worth making.
        makeGoal({
          id: MARATHON,
          title: "Read more",
          areas: [HEALTH],
          targetDate: "2026-12-01T00:00:00.000Z",
        }),
      ]),
      // Deliberately unprepared: reaching it would 404 and prove the fan-out
      // went wider than it should.
      goalProgressHandler([]),
      ...noHabits(),
    );

    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/progress")) {
        asked.push(request.url);
      }
    });

    renderWithProviders(<DashboardPage />);

    // The goal roll-up is what renders instead of a percentage.
    expect(await screen.findByText("Read more")).toBeInTheDocument();
    expect(asked).toEqual([]);
  });

  it("counts the habits on track in their own period", async () => {
    const reading = makeHabit({ id: "aaaaaaa1-0000-4000-8000-000000000001", name: "Read" });
    const training = makeHabit({
      id: "aaaaaaa2-0000-4000-8000-000000000002",
      name: "Train",
      frequency: "WEEKLY",
      frequencyTarget: 4,
    });

    server.use(
      areasHandler([]),
      goalsHandler([]),
      goalProgressHandler([]),
      habitsHandler([reading, training]),
      habitSummaryHandler([
        makeHabitSummary({ habitId: reading.id, isFulfilled: true, currentStreak: 7 }),
        makeHabitSummary({
          habitId: training.id,
          frequency: "WEEKLY",
          frequencyTarget: 4,
          isFulfilled: false,
          currentStreak: 2,
        }),
      ]),
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("1/2 on track")).toBeInTheDocument();
    expect(screen.getByText("2 active")).toBeInTheDocument();
    // The longest streak, labelled with its own habit's period.
    expect(screen.getByText("Read — 7 days running")).toBeInTheDocument();
  });

  it("leaves the habits card out when there are no habits", async () => {
    server.use(areasHandler([HEALTH]), goalsHandler([]), goalProgressHandler([]), ...noHabits());

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Health")).toBeInTheDocument();
    expect(screen.queryByText("Habits")).not.toBeInTheDocument();
  });

  it("links each card to that area's filtered goals", async () => {
    server.use(areasHandler([HEALTH]), goalsHandler([]), goalProgressHandler([]), ...noHabits());

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /Health/ })).toHaveAttribute(
      "href",
      `/goals?areaId=${HEALTH.id}`,
    );
  });

  it("points at the areas page when there is nothing to summarize", async () => {
    server.use(areasHandler([]), goalsHandler([]), goalProgressHandler([]), ...noHabits());

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("No areas yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New area" })).toHaveAttribute("href", "/areas");
  });
});
