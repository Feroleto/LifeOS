import { toPercentage } from "./goal-progress";

describe("toPercentage", () => {
  it("computes the foundation's own example", () => {
    // Section 8: study_hours = 9.5 toward a 15 hour goal.
    expect(toPercentage(15, 9.5)).toBe(63.3);
  });

  it("rounds to one decimal", () => {
    expect(toPercentage(3, 1)).toBe(33.3);
    expect(toPercentage(7, 5)).toBe(71.4);
  });

  it("reports past 100 rather than capping", () => {
    expect(toPercentage(10, 25)).toBe(250);
  });

  it("has no answer for a qualitative goal", () => {
    expect(toPercentage(null, 4)).toBeNull();
  });

  it("has no answer before anything was recorded", () => {
    expect(toPercentage(10, null)).toBeNull();
  });

  it("refuses a target of 0 instead of dividing by it", () => {
    // 0 is a legitimate target, but a ratio to it has no value, and calling it
    // achieved would invent a direction the model does not express.
    expect(toPercentage(0, 0)).toBeNull();
    expect(toPercentage(0, 5)).toBeNull();
  });

  it("reads a current value of 0 as no progress, not as missing", () => {
    expect(toPercentage(10, 0)).toBe(0);
  });
});
