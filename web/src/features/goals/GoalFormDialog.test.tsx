import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as msw } from "msw";
import { describe, expect, it } from "vitest";

import { areasHandler, makeArea, makeGoal } from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { GoalFormDialog } from "./GoalFormDialog";

const HEALTH = makeArea({ id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f", name: "Health" });
const STUDIES = makeArea({ id: "3c9a1b7e-2d4f-4a6b-9c8d-0e1f2a3b4c5d", name: "Studies" });

describe("GoalFormDialog", () => {
  it("sends areaIds as an empty array when every area is unchecked", async () => {
    const goal = makeGoal({
      id: "406f3367-a339-4aa8-a763-7b5164ef2a3e",
      title: "Run a 5K",
      areas: [HEALTH, STUDIES],
    });

    let body: unknown = null;

    server.use(
      areasHandler([HEALTH, STUDIES]),
      msw.patch("/api/goals/:id", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...goal, areas: [] });
      }),
    );

    const user = userEvent.setup();

    renderWithProviders(<GoalFormDialog open onOpenChange={() => {}} goal={goal} />);

    await user.click(await screen.findByLabelText("Health"));
    await user.click(screen.getByLabelText("Studies"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // Omitting the key would keep the current areas; only an explicit []
    // clears them, because GoalsService replaces the whole set.
    await expect.poll(() => body).toMatchObject({ areaIds: [] });
  });

  it("leaves the numeric target out entirely for a qualitative goal", async () => {
    let body: unknown = null;

    server.use(
      areasHandler([]),
      msw.post("/api/goals", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeGoal({ id: "x", title: "Read more" }), { status: 201 });
      }),
    );

    const user = userEvent.setup();

    renderWithProviders(<GoalFormDialog open onOpenChange={() => {}} />);

    await user.type(await screen.findByLabelText("Title"), "Read more");
    await user.click(screen.getByRole("button", { name: "Create goal" }));

    await expect.poll(() => body).toEqual({ title: "Read more" });
  });
});
