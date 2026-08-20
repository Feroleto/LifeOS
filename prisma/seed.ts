import "dotenv/config";

import {
  EventSource,
  HabitFrequency,
  HabitStatus,
  MetricSource,
} from "../src/generated/prisma/enums";
import { prisma } from "../src/lib/prisma";
import {
  HABIT_COMPLETED,
  habitCompletionMetadata,
} from "../src/modules/habits/habit-events";

/**
 * Development data. Every step is skipped when its records already exist, so
 * `npm run db:seed` can run twice without doubling anything — areas through
 * `upsert`, habits and metric series through an existence check, since neither
 * has a unique key to upsert on.
 */

/** How much history the sample data covers. */
const METRIC_DAYS = 60;
/**
 * Shorter than the metric window on purpose: a habit at eight completions a day
 * is eight rows a day, and the habits page sweeps them all for the month.
 */
const COMPLETION_DAYS = 28;

const DAY_IN_MS = 86_400_000;

/**
 * Midday UTC, which is morning in America/Sao_Paulo — the seeded user's zone.
 * Anything near midnight would land on the neighbouring day once the API
 * buckets it by that zone.
 */
function daysAgo(days: number, hour = 12): Date {
  const date = new Date();

  date.setUTCHours(hour, 0, 0, 0);

  return new Date(date.getTime() - days * DAY_IN_MS);
}

/**
 * Deterministic pseudo-randomness, so a reseeded database looks the same as the
 * one it replaced and a chart does not change shape between runs.
 */
function wobble(step: number, seed: number): number {
  return Math.sin(step * 12.9898 + seed * 78.233) * 0.5 + 0.5;
}

type SeedMetric = {
  key: string;
  unit: string | null;
  /** Value for a given day offset, newest day being 0. */
  at: (daysBack: number) => number;
  /** Record one every N days — 1 is daily, 30 roughly monthly. */
  everyDays?: number;
};

type SeedHabit = {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  frequencyTarget: number;
  targetValue?: number;
  targetUnit?: string;
  /** Share of periods actually completed, 0..1 — what makes a streak look real. */
  adherence: number;
};

type SeedArea = {
  name: string;
  color: string;
  icon: string;
  habits: SeedHabit[];
  metrics: SeedMetric[];
};

const round = (value: number, places = 1) => Number(value.toFixed(places));

const AREAS: SeedArea[] = [
  {
    name: "Health",
    color: "#22c55e",
    icon: "heart",
    habits: [
      {
        name: "Drink water",
        description: "Eight glasses across the day.",
        frequency: HabitFrequency.DAILY,
        frequencyTarget: 8,
        targetValue: 250,
        targetUnit: "ml",
        adherence: 0.8,
      },
      {
        name: "Train",
        frequency: HabitFrequency.WEEKLY,
        frequencyTarget: 4,
        targetValue: 45,
        targetUnit: "minutes",
        adherence: 0.85,
      },
    ],
    metrics: [
      // Trends down over the window, so the card has a direction to show.
      {
        key: "body_weight",
        unit: "kg",
        at: (daysBack) => round(74.5 + (daysBack / METRIC_DAYS) * 2.4 + wobble(daysBack, 1) * 0.4),
      },
      {
        key: "sleep_hours",
        unit: "hours",
        at: (daysBack) => round(6.4 + wobble(daysBack, 2) * 2.1),
      },
    ],
  },
  {
    name: "Studies",
    color: "#3b82f6",
    icon: "book",
    habits: [
      {
        name: "Read 30 minutes",
        frequency: HabitFrequency.DAILY,
        frequencyTarget: 1,
        targetValue: 30,
        targetUnit: "minutes",
        adherence: 0.75,
      },
    ],
    metrics: [
      {
        key: "study_hours",
        unit: "hours",
        at: (daysBack) => round(0.5 + wobble(daysBack, 3) * 2.5),
      },
    ],
  },
  {
    name: "Finance",
    color: "#eab308",
    icon: "wallet",
    habits: [
      {
        name: "Review the budget",
        frequency: HabitFrequency.WEEKLY,
        frequencyTarget: 1,
        adherence: 0.9,
      },
    ],
    metrics: [
      {
        key: "monthly_expenses",
        unit: "BRL",
        everyDays: 30,
        at: (daysBack) => round(2400 + wobble(daysBack, 4) * 700, 2),
      },
    ],
  },
  {
    name: "Productivity",
    color: "#a855f7",
    icon: "target",
    habits: [
      {
        name: "Deep work block",
        description: "Two uninterrupted blocks a day.",
        frequency: HabitFrequency.DAILY,
        frequencyTarget: 2,
        targetValue: 50,
        targetUnit: "minutes",
        adherence: 0.7,
      },
    ],
    metrics: [
      { key: "focus", unit: null, at: (daysBack) => round(2 + wobble(daysBack, 5) * 3) },
    ],
  },
  {
    name: "Personal",
    color: "#f97316",
    icon: "user",
    habits: [
      {
        name: "Journal",
        frequency: HabitFrequency.DAILY,
        frequencyTarget: 1,
        adherence: 0.65,
      },
    ],
    metrics: [{ key: "mood", unit: null, at: (daysBack) => round(2 + wobble(daysBack, 6) * 3) }],
  },
];

/**
 * Weekdays a weekly habit lands on, most spread-out first: taking the first
 * `frequencyTarget` of these gives "four times a week" four distinct days
 * inside every Monday-to-Sunday week, which is the bucket the streak is counted
 * in (`habit-streak.ts`). Scattering them at random would split a week's target
 * across two of them and leave both unfulfilled.
 */
const WEEKDAY_SLOTS = [1, 3, 5, 6, 2, 4, 0];

/**
 * How many times the habit was carried out on one day of the window.
 *
 * Gaps are for **daily** habits only, through `adherence`: a missed day there
 * costs that day. A weekly or monthly habit is completed on schedule instead,
 * because one missed slot would leave its whole period short of the target and
 * every seeded streak would read zero — which is exactly what this data exists
 * to show.
 */
function completionsOn(habit: SeedHabit, date: Date, daysBack: number, seed: number): number {
  if (habit.frequency === HabitFrequency.DAILY) {
    return wobble(daysBack, seed) > habit.adherence ? 0 : habit.frequencyTarget;
  }

  if (habit.frequency === HabitFrequency.WEEKLY) {
    return WEEKDAY_SLOTS.slice(0, habit.frequencyTarget).includes(date.getUTCDay()) ? 1 : 0;
  }

  // Monthly: the first days of the month carry the target.
  return date.getUTCDate() <= habit.frequencyTarget ? 1 : 0;
}

/** The completions of one habit over the recent window, oldest first. */
function completionDates(habit: SeedHabit, seed: number): Date[] {
  const dates: Date[] = [];

  for (let daysBack = COMPLETION_DAYS - 1; daysBack >= 0; daysBack -= 1) {
    const day = daysAgo(daysBack);

    for (let index = 0; index < completionsOn(habit, day, daysBack, seed); index += 1) {
      // Spread through waking hours so several completions on one day are
      // distinct instants, the way real ones would be.
      dates.push(daysAgo(daysBack, 8 + index * 2));
    }
  }

  return dates;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "feroletoguilherme@gmail.com" },
    update: {},
    create: {
      name: "Guilherme Feroleto",
      email: "feroletoguilherme@gmail.com",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
  });

  let habitsCreated = 0;
  let completionsCreated = 0;
  let metricsCreated = 0;

  for (const [areaIndex, seedArea] of AREAS.entries()) {
    const { habits, metrics, ...areaData } = seedArea;

    const area = await prisma.area.upsert({
      where: { userId_name: { userId: user.id, name: areaData.name } },
      update: {},
      create: { userId: user.id, ...areaData },
    });

    for (const [habitIndex, seedHabit] of habits.entries()) {
      // HABIT has no unique key on (userId, name), so this stands in for the
      // upsert: a habit already seeded keeps whatever the user has done to it.
      const existing = await prisma.habit.findFirst({
        where: { userId: user.id, name: seedHabit.name },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const { adherence: _adherence, ...habitData } = seedHabit;

      const habit = await prisma.habit.create({
        data: {
          ...habitData,
          userId: user.id,
          areaId: area.id,
          status: HabitStatus.ACTIVE,
          startDate: daysAgo(COMPLETION_DAYS),
        },
      });

      habitsCreated += 1;

      // Completions are events, not rows of a habit table — see habit-events.ts.
      const dates = completionDates(seedHabit, areaIndex * 10 + habitIndex);

      if (dates.length > 0) {
        const { count } = await prisma.event.createMany({
          data: dates.map((occurredAt) => ({
            userId: user.id,
            type: HABIT_COMPLETED,
            source: EventSource.CORE,
            occurredAt,
            metadata: habitCompletionMetadata(habit.id),
          })),
        });

        completionsCreated += count;
      }
    }

    for (const series of metrics) {
      // METRIC is append-only and has no natural unique key, so a series that
      // already holds readings is left exactly as it is.
      const recorded = await prisma.metric.count({ where: { userId: user.id, key: series.key } });

      if (recorded > 0) {
        continue;
      }

      const step = series.everyDays ?? 1;
      const readings = [];

      for (let daysBack = METRIC_DAYS - 1; daysBack >= 0; daysBack -= step) {
        readings.push({
          userId: user.id,
          areaId: area.id,
          key: series.key,
          value: series.at(daysBack),
          unit: series.unit,
          recordedAt: daysAgo(daysBack),
          // No default in the schema — MetricsService is what applies CORE, and
          // createMany goes around the service.
          source: MetricSource.CORE,
          metadata: {},
        });
      }

      const { count } = await prisma.metric.createMany({ data: readings });

      metricsCreated += count;
    }
  }

  const areas = await prisma.area.count({ where: { userId: user.id } });

  console.log(
    `Seed concluded: user ${user.email} with ${areas} areas, ` +
      `${habitsCreated} new habits (${completionsCreated} completions) ` +
      `and ${metricsCreated} new measurements.`,
  );
  // Use this id in the X-User-Id header while the API has no authentication.
  console.log(`X-User-Id: ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
