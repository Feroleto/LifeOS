import { describe, expect, it } from "vitest";

import { makeArea, makeGoal } from "@/test/handlers";
import { UNASSIGNED, groupGoalsByArea } from "./dashboard.selectors";

const HEALTH = makeArea({ id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f", name: "Health" });
const WORK = makeArea({ id: "1c9d6f2a-7b3e-4c5d-8e9f-0a1b2c3d4e5f", name: "Work" });

describe("groupGoalsByArea", () => {
  it("counts a goal in every area it belongs to", () => {
    const goals = [
      makeGoal({ id: "a", title: "Walk daily", areas: [HEALTH, WORK] }),
      makeGoal({ id: "b", title: "Ship V1", areas: [WORK], status: "COMPLETED" }),
    ];

    const [health, work] = groupGoalsByArea([HEALTH, WORK], goals);

    expect(health).toMatchObject({ name: "Health", total: 1, active: 1, completed: 0 });
    expect(work).toMatchObject({ name: "Work", total: 2, active: 1, completed: 1 });
  });

  it("keeps an area with no goals, so the grid still shows it", () => {
    expect(groupGoalsByArea([HEALTH], [])).toMatchObject([
      { name: "Health", total: 0, active: 0, completed: 0, nextGoal: null },
    ]);
  });

  it("picks the earliest dated active goal as the next one", () => {
    const goals = [
      makeGoal({ id: "a", title: "Later", areas: [HEALTH], targetDate: "2026-12-01T00:00:00.000Z" }),
      makeGoal({ id: "b", title: "Sooner", areas: [HEALTH], targetDate: "2026-09-01T00:00:00.000Z" }),
      makeGoal({ id: "c", title: "Undated", areas: [HEALTH] }),
    ];

    expect(groupGoalsByArea([HEALTH], goals)[0]?.nextGoal?.title).toBe("Sooner");
  });

  it("ignores a goal that is dated but no longer active", () => {
    const goals = [
      makeGoal({
        id: "a",
        title: "Done",
        areas: [HEALTH],
        status: "COMPLETED",
        targetDate: "2026-09-01T00:00:00.000Z",
      }),
    ];

    expect(groupGoalsByArea([HEALTH], goals)[0]?.nextGoal).toBeNull();
  });

  it("adds a trailing bucket only when some goal has no area", () => {
    expect(groupGoalsByArea([HEALTH], [makeGoal({ id: "a", title: "Loose" })])).toMatchObject([
      { id: HEALTH.id, total: 0 },
      { id: UNASSIGNED, name: "Unassigned", total: 1 },
    ]);

    expect(groupGoalsByArea([HEALTH], [makeGoal({ id: "b", title: "Filed", areas: [HEALTH] })])).toHaveLength(1);
  });
});
