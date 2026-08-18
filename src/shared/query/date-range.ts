import { BadRequestException } from "@nestjs/common";

export interface DateRange {
  from?: Date;
  to?: Date;
}

/**
 * Builds an inclusive Prisma range filter, or `undefined` when neither bound was
 * given — assigning `undefined` to a `where` key leaves the field unfiltered.
 *
 * Shared by events and metrics, which page through time on different columns
 * (`occurredAt` and `recordedAt`).
 */
export function toDateRangeFilter({ from, to }: DateRange): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) {
    return undefined;
  }

  if (from && to && to < from) {
    throw new BadRequestException("`to` must not be before `from`");
  }

  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}
