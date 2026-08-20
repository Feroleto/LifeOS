import { BadRequestException } from "@nestjs/common";

import type { PrismaService } from "../prisma/prisma.service";

/**
 * Rejects area ids the user does not own.
 *
 * The foreign key cannot do this: the constraint only knows that the row exists,
 * not who it belongs to, so without the check a user could file their habit —
 * or their goal, metric or note — under someone else's area.
 *
 * A 400 rather than the 404 an unreachable record gets: the id is an input here,
 * not the resource being addressed, and the caller needs to know which one was
 * wrong. Existence still does not leak — someone else's real area and an id that
 * matches nothing produce the same message.
 */
export async function assertAreasBelongToUser(
  prisma: PrismaService,
  userId: string,
  areaIds: string[],
): Promise<void> {
  if (areaIds.length === 0) {
    return;
  }

  const found = await prisma.area.findMany({
    where: { id: { in: areaIds }, userId },
    select: { id: true },
  });

  if (found.length === areaIds.length) {
    return;
  }

  const owned = new Set(found.map((area) => area.id));
  const invalid = areaIds.filter((areaId) => !owned.has(areaId));

  throw new BadRequestException(`Unknown area(s): ${invalid.join(", ")}`);
}

/**
 * The single-area version, for the records that carry one optional `areaId`
 * rather than a set of them.
 *
 * `null` is a legitimate value — it clears the area — and only `undefined` and
 * `null` skip the check. Passing them through the same helper is what keeps the
 * error message identical across every entity.
 */
export function assertAreaBelongsToUser(
  prisma: PrismaService,
  userId: string,
  areaId: string | null | undefined,
): Promise<void> {
  return assertAreasBelongToUser(prisma, userId, areaId == null ? [] : [areaId]);
}
