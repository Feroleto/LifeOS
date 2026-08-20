export const EVENT_SOURCE = ["CORE", "SOTREINA"] as const;
export type EventSource = (typeof EVENT_SOURCE)[number];

/**
 * `LifeEvent` rather than `Event`, which is a DOM global: shadowing it in a
 * browser project turns every unrelated `(event: Event)` handler into a silent
 * type error somewhere else.
 *
 * Events are append-only — the record has no `updatedAt` and the API exposes no
 * PATCH — so the only ways to change one are creating and deleting it.
 */
export type LifeEvent = {
  id: string;
  userId: string;
  type: string;
  source: EventSource;
  occurredAt: string;
  createdAt: string;
  /** Free-form JSONB. What is in it depends entirely on `type`. */
  metadata: Record<string, unknown>;
};
