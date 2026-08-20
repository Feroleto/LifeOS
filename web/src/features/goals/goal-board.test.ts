import { describe, expect, it } from "vitest";

import { makeGoal } from "@/test/handlers";
import { boardSummary, buildBoard, countByStatus } from "./goal-board";

const ACTIVE = makeGoal({ id: "a", title: "Run weekly" });
const PAUSED = makeGoal({ id: "b", title: "Save monthly", status: "PAUSED" });
const CANCELLED = makeGoal({ id: "c", title: "Learn guitar", status: "CANCELLED" });

describe("buildBoard", () => {
  it("orders the columns as the life of a goal, not as the enum", () => {
    const columns = buildBoard([], false);

    expect(columns.map((column) => column.status)).toEqual(["ACTIVE", "PAUSED", "COMPLETED"]);
  });

  it("adds the cancelled column only when it is asked for", () => {
    expect(buildBoard([CANCELLED], false).map((column) => column.status)).not.toContain("CANCELLED");
    expect(buildBoard([CANCELLED], true).at(-1)).toMatchObject({
      status: "CANCELLED",
      goals: [CANCELLED],
    });
  });

  it("keeps a column that holds nothing, so the board does not reflow", () => {
    const columns = buildBoard([ACTIVE], false);

    expect(columns).toHaveLength(3);
    expect(columns[1]).toMatchObject({ status: "PAUSED", goals: [], emptyLabel: "Nothing paused." });
  });
});

describe("boardSummary", () => {
  it("counts the cancelled goals in the total even while their column is hidden", () => {
    expect(boardSummary([ACTIVE, PAUSED, CANCELLED], null)).toBe(
      "1 goal in progress, 3 in total",
    );
  });

  it("names the area when one is filtered on", () => {
    expect(boardSummary([ACTIVE, ACTIVE], "Health")).toBe("2 goals in progress in Health, 2 in total");
  });
});

describe("countByStatus", () => {
  it("counts one status", () => {
    expect(countByStatus([ACTIVE, PAUSED, CANCELLED], "CANCELLED")).toBe(1);
  });
});
