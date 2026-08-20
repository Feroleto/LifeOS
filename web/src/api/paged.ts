/** The envelope the unbounded collections answer with, instead of a bare array. */
export type PageMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};

/** `MAX_PAGE_SIZE` on the API — a larger `limit` fails validation with a 400. */
export const MAX_PAGE_SIZE = 100;

/**
 * How many pages a sweep will follow before giving up.
 *
 * The caller's window is what is meant to bound the answer; this only stops a
 * wide one from turning into an unbounded run of requests. A sweep that hits
 * the cap returns the most recent records and misses the oldest, since every
 * paginated collection here orders newest first.
 */
const MAX_PAGES = 5;

/**
 * Every record matching a query, following the pages the first answer reports.
 *
 * `/events` and `/metrics` are paginated because those collections are
 * unbounded, but a caller asking for a bounded window — a week, a month, ninety
 * days — wants the whole window and cannot draw a partial one. `meta.pages`
 * comes from the first response, so the common case of a single page costs
 * exactly one request.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, MAX_PAGE_SIZE);
  const pages = Math.min(first.meta.pages, MAX_PAGES);

  if (pages <= 1) {
    return first.data;
  }

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => fetchPage(index + 2, MAX_PAGE_SIZE)),
  );

  return [first.data, ...rest.map((response) => response.data)].flat();
}
