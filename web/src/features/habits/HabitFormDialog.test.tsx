import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as msw } from "msw";
import { describe, expect, it } from "vitest";

import { USER_ID, makeHabit, meHandler } from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { HabitFormDialog } from "./HabitFormDialog";
import type { Habit } from "./habit.types";

const READ = "3f8c1b2a-4d5e-4f60-9a1b-2c3d4e5f6071";

/** Captures the body of POST /habits, which is what these tests are about. */
function createHabitHandler(bodies: unknown[]) {
  return msw.post("/api/habits", async ({ request }) => {
    bodies.push(await request.json());

    return HttpResponse.json(makeHabit({ id: READ, name: "Read 30 minutes" }), { status: 201 });
  });
}

/** Captures the body of PATCH /habits/:id. */
function updateHabitHandler(bodies: unknown[]) {
  return msw.patch("/api/habits/:id", async ({ request }) => {
    bodies.push(await request.json());

    return HttpResponse.json(makeHabit({ id: READ, name: "Read 30 minutes" }));
  });
}

function renderForm(habit?: Habit) {
  window.localStorage.setItem("lifeos.userId", USER_ID);

  return renderWithProviders(
    <HabitFormDialog open onOpenChange={() => {}} today="2026-08-19" habit={habit} />,
  );
}

describe("HabitFormDialog", () => {
  it("sends only the keys that were filled in", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), createHabitHandler(bodies));
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Read 30 minutes");
    await user.click(screen.getByRole("button", { name: "Create habit" }));

    // No `description`, no `endDate`, no `targetValue`, no `status`: the API
    // runs forbidNonWhitelisted, and an empty string is not an absent field.
    // `status` is left to the service, which defaults it to ACTIVE.
    await waitFor(() =>
      expect(bodies).toEqual([
        {
          name: "Read 30 minutes",
          frequency: "DAILY",
          frequencyTarget: 1,
          startDate: "2026-08-19T12:00:00.000Z",
        },
      ]),
    );
  });

  it("anchors the dates at midday UTC, so a @db.Date column keeps the day typed", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), createHabitHandler(bodies));
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Marathon block");
    await user.type(screen.getByLabelText("End date"), "2026-12-31");
    await user.click(screen.getByRole("button", { name: "Create habit" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      startDate: "2026-08-19T12:00:00.000Z",
      endDate: "2026-12-31T12:00:00.000Z",
    });
  });

  it("carries the frequency and its target", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), createHabitHandler(bodies));
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Run");
    await user.click(screen.getByRole("button", { name: "Weekly" }));

    const target = screen.getByLabelText("Times per period");
    await user.clear(target);
    await user.type(target, "3");

    expect(screen.getByText("3 times per week")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create habit" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ frequency: "WEEKLY", frequencyTarget: 3 });
  });

  it("refuses a frequency target the CHECK constraint would reject", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), createHabitHandler(bodies));
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Run");

    const target = screen.getByLabelText("Times per period");
    await user.clear(target);
    await user.type(target, "0");

    await user.click(screen.getByRole("button", { name: "Create habit" }));

    expect(await screen.findByText("Enter a whole number, 1 or more")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("refuses an end date before the start date, as the service would", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), createHabitHandler(bodies));
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Run");
    await user.type(screen.getByLabelText("End date"), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Create habit" }));

    expect(await screen.findByText("Must not be before the start date")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("sends the numeric target only when the box is ticked", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), createHabitHandler(bodies));
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Drink water");
    await user.click(screen.getByLabelText("Has a numeric target"));
    await user.type(screen.getByLabelText("Target"), "2");
    await user.type(screen.getByLabelText("Unit"), "litres");
    await user.click(screen.getByRole("button", { name: "Create habit" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ targetValue: 2, targetUnit: "litres" });
  });

  it("sends every field on edit, nulling the ones that were cleared", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), updateHabitHandler(bodies));
    renderForm(
      makeHabit({
        id: READ,
        name: "Read 30 minutes",
        description: "Before bed",
        startDate: "2026-01-01T00:00:00.000Z",
        targetValue: 30,
        targetUnit: "minutes",
      }),
    );

    // Clearing two fields that the habit currently has values for.
    await user.clear(screen.getByLabelText("Description"));
    await user.click(screen.getByLabelText("Has a numeric target"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // `UpdateHabitDto` is a PartialType, so an omitted key keeps its stored
    // value — only an explicit null clears one.
    await waitFor(() =>
      expect(bodies).toEqual([
        {
          name: "Read 30 minutes",
          description: null,
          frequency: "DAILY",
          frequencyTarget: 1,
          targetValue: null,
          targetUnit: null,
          startDate: "2026-01-01T12:00:00.000Z",
          endDate: null,
          status: "ACTIVE",
        },
      ]),
    );
  });

  it("carries a status change through the same patch", async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];

    server.use(meHandler(), updateHabitHandler(bodies));
    renderForm(makeHabit({ id: READ, name: "Read 30 minutes" }));

    await user.click(screen.getByRole("button", { name: "Paused" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ status: "PAUSED" });
  });

  it("offers no status while creating, since the service applies ACTIVE", () => {
    server.use(meHandler());
    renderForm();

    expect(screen.queryByRole("button", { name: "Paused" })).not.toBeInTheDocument();
  });

  it("shows what the API rejected instead of closing", async () => {
    const user = userEvent.setup();

    server.use(
      meHandler(),
      msw.post("/api/habits", () =>
        HttpResponse.json({ message: ["name must be shorter"] }, { status: 400 }),
      ),
    );
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Read");
    await user.click(screen.getByRole("button", { name: "Create habit" }));

    expect(await screen.findByText("name must be shorter")).toBeInTheDocument();
  });
});
