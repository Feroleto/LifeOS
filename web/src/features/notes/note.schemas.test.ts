import { describe, expect, it } from "vitest";

import { noteFormDefaults, noteFormSchema, toCreateNoteBody, toUpdateNoteBody } from "./note.schemas";

const AREA_ID = "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f";

function values(overrides: Partial<ReturnType<typeof noteFormDefaults>> = {}) {
  return { ...noteFormDefaults(), content: "Something worth keeping", ...overrides };
}

describe("noteFormSchema", () => {
  it("refuses empty content, which @MinLength(1) would reject anyway", () => {
    expect(noteFormSchema.safeParse(values({ content: "   " })).success).toBe(false);
  });

  it("takes a note with no title and no area", () => {
    expect(noteFormSchema.safeParse(values()).success).toBe(true);
  });
});

describe("toCreateNoteBody", () => {
  it("drops the empty title and area rather than sending \"\"", () => {
    const body = toCreateNoteBody(values());

    expect(body).toEqual({ content: "Something worth keeping" });
  });

  it("keeps the ones that were filled in", () => {
    const body = toCreateNoteBody(values({ title: " Blood test ", areaId: AREA_ID }));

    expect(body).toEqual({
      title: "Blood test",
      content: "Something worth keeping",
      areaId: AREA_ID,
    });
  });
});

describe("toUpdateNoteBody", () => {
  it("sends explicit nulls, since an omitted key would keep what is stored", () => {
    const body = toUpdateNoteBody(values({ title: "", areaId: "" }));

    expect(body).toEqual({
      title: null,
      content: "Something worth keeping",
      areaId: null,
    });
  });
});
