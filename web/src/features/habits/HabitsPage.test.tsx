import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as msw } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  USER_ID,
  completeHabitHandler,
  deleteEventHandler,
  eventsHandler,
  habitSummaryHandler,
  habitsHandler,
  makeCompletion,
  makeHabit,
  makeHabitSummary,
  meHandler,
} from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { HabitsPage } from "./HabitsPage";

const READ = "3f8c1b2a-4d5e-4f60-9a1b-2c3d4e5f6071";
const RUN = "7a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9";

/** The user record carries the time zone every day on this page is bucketed in. */
function signIn() {
  window.localStorage.setItem("lifeos.userId", USER_ID);
}

describe("HabitsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Midday in São Paulo, the fixture user's zone, so "today" is unambiguous.
    vi.setSystemTime(new Date("2026-08-19T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports how many habits are on track and the streaks behind them", async () => {
    signIn();
    server.use(
      meHandler(),
      habitsHandler([
        makeHabit({ id: READ, name: "Read 30 minutes" }),
        makeHabit({ id: RUN, name: "Run", frequency: "WEEKLY", frequencyTarget: 3 }),
      ]),
      habitSummaryHandler([
        makeHabitSummary({ habitId: READ, isFulfilled: true, currentStreak: 12 }),
        makeHabitSummary({
          habitId: RUN,
          frequency: "WEEKLY",
          frequencyTarget: 3,
          isFulfilled: false,
          currentStreak: 4,
        }),
      ]),
      eventsHandler([]),
    );

    renderWithProviders(<HabitsPage />);

    expect(await screen.findByText("1/2 habits on track")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    // The streak counts periods, so the weekly habit is measured in weeks.
    expect(await screen.findByText("12 days")).toBeInTheDocument();
    expect(screen.getByText("4 weeks")).toBeInTheDocument();
  });

  it("fills the squares of the days a habit was completed on", async () => {
    signIn();
    server.use(
      meHandler(),
      habitsHandler([makeHabit({ id: READ, name: "Read 30 minutes" })]),
      habitSummaryHandler([makeHabitSummary({ habitId: READ })]),
      eventsHandler([
        // 22:00 on the 18th in São Paulo, which is already the 19th in UTC:
        // bucketing in UTC would tick the wrong square.
        makeCompletion({ id: "e1", habitId: READ, occurredAt: "2026-08-19T01:00:00.000Z" }),
      ]),
    );

    renderWithProviders(<HabitsPage />);

    const done = await screen.findByRole("button", { name: /Read 30 minutes — .*18/ });
    const empty = screen.getByRole("button", { name: /Read 30 minutes — .*19/ });

    expect(done).toHaveAttribute("aria-pressed", "true");
    expect(empty).toHaveAttribute("aria-pressed", "false");
  });

  it("records a completion on the day whose square was clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn();
    server.use(
      meHandler(),
      habitsHandler([makeHabit({ id: READ, name: "Read 30 minutes" })]),
      habitSummaryHandler([makeHabitSummary({ habitId: READ })]),
      eventsHandler([]),
      completeHabitHandler(),
    );

    const bodies: unknown[] = [];

    server.events.on("request:start", async ({ request }) => {
      if (request.method === "POST") {
        bodies.push(await request.clone().json());
      }
    });

    renderWithProviders(<HabitsPage />);

    await user.click(await screen.findByRole("button", { name: /Read 30 minutes — .*17/ }));

    // Midday in São Paulo on the 17th, not "now" and not the browser's midday:
    // the API buckets the completion by the user's own zone.
    await waitFor(() => expect(bodies).toEqual([{ occurredAt: "2026-08-17T15:00:00.000Z" }]));
  });

  it("clears a day by deleting every completion on it", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn();
    server.use(
      meHandler(),
      habitsHandler([makeHabit({ id: READ, name: "Read 30 minutes" })]),
      habitSummaryHandler([makeHabitSummary({ habitId: READ })]),
      // Nothing enforces one completion per day, so a square can stand for two.
      eventsHandler([
        makeCompletion({ id: "e1", habitId: READ, occurredAt: "2026-08-18T15:00:00.000Z" }),
        makeCompletion({ id: "e2", habitId: READ, occurredAt: "2026-08-18T20:00:00.000Z" }),
      ]),
      deleteEventHandler(),
    );

    const deleted: string[] = [];

    server.events.on("request:start", ({ request }) => {
      if (request.method === "DELETE") {
        deleted.push(new URL(request.url).pathname);
      }
    });

    renderWithProviders(<HabitsPage />);

    await user.click(await screen.findByRole("button", { name: /Read 30 minutes — .*18/ }));

    await waitFor(() =>
      expect(deleted.sort()).toEqual(["/api/events/e1", "/api/events/e2"]),
    );
  });

  it("offers the form when there are no habits at all", async () => {
    signIn();
    server.use(meHandler(), habitsHandler([]), habitSummaryHandler([]), eventsHandler([]));

    renderWithProviders(<HabitsPage />);

    expect(await screen.findByText("No habits yet")).toBeInTheDocument();
  });

  it("keeps a paused habit in the tracker but out of the counts", async () => {
    signIn();
    server.use(
      meHandler(),
      habitsHandler([
        makeHabit({ id: READ, name: "Read 30 minutes" }),
        makeHabit({ id: RUN, name: "Run", status: "PAUSED" }),
      ]),
      // Only the active habit is summarized, so only it can be "on track".
      habitSummaryHandler([makeHabitSummary({ habitId: READ, isFulfilled: true })]),
      eventsHandler([]),
    );

    renderWithProviders(<HabitsPage />);

    expect(await screen.findByText("1/1 habits on track")).toBeInTheDocument();
    expect(screen.getByText("Run")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("archives a habit with a status-only patch", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn();

    const patches: { path: string; body: unknown }[] = [];

    server.use(
      meHandler(),
      habitsHandler([makeHabit({ id: READ, name: "Read 30 minutes" })]),
      habitSummaryHandler([makeHabitSummary({ habitId: READ })]),
      eventsHandler([]),
      msw.patch("/api/habits/:id", async ({ params, request }) => {
        patches.push({ path: String(params["id"]), body: await request.json() });

        return HttpResponse.json(
          makeHabit({ id: READ, name: "Read 30 minutes", status: "ARCHIVED" }),
        );
      }),
    );

    renderWithProviders(<HabitsPage />);

    await user.click(await screen.findByRole("button", { name: "Archive Read 30 minutes" }));

    // Only `status`: resending the form's whole body would overwrite fields
    // nobody touched.
    await waitFor(() =>
      expect(patches).toEqual([{ path: READ, body: { status: "ARCHIVED" } }]),
    );
  });

  it("hides archived habits behind a toggle and restores them", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn();

    const patches: unknown[] = [];

    server.use(
      meHandler(),
      habitsHandler([
        makeHabit({ id: READ, name: "Read 30 minutes" }),
        makeHabit({ id: RUN, name: "Run", status: "ARCHIVED" }),
      ]),
      habitSummaryHandler([makeHabitSummary({ habitId: READ })]),
      eventsHandler([]),
      msw.patch("/api/habits/:id", async ({ request }) => {
        patches.push(await request.json());

        return HttpResponse.json(makeHabit({ id: RUN, name: "Run" }));
      }),
    );

    renderWithProviders(<HabitsPage />);

    // The archived habit is in the response but not in the tracker.
    expect(await screen.findByText("Read 30 minutes")).toBeInTheDocument();
    expect(screen.queryByText("Run")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show archived (1)" }));
    expect(screen.getByText("Run")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(patches).toEqual([{ status: "ACTIVE" }]));
  });

  it("opens the form on the habit whose row was clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn();
    server.use(
      meHandler(),
      habitsHandler([
        makeHabit({
          id: RUN,
          name: "Run",
          frequency: "WEEKLY",
          frequencyTarget: 3,
          startDate: "2026-01-01T00:00:00.000Z",
        }),
      ]),
      habitSummaryHandler([makeHabitSummary({ habitId: RUN })]),
      eventsHandler([]),
    );

    renderWithProviders(<HabitsPage />);

    await user.click(await screen.findByRole("button", { name: "Edit Run" }));

    expect(await screen.findByText("Edit habit")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Run");
    expect(screen.getByLabelText("Times per period")).toHaveValue("3");
    // A `@db.Date` column read back in UTC, not through the browser's zone.
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-01-01");
  });
});
