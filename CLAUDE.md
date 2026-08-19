# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Life OS — a personal "life operating system": a modular monolith that records goals,
habits, events, metrics and notes, and turns them into analytics.

`life-os-foundation.md` is the product/domain contract, not just docs. Read it before
introducing any new entity — it defines what belongs in the Core vs. in a future module,
and section 17 lists architectural rules the schema is meant to obey.

Current state: backend V1 with the whole Core exposed over HTTP — `users`, `areas`,
`goals`, `habits`, `events`, `metrics` and `notes` — plus a web V1 in `web/` covering
`areas` and `goals`.

`events` and `metrics` are **append-only**: the schema gives them a `createdAt` but no
`updatedAt`, so their services and controllers deliberately expose no `update`/`PATCH`.
Treat a missing `updatedAt` as the model's way of saying a record is not edited, and do
not add one without the user deciding to change that contract.

`/events`, `/metrics`, `/timeline` and `/habits/:id/completions` are the paginated
collections — every one of them a view over unbounded, append-only records — and the only
ones answering `{ data, meta }` instead of a bare array. The shared pieces live in
`src/shared/query/pagination.ts`; defaults (page 1, limit 50) are resolved there rather
than as DTO field initializers, matching how services and not the schema decide a goal's
`ACTIVE`.

Both order by a `Timestamptz(0)` column, so ties are common and the timestamp alone is not
a total order: `id` is appended to `orderBy` because otherwise `skip`/`take` could return a
row on two pages and skip another. Keep the tie-breaker on any new paginated query.

## Three derived reads, and why they are shaped that way

None of these three stores its answer. All are governed by `life-os-foundation.md`, which
is the reason they look the way they do rather than the more obvious way.

**`GET /goals/:id/progress`** (foundation section 8). `Goal` carries two optional scalars:
`currentValue`, which the user maintains, and `metricKey`, which replaces it by summing the
matching `METRIC.value` over the goal's own date window. Two scalars, deliberately, because
section 8 rules out a polymorphic `GoalProgressDefinition` in V1. `metricKey` is validated
against `src/shared/domain/metric-key.ts` — the same rule metrics enforce, so a goal cannot
name a series metrics would reject. `percentage` is `null` for a qualitative goal, for a
target of `0`, and before anything is recorded; it is not capped at 100. It is **not**
embedded in `GET /goals`: the aggregate is scoped per goal, so a list would mean N queries.

**Habit completions are events, not a table** (sections 7.1 and 5.2). `POST
/habits/:id/completions` writes an `HABIT_COMPLETED` event whose `metadata.habitId` names
the habit; `src/modules/habits/habit-events.ts` holds the type and the JSONB filter. It
follows that the completion reaches the timeline for free and is deleted through
`DELETE /events/:id`, and that nothing enforces one per day — the route is not idempotent
and should not be made so without changing the model. Streaks bucket by the **user's own
`timezone`** (`habit-streak.ts`), never UTC: an evening completion in São Paulo would
otherwise land on the next day and break the streak the user sees. The in-progress period
never breaks a streak, and `STREAK_LOOKBACK_DAYS` bounds how far back the answer looked.

**`GET /timeline`** (section 6). A view owning no table, merging events and notes. Notes
belong to it directly — creating one must never emit a `NOTE_CREATED` event just to make it
appear, which would duplicate the record. Paging merges two tables by reading `skip + take`
from each and slicing the merged order (`timeline-item.ts` proves why that is enough), so a
deep page costs more than a shallow one.

## The web app

`web/` is a **separate npm project** (own `package.json`, `node_modules`, TypeScript and
`tsconfig`), not a workspace. Never add `web/**` to the root `tsconfig.json`: it is
`commonjs`, has no `jsx` and no `DOM` lib.

The API enables **no CORS**, by decision. The Vite dev server proxies `/api` instead, so
the client's base URL is always relative — an absolute `http://localhost:3000` breaks it.

Four rules the client encodes, each of which the backend would otherwise punish:

- **Types are hand-written** in `web/src/features/*/*.types.ts`. `src/generated/prisma`
  is gitignored, CommonJS, and describes the database rather than the wire (dates are
  ISO strings there; `areas` arrives flattened).
- **The form schema is not the request body.** `forbidNonWhitelisted` makes any extra key
  a 400, and `""` fails validators like `@IsHexColor`. The `to*Body` mappers next to each
  zod schema drop empty keys on create and send explicit `null` on patch to clear a
  field. Add fields there, not in the components.
- **`areaIds` replaces the whole set** on `PATCH /goals/:id`: omitted keeps, `[]` clears,
  an array swaps. The goal form always sends the full selection.
- **Errors have three shapes** and `PrismaExceptionFilter` puts the Prisma code where the
  others put the HTTP phrase. `api/api-error.ts` normalizes them; branch on `status`,
  never on the message text.

The visual identity comes from a Figma file (`M9gCdQiSAujkjbKt9PbSZd`, frame `3:10`), which
defines no Figma Variables — so `web/src/index.css` *is* the token layer, holding hex copied
from that file under shadcn's own variable names. Keeping those names is what lets Goals and
Areas inherit the theme without touching their components; change values there, not classes
in components. The `.dark` block is left at the shadcn defaults on purpose: the design is
light-only and the app ships no theme toggle, so it is dormant rather than designed.

Three things the design implies that the code has to earn:

- **The sidebar is driven by `GET /areas`**, not by Core concepts — the design's navigation
  is a list of life areas, so each item filters `/goals` by one area. `NavLink`'s own
  `isActive` ignores the query string, so the area items compare it themselves.
- **The dashboard shows only what the API sustains.** The design's cards promise habit
  streaks, task checkboxes, a balance and a course percentage; the Core has no habit
  completion log, no Task, no `Goal.currentValue` and no finance module. Those widgets are
  deliberately absent, not pending. Each card summarizes one `Area` from `GET /areas` plus
  `GET /goals` — two requests, no dashboard endpoint, and habits stay out because `Habit`
  has no relation to `Area`.
- **`Area.color` is darkened before it is used as text.** Stored colors are mid tones picked
  through a color input (`#22c55e`, `#eab308`) while the design's accents are dark enough to
  read on white, so `AreaBentoCard` mixes toward black in oklab and derives the light chip
  tint the same way. One column, two colors, no second field.

The dashboard reads two derived endpoints the API deliberately keeps off its list
responses, so each costs one request per record and the fan-out is narrowed before it is
made. `GET /goals/:id/progress` is asked only for the goals a bar will actually be drawn
for — the next goal of each area, and only where `targetValue` exists, since a qualitative
goal is guaranteed a null percentage — deduplicated, because a goal shared by two areas is
next in both. `GET /habits/:id/summary` is asked only for `ACTIVE` habits. Both use
`useQueries` with `combine`, and both drop a failed request instead of raising it: one goal
must not blank the card it shares. Widening either selection is what turns the page into
dozens of requests.

Query keys live in `web/src/api/query-keys.ts`. Mutating an **area** invalidates goals as
well, because goal responses embed the whole `Area` record.

The web gate in `.husky/pre-commit` only runs when the commit stages something under
`web/`, so backend-only commits keep their previous cost.

## Commands

```bash
npm run db:up          # Postgres in Docker — required before running the app or e2e tests
npm run start:dev      # API on http://localhost:3000/api
npm run build          # nest build -> dist/
npm test               # unit tests (no database)
npm run test:e2e       # e2e against the lifeos_test database
npx tsc --noEmit       # typecheck (includes prisma/ and test/, which nest build excludes)

npm run web:install    # web/ has its own node_modules
npm run web:dev        # SPA on http://localhost:5173, proxying /api to the API
npm run web:typecheck  # tsc -b over web/
npm run web:test       # Vitest (no database, no running API)
```

`tsconfig.build.json` puts `tsBuildInfoFile` **inside `dist/`** on purpose. `nest-cli.json`
sets `deleteOutDir: true`, so every build wipes `dist/`; at its default location (the
project root) the incremental state outlived the output it described, told tsc everything
was already emitted, and the build silently produced nothing — leaving `nest build`,
`start:dev` and `start:prod` failing with `Cannot find module dist/main` on any warm tree.
Keeping the two together makes that state impossible. Do not move it back out of `dist/`.

Single test:

```bash
npx jest goals.service                                  # unit, by filename
npx jest -t "defaults status to ACTIVE"                 # unit, by test name
npx jest --config test/jest-e2e.json -t "filters by"    # e2e, by test name
```

After editing `prisma/schema.prisma`: `npm run db:migrate` then `npm run db:generate`.
Migrate does **not** regenerate the client on its own here.

`npm run db:reset` is destructive and Prisma blocks it for AI agents — ask the user to
run it themselves rather than trying to bypass the guard.

## Commits

Two Husky hooks run on `git commit`. `pre-commit` runs `npx tsc --noEmit` then `npm test`
(`set -e` makes it stop at the first failure — without it the hook would exit with the
status of the last command and let a type error through). `commit-msg` runs Commitlint,
so a non-compliant message fails the commit instead of producing a bad one.
`commitlint.config.ts` is the contract; the README documents it for humans.

The hooks check the working tree, not the staged snapshot. Never pass `--no-verify` on
the user's behalf — if a hook fails, fix the cause or report it.

`<type>(<scope>): <subject>`, scope optional and kebab-case, named after the module
(`goals`, `areas`, `users`, `prisma`, `config`). Subject must not start with a capital
and takes no trailing period; the header caps at 100 characters.

Check a message before committing with `echo "feat(goals): ..." | npx commitlint`.
`npm run commit` opens the Commitizen prompt — it is interactive, so it is for the user,
not for an agent.

## Prisma 7 — where it differs from what you may remember

This project runs Prisma 7, which broke several Prisma 6 habits:

- The generator is `prisma-client` (not `prisma-client-js`) and emits **TypeScript
  source** into `src/generated/prisma/`, which is gitignored. A fresh clone does not
  compile until `npm run db:generate` runs.
- `datasource db` has **no `url`**. The CLI reads it from `prisma.config.ts`; the runtime
  gets it from the driver adapter. Adding `url` back makes `prisma validate` fail.
- `new PrismaClient()` without an `adapter` throws. Use the injected `PrismaService`
  (Nest) or `src/lib/prisma.ts` (standalone scripts).
- `.env` is **not** auto-loaded. Anything outside Nest's ConfigModule needs an explicit
  `import "dotenv/config"` — that is why `prisma.config.ts` and `prisma/seed.ts` have it.
- Import model types from `src/generated/prisma/client`, enums from
  `src/generated/prisma/enums`. Enums are `const` objects plus a type, not TS enums, so
  `@IsEnum(GoalStatus)` works but `GoalStatus.ACTIVE` is a plain string at runtime.

## Persistence

`prisma/schema.prisma` is the source of truth for the ORM. `life-os-model.sql` is the
hand-written reference model that preceded it — it is **never executed**, and it has
already diverged (Prisma emits native enum types where the SQL used `CHECK ... IN`).
Update it only if the user asks.

Tables are UPPERCASE (`"GOAL_AREA"`) via `@@map`; models are PascalCase. Raw SQL must
quote them.

Prisma cannot express CHECK constraints. `HABIT.frequencyTarget > 0` lives in a
hand-written migration (`..._add_habit_frequency_target_check`). Adding another one means
`npx prisma migrate dev --create-only`, editing the SQL, then `npx prisma migrate dev`.
Mirror such rules in DTOs too (`@Min(1)`), so violations surface as 400 instead of a
database error.

## Backend conventions

**User identity is temporary.** There is no authentication. `CurrentUserGuard` is global,
reads the `X-User-Id` header, validates it is a UUID belonging to a real user, and exposes
it through `@CurrentUser()`. Routes reachable without it are marked `@Public()` (only
`POST /users` and `GET /health`). When real auth arrives, only the guard changes.

**Every query is scoped by `userId`.** Two rules follow from that, and both are covered
by e2e tests:

- Another user's record returns **404, never 403** — services use
  `findFirst({ where: { id, userId } })` so existence never leaks.
- Relation ids coming from the client must be checked for ownership in the service
  (see `GoalsService.assertAreasBelongToUser`). Foreign keys do not help: the constraint
  does not know who owns the row, so a user could otherwise link their goal to someone
  else's area.

**Errors.** Services throw Nest exceptions for domain cases; `PrismaExceptionFilter`
translates known Prisma codes globally (P2002 → 409, P2025 → 404, P2003 → 400). Do not
wrap repository calls in try/catch for those.

**Shape of responses.** Join tables stay inside the service. `GoalsService` flattens
`areas: [{ area }]` into `areas: Area[]` before returning.

**`app.setup.ts`** holds the global prefix and `ValidationPipe` and is used by both
`main.ts` and the e2e tests. Configure the app there, not in `main.ts`, or the tests stop
exercising the real pipeline.

**Everything written down is English** — comments, identifiers, test names, log lines, API
error messages and documentation. `life-os-foundation.md` predates this and stays in
Portuguese. Conversation with the user is in Portuguese.

## Tests

Unit tests instantiate services directly with a hand-rolled Prisma mock (see
`goals.service.spec.ts`) — no Nest testing module, no database.

E2E tests boot the whole app against a **separate** `lifeos_test` database configured in
`.env.test`. `test/global-setup.ts` creates it, applies migrations, and refuses to run if
`DATABASE_URL` does not point at a database with "test" in its name. Each test starts from
`TRUNCATE "USER" CASCADE`, which clears everything because all tables cascade from `USER`.

## Environment

`docker-compose.yml` publishes Postgres on host port **5433**, because 5432 is already
taken by a local Postgres on this machine. `src/config/env.ts` validates the environment
with zod at boot, so a missing `DATABASE_URL` fails fast instead of at the first query.
