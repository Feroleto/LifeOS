import { DEFAULT_PAGE_SIZE, resolvePagination, toPage } from "./pagination";

describe("resolvePagination", () => {
  it("falls back to the first page of the default size", () => {
    expect(resolvePagination({})).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("turns a 1-based page into an offset", () => {
    expect(resolvePagination({ page: 3, limit: 20 })).toEqual({
      page: 3,
      limit: 20,
      skip: 40,
      take: 20,
    });
  });

  it("defaults each side independently", () => {
    expect(resolvePagination({ limit: 10 })).toMatchObject({ page: 1, skip: 0, take: 10 });
    expect(resolvePagination({ page: 2 })).toMatchObject({ limit: DEFAULT_PAGE_SIZE, skip: 50 });
  });
});

describe("toPage", () => {
  it("reports how many pages the total spans", () => {
    expect(toPage([], 1284, 2, 50).meta).toEqual({
      total: 1284,
      page: 2,
      limit: 50,
      pages: 26,
    });
  });

  it("does not round an exact multiple up to an extra empty page", () => {
    expect(toPage([], 100, 1, 50).meta.pages).toBe(2);
  });

  it("reports no pages at all for an empty collection", () => {
    expect(toPage([], 0, 1, 50).meta.pages).toBe(0);
  });
});
