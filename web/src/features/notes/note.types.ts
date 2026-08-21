/**
 * Free-form personal information — foundation section 9.
 *
 * Unlike `Metric` and `LifeEvent`, a note **has** an `updatedAt`: it is edited
 * like any other record, which is exactly why the timeline it belongs to needed
 * a tie-breaker on `id` rather than being able to lean on append-only ordering.
 */
export type Note = {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  areaId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteFilters = {
  /** Case-insensitive substring the API searches in both title and content. */
  q?: string;
  areaId?: string;
};
