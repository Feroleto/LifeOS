import { describe, expect, it } from "vitest";

import { greeting } from "./greeting";

describe("greeting", () => {
  it("changes at noon and at six", () => {
    expect(greeting(new Date(2026, 7, 19, 0, 0))).toBe("Good morning");
    expect(greeting(new Date(2026, 7, 19, 11, 59))).toBe("Good morning");
    expect(greeting(new Date(2026, 7, 19, 12, 0))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 7, 19, 17, 59))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 7, 19, 18, 0))).toBe("Good evening");
    expect(greeting(new Date(2026, 7, 19, 23, 59))).toBe("Good evening");
  });
});
