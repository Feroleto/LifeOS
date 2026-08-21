import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  USER_ID,
  areasHandler,
  habitsHandler,
  makeArea,
  makeCompletion,
  makeHabit,
  makeNote,
  meHandler,
  timelineHandler,
} from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { TimelinePage } from "./TimelinePage";
import type { TimelineItem } from "./timeline.types";

const HEALTH = makeArea({ id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f", name: "Health" });
const HABIT = makeHabit({ id: "h1", name: "Drink water" });

function eventItem(id: string, habitId: string, occurredAt: string): TimelineItem {
  return {
    kind: "EVENT",
    id,
    occurredAt,
    event: makeCompletion({ id, habitId, occurredAt }),
  };
}

function noteItem(id: string, title: string, createdAt: string): TimelineItem {
  return {
    kind: "NOTE",
    id,
    occurredAt: createdAt,
    note: makeNote({ id, title, content: "Written down", createdAt }),
  };
}

function renderTimeline() {
  window.localStorage.setItem("lifeos.userId", USER_ID);

  return renderWithProviders(<TimelinePage />, { route: "/timeline" });
}

describe("TimelinePage", () => {
  it("names the habit a completion belongs to, rather than showing its id", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      habitsHandler([HABIT]),
      timelineHandler([eventItem("e1", "h1", "2026-08-19T15:00:00.000Z")]),
    );

    renderTimeline();

    expect(await screen.findByText("Drink water")).toBeInTheDocument();
    expect(screen.queryByText(/h1/)).not.toBeInTheDocument();
  });

  it("still draws a completion whose habit is gone", async () => {
    // Completions outlive their habit: no foreign key cascades through JSON.
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      habitsHandler([]),
      timelineHandler([eventItem("e1", "deleted-habit", "2026-08-19T15:00:00.000Z")]),
    );

    renderTimeline();

    expect(await screen.findByText("Habit completed")).toBeInTheDocument();
  });

  it("shows notes next to events, with no NOTE_CREATED standing in for them", async () => {
    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      habitsHandler([HABIT]),
      timelineHandler([
        noteItem("n1", "Blood test", "2026-08-19T16:00:00.000Z"),
        eventItem("e1", "h1", "2026-08-19T15:00:00.000Z"),
      ]),
    );

    renderTimeline();

    expect(await screen.findByText("Blood test")).toBeInTheDocument();
    expect(screen.getByText("Drink water")).toBeInTheDocument();
  });

  it("restricts the feed to one source through the request", async () => {
    const user = userEvent.setup();

    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      habitsHandler([HABIT]),
      timelineHandler([
        noteItem("n1", "Blood test", "2026-08-19T16:00:00.000Z"),
        eventItem("e1", "h1", "2026-08-19T15:00:00.000Z"),
      ]),
    );

    renderTimeline();

    await screen.findByText("Blood test");
    await user.click(screen.getByRole("button", { name: "Notes" }));

    await waitFor(() => expect(screen.queryByText("Drink water")).not.toBeInTheDocument());
    expect(screen.getByText("Blood test")).toBeInTheDocument();
  });

  it("appends the next page instead of replacing what is shown", async () => {
    const user = userEvent.setup();

    // More than one page of 30, so `meta.pages` is what stops the button.
    const items = Array.from({ length: 35 }, (_, index) =>
      noteItem(`n${index}`, `Note ${index}`, `2026-08-19T${String(23 - (index % 24)).padStart(2, "0")}:00:00.000Z`),
    );

    server.use(meHandler(), areasHandler([HEALTH]), habitsHandler([]), timelineHandler(items));

    renderTimeline();

    expect(await screen.findByText("Note 0")).toBeInTheDocument();
    expect(screen.queryByText("Note 34")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Note 34")).toBeInTheDocument();
    // The first page is still there — appended, not replaced.
    expect(screen.getByText("Note 0")).toBeInTheDocument();
    // Nothing left to ask for, so the button goes.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument(),
    );
  });

  it("says so when nothing has been recorded", async () => {
    server.use(meHandler(), areasHandler([]), habitsHandler([]), timelineHandler([]));

    renderTimeline();

    expect(await screen.findByText("Nothing recorded yet")).toBeInTheDocument();
  });
});
