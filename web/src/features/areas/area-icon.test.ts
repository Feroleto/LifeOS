import { describe, expect, it } from "vitest";

import { areaIcon } from "./area-icon";

/** The icons prisma/seed.ts writes, which must not fall back to the dot. */
const SEEDED = ["heart", "book", "wallet", "target", "user"];

describe("areaIcon", () => {
  it("resolves every icon the seed writes", () => {
    const fallback = areaIcon(null);

    for (const icon of SEEDED) {
      expect(areaIcon(icon), icon).not.toBe(fallback);
    }
  });

  it("still resolves the lucide names the design used before v1 renamed them", () => {
    expect(areaIcon("home")).toBe(areaIcon("house"));
    expect(areaIcon("pie-chart")).toBe(areaIcon("chart-pie"));
  });

  it("falls back for an unknown name instead of throwing", () => {
    expect(areaIcon("not-an-icon")).toBe(areaIcon(null));
  });
});
