# Life OS

Personal Life Operating System. The product and domain definition lives in
[`life-os-foundation.md`](./life-os-foundation.md).

Current state: **backend V1** (users, areas, goals, habits, events, metrics, notes) on
PostgreSQL + Prisma 7, plus a **web V1** in [`web/`](./web) covering areas and goals.

## Stack

| Layer      | Technology               |
| ---------- | ------------------------ |
| Backend    | NestJS 11                |
| Database   | PostgreSQL 16 (Docker)   |
| ORM        | Prisma 7 (`prisma-client` + `@prisma/adapter-pg` driver adapter) |
| Validation | class-validator + global ValidationPipe; environment via zod |
| Tests      | Jest (unit) + Supertest (e2e against a real Postgres) |
| Frontend   | React 19 + Vite (SPA in `web/`) |
| Web state  | TanStack Query (server state) + React Router 7 |
| Web forms  | react-hook-form + zod mirroring the DTOs |
| Web UI     | Tailwind 4 + shadcn/ui |
| Web tests  | Vitest + Testing Library + MSW |
| Language   | TypeScript               |

## Setup

```bash
cp .env.example .env      # adjust credentials if you want
npm install
npm run db:up             # starts Postgres (host:5433 -> container:5432)
npm run db:migrate        # applies the migrations
npm run db:generate       # generates the Prisma Client into src/generated/prisma
npm run db:seed           # creates the initial user + the 5 base areas (prints the X-User-Id)
npm run start:dev         # API on http://localhost:3000/api
```

Then, in a second terminal, the web app:

```bash
npm run web:install       # web/ is a separate npm project with its own node_modules
npm run web:dev           # http://localhost:5173
```

Open <http://localhost:5173>, paste the `X-User-Id` that `db:seed` printed, and you are in.

The API enables **no CORS**. The Vite dev server proxies `/api` to
`http://localhost:3000` instead, so the browser only ever sees one origin — which is also
how a deployed build would be served. Because of that the web app always calls `/api/...`
relative to its own origin; an absolute `http://localhost:3000` URL would be blocked.

## API

Global prefix: `/api`.

| Method | Route          | Notes                                       |
| ------ | -------------- | ------------------------------------------- |
| GET    | `/health`      | Public; pings the database                  |
| POST   | `/users`       | Public (the way to create the first user)   |
| GET    | `/users/me`    |                                             |
| PATCH  | `/users/me`    |                                             |
| DELETE | `/users/me`    | 204; cascades to everything the user owns   |
| POST   | `/areas`       |                                             |
| GET    | `/areas`       |                                             |
| GET    | `/areas/:id`   |                                             |
| PATCH  | `/areas/:id`   |                                             |
| DELETE | `/areas/:id`   | 204                                         |
| POST   | `/goals`       | accepts `areaIds: string[]` (N:N)           |
| GET    | `/goals`       | filters `?status=` and `?areaId=`           |
| GET    | `/goals/:id`   | returns `areas` already flattened           |
| GET    | `/goals/:id/progress` | calculated per request, never stored |
| PATCH  | `/goals/:id`   | `areaIds` replaces the whole set of areas   |
| DELETE | `/goals/:id`   | 204                                         |
| POST   | `/habits`      | `status` defaults to `ACTIVE`               |
| GET    | `/habits`      | filters `?status=` and `?frequency=`        |
| GET    | `/habits/:id`  |                                             |
| POST   | `/habits/:id/completions` | records an `HABIT_COMPLETED` event |
| GET    | `/habits/:id/completions` | paginated; filters `?from=`, `?to=` |
| GET    | `/habits/:id/summary` | current period, target and streak    |
| PATCH  | `/habits/:id`  |                                             |
| DELETE | `/habits/:id`  | 204                                         |
| POST   | `/events`      | `source` defaults to `CORE`, `metadata` to `{}` |
| GET    | `/events`      | paginated; filters `?type=`, `?source=`, `?from=`, `?to=` |
| GET    | `/events/:id`  |                                             |
| DELETE | `/events/:id`  | 204                                         |
| POST   | `/metrics`     | `source` defaults to `CORE`, `metadata` to `{}` |
| GET    | `/metrics`     | paginated; filters `?key=`, `?source=`, `?from=`, `?to=`  |
| GET    | `/metrics/:id` |                                             |
| DELETE | `/metrics/:id` | 204                                         |
| POST   | `/notes`       |                                             |
| GET    | `/notes`       | `?q=` searches title and content, case-insensitive |
| GET    | `/notes/:id`   |                                             |
| PATCH  | `/notes/:id`   |                                             |
| DELETE | `/notes/:id`   | 204                                         |
| GET    | `/timeline`    | paginated; filters `?kind=`, `?from=`, `?to=` |

### Append-only records

**Events and metrics have no `PATCH`.** The schema gives them a `createdAt` but no
`updatedAt`, which is the model saying an occurrence or a measurement is not edited
after the fact. A wrong record is deleted and recorded again, so history is never
silently rewritten. Habits and notes do have `updatedAt` and take the usual `PATCH`.

`from` and `to` are inclusive and apply to `occurredAt` for events and to `recordedAt`
for metrics — the columns their indexes are built on. Both are the moment the thing
happened, as opposed to `createdAt`, which is when it reached the database. A range
whose `to` precedes its `from` is a 400.

### Pagination

`/events`, `/metrics`, `/timeline` and `/habits/:id/completions` are the paginated
collections — all of them views over append-only records — and they answer with an
envelope instead of a bare array:

```
GET /api/events?page=2&limit=50

{
  "data": [ ... ],
  "meta": { "total": 1284, "page": 2, "limit": 50, "pages": 26 }
}
```

`page` is 1-based and defaults to 1; `limit` defaults to 50 and is capped at 100. Values
outside those bounds — `page=0`, `page=1.5`, `limit=101` — are a 400 rather than a silent
clamp. A page past the end is not an error: it returns an empty `data` with the real
`total` and `pages`.

`total` counts everything the filters matched, not the page, and it is read in the same
transaction as the rows so the two describe one snapshot.

The other collections stay bare arrays on purpose. The asymmetry follows the domain
rather than taste: events and metrics are append-only and unbounded, while a person has a
handful of areas and a few dozen goals, habits and notes. Paginating those would be the
premature generalisation section 17 warns about.

One consequence worth knowing: both collections order by a `Timestamptz(0)` column, whose
one-second resolution makes ties common. `occurredAt` and `recordedAt` therefore cannot
order rows on their own — under `skip`/`take` a tie could hand the same row to two pages
and never return another — so `id` is appended as a tie-breaker to make the order total.

### Goal progress

`GET /goals/:id/progress` answers with the calculation, not with a stored column:

```
{ "goalId": "...", "targetValue": 15, "currentValue": 9.5, "percentage": 63.3, "source": "METRIC" }
```

Where `currentValue` comes from depends on the goal:

- **`MANUAL`** — the `currentValue` field on the goal, updated through `PATCH /goals/:id`.
- **`METRIC`** — the sum of `METRIC.value` for the goal's `metricKey`, restricted to the
  goal's own `startDate`/`targetDate` window. Setting `metricKey` makes the stored
  `currentValue` irrelevant, since the series is the answer.

`metricKey` is validated against the same rule as `METRIC.key`, so a goal can never name a
series the metrics endpoint would refuse to create.

`percentage` is `null` rather than a number in three cases, all of them "the question does
not apply": a goal with no `targetValue` is qualitative; a target of `0` has no ratio; and
nothing recorded yet is not the same as zero progress. It is **not** capped at 100 — beating
a target reports what actually happened. Foundation section 8 is the contract here, including
its refusal to introduce a polymorphic progress definition in V1.

Deriving progress costs one aggregate scoped to one goal's window, so `GET /goals` does not
embed it: a list of N goals would mean N extra queries. The list still carries `currentValue`,
which is all a manually tracked goal needs.

### Habit completions

A habit completion is **an event, not a table of its own**. `POST /habits/:id/completions`
writes an ordinary `HABIT_COMPLETED` event whose `metadata` names the habit:

```
{ "type": "HABIT_COMPLETED", "source": "CORE", "occurredAt": "...", "metadata": { "habitId": "..." } }
```

That follows foundation section 7.1, which places a completion in the event model, and
section 5.2, which references the source entity through `metadata` rather than through a
polymorphic key. Two consequences follow: the completion shows up in `/events` and in the
timeline without the habits module publishing it anywhere, and it is removed with
`DELETE /events/:id` — there is no separate delete route.

Two costs come with the choice, both deliberate. Nothing in the database makes a completion
unique per day, so `POST` twice records twice — the route is not idempotent. And deleting a
habit leaves its completions behind: there is no foreign key to cascade through, and the
sessions did happen, so dropping them would rewrite the timeline. `metadata.habitId` then
names a habit that no longer exists.

`GET /habits/:id/summary` answers where the habit stands **now**:

```
{ "period": "2026-W34", "completionsInPeriod": 3, "isFulfilled": false, "currentStreak": 2, ... }
```

- `period` is a day, an ISO week or a month, following the habit's `frequency`, and it is
  resolved in the **user's own time zone** — a run logged at 22:00 in São Paulo belongs to
  that day, not to the next one it falls on in UTC.
- A period counts as fulfilled at `frequencyTarget` completions, the same number the habit
  is defined by.
- `currentStreak` counts consecutive fulfilled periods. The period in progress never breaks
  it: an unfinished today falls back to counting from yesterday. Only a finished, unfulfilled
  period ends the streak.
- `countedSince` reports how far back the answer looked. History older than that window is
  not read, which is what keeps the query bounded.

### Timeline

`GET /timeline` is a read-only view that interleaves events and notes into one chronological
list. It owns no table: every row is served by `/events` or `/notes`, which stay the source
of truth, and creating a note does **not** emit a `NOTE_CREATED` event just to appear here
(foundation section 6).

Each item normalizes only what ordering needs and carries the original record intact:

```
{ "kind": "EVENT", "id": "...", "occurredAt": "...", "event": { ... } }
{ "kind": "NOTE",  "id": "...", "occurredAt": "...", "note":  { ... } }
```

`occurredAt` is the event's own `occurredAt`, and for a note the `createdAt` — when it was
written is when it belongs. `?kind=EVENT` or `?kind=NOTE` restricts it to one source;
`?from=`/`?to=` filter both.

Paging merges two tables, so each page reads its own `page * limit` rows from both and slices
the merged order. That is exactly enough to be correct — an item inside the merged window
cannot sit deeper than that in its own source — and it is why a deep page costs more than a
shallow one.

### Naming conventions the API enforces

- Event `type` must be `SCREAMING_SNAKE_CASE` (`TRAINING_COMPLETED`).
- Metric `key` must be `snake_case` (`sleep_hours`).

Both are the grouping dimension for analytics, so a stray `sleepHours` would quietly
become a second, separate series. The rules live in the DTOs, not in the database.

### User identification (temporary)

There is no authentication yet. Every non-public route requires the header:

```
X-User-Id: <user uuid>
```

`CurrentUserGuard` validates the format and that the user exists, then injects the id
through `@CurrentUser()`. When real auth lands, only the guard changes — controllers and
services stay as they are.

```bash
USER_ID=$(npm run -s db:seed | grep X-User-Id | cut -d' ' -f2)
curl localhost:3000/api/goals -H "X-User-Id: $USER_ID"
```

Scoping rules already covered by tests:

- Another user's resource returns **404**, never 403 (existence never leaks).
- Linking a goal to another user's area returns **400** — the foreign key alone does not
  protect this, because the constraint does not know the owner.

## Scripts

| Script                | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm run start:dev`   | API in watch mode                                  |
| `npm run build`       | Compiles to `dist/`                                |
| `npm run start:prod`  | Runs `dist/main.js`                                |
| `npm test`            | Unit tests (no database)                           |
| `npm run test:e2e`    | E2E tests against the `lifeos_test` database       |
| `npm run test:cov`    | Unit test coverage                                 |
| `npm run db:up`       | Starts the Postgres container                      |
| `npm run db:down`     | Stops the container (the volume is preserved)      |
| `npm run db:logs`     | Follows the Postgres logs                          |
| `npm run db:migrate`  | `prisma migrate dev` — creates/applies migrations  |
| `npm run db:deploy`   | `prisma migrate deploy` — applies migrations (prod)|
| `npm run db:reset`    | Drops the database, reapplies migrations, seeds    |
| `npm run db:generate` | Generates the Prisma Client                        |
| `npm run db:seed`     | Runs `prisma/seed.ts`                              |
| `npm run db:studio`   | Opens Prisma Studio                                |
| `npm run db:validate` | Validates the schema                               |
| `npm run db:format`   | Formats the schema                                 |
| `npm run commit`      | Guided commit (Commitizen)                         |
| `npm run web:install` | Installs the web app's dependencies                |
| `npm run web:dev`     | Web app in dev mode (http://localhost:5173)        |
| `npm run web:build`   | Typechecks and builds the web app to `web/dist`    |
| `npm run web:typecheck` | `tsc -b` over the web app                        |
| `npm run web:lint`    | oxlint over the web app                            |
| `npm run web:test`    | Web unit/component tests (Vitest)                  |

## Commits

Two Husky hooks guard every commit:

| Hook         | What it runs                        | Why it fails                         |
| ------------ | ----------------------------------- | ------------------------------------ |
| `pre-commit` | `npx tsc --noEmit` then `npm test`, plus the web gate when the commit touches `web/` | A type error or a failing test |
| `commit-msg` | `commitlint --edit`                 | A message that is not conventional   |

`pre-commit` takes a few seconds — the unit tests need no database. It stops at the
first failure, so a type error never reaches the test run.

The web gate (`web:typecheck`, `web:lint`, `web:test`) is conditional so that
backend-only commits cost what they always did. It keys off
`git diff --cached --name-only`, which reads the **staged** file list while the rest of
the hook checks the working tree — an inconsistency worth knowing about: staging only
backend files while `web/` is dirty skips the web gate. It also fails outright, rather
than skipping, when `web/node_modules` is missing, so a fresh clone cannot pass a gate
that never ran. Use `git commit --no-verify`
to skip both hooks when you knowingly need to (a WIP commit on a branch, for instance).

Note that the hooks check the **working tree**, not the staged snapshot: with a partial
`git add -p`, what runs includes changes you did not stage.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
A message that does not comply is rejected before the commit is created.

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

The easiest way to get it right is the guided prompt:

```bash
npm run commit          # asks for type, scope, subject, body and breaking changes
```

`git commit -m "..."` still works — it just has to pass the same rules.

| Type       | When to use it                                             |
| ---------- | ---------------------------------------------------------- |
| `feat`     | A new user-facing capability                                |
| `fix`      | A bug fix                                                   |
| `docs`     | Documentation only                                          |
| `style`    | Formatting only, no behaviour change                        |
| `refactor` | Neither fixes a bug nor adds a feature                       |
| `perf`     | Performance improvement                                     |
| `test`     | Adding or fixing tests                                      |
| `build`    | Build system, dependencies, Prisma generation               |
| `ci`       | CI configuration and scripts                                |
| `chore`    | Maintenance touching no `src/` or `test/` behaviour          |
| `revert`   | Reverts a previous commit                                    |

Rules worth knowing (full list in `commitlint.config.ts`):

- The scope is optional and must be kebab-case — use the module it touches
  (`goals`, `areas`, `users`, `prisma`, `config`).
- The subject must not start with a capital, has no trailing period, and the whole
  header is at most 100 characters including the type and scope.
- A breaking change goes in the footer as `BREAKING CHANGE: <description>`.

```
feat(goals): add status filter to the list endpoint
fix(areas): return 404 instead of 403 for another user's area
test(goals): cover ownership check on relation ids
build(deps): bump prisma to 7.9.1
```

Verifying a message without committing:

```bash
echo "feat(goals): add status filter" | npx commitlint
```

## Structure

```
.husky/pre-commit          # typecheck + unit tests
.husky/commit-msg          # runs Commitlint on every commit message
commitlint.config.ts       # Conventional Commits rules
prisma/
├── schema.prisma          # data model (source of truth for the ORM)
├── migrations/            # migration history
└── seed.ts                # initial data
prisma.config.ts           # Prisma CLI config (schema, migrations, seed, DATABASE_URL)
src/
├── main.ts                # bootstrap
├── app.module.ts          # module composition + global guard and filter
├── app.setup.ts           # config shared between main.ts and the e2e tests
├── config/env.ts          # environment validation (zod)
├── modules/
│   ├── users/             # controller + service + DTOs
│   ├── areas/
│   ├── goals/             # includes the N:N with areas
│   ├── habits/
│   ├── events/            # append-only: no update
│   ├── metrics/           # append-only: no update
│   └── notes/
├── shared/
│   ├── prisma/            # global PrismaModule + PrismaService
│   ├── auth/              # CurrentUserGuard, @CurrentUser, @Public
│   ├── filters/           # Prisma errors -> HTTP (P2002 -> 409, etc.)
│   ├── query/             # date range filter shared by events and metrics
│   └── health/
├── generated/prisma/      # generated Prisma Client (not versioned)
└── lib/prisma.ts          # standalone client for scripts (seed)
test/                      # e2e (Supertest) + helpers
web/                       # the SPA — separate npm project, see below
life-os-model.sql          # hand-written reference SQL model
life-os-foundation.md      # product and domain foundation
```

### `web/`

```
vite.config.ts             # react + tailwind plugins, @ alias, /api proxy, vitest config
components.json            # shadcn/ui config
src/
├── main.tsx               # QueryClientProvider > BrowserRouter > IdentityProvider
├── App.tsx                # the route table
├── api/
│   ├── http.ts            # fetch wrapper: /api base, X-User-Id, query string, 204
│   ├── api-error.ts       # normalizes the API's three error shapes into ApiError
│   └── query-keys.ts      # the one place query keys are built
├── identity/              # the X-User-Id stand-in for auth: storage, context,
│                          # route guard and the /setup screen
├── features/
│   ├── areas/             # types, zod schemas + body mappers, api, queries, screens
│   └── goals/             # same, plus filters and the area picker
├── components/
│   ├── ui/                # generated by shadcn — not edited by hand
│   └── layout/            # app shell, loading/error/empty states, 404
├── lib/                   # date conversion, query client, error flattening
└── test/                  # vitest setup, MSW server, fixtures, renderWithProviders
```

Organised by feature rather than by layer: each slice mirrors a `src/modules/<name>` on
the backend, so a drift between a zod schema and its DTO shows up in one directory.

Four things about the web app that are not obvious from the code:

- **Types are hand-written**, not imported from `src/generated/prisma`. That client is
  gitignored, CommonJS, and wrong for the wire anyway — dates arrive as ISO strings, and
  `GoalsService` flattens `areas` before responding.
- **The form schema is not the request body.** Forms model "empty" as `""`, which the
  DTOs reject (`""` fails `@IsHexColor`), and `forbidNonWhitelisted` turns any extra key
  into a 400. `toCreateAreaBody` / `toUpdateGoalBody` and friends are that boundary: they
  drop empty keys on create and send explicit `null` on patch to clear a field.
- **`areaIds` is a whole-set replacement.** On `PATCH /goals/:id`, omitting the key keeps
  the current areas, `[]` removes them all, and an array swaps them — so the goal form
  always sends the complete selection, including the empty one.
- **Mutating an area invalidates goals too**, because goal responses embed the whole
  `Area` record.

## Tests

- **Unit** (`npm test`): services with a mocked `PrismaService`, no database.
- **E2E** (`npm run test:e2e`): boot the whole app (the same pipeline as `main.ts`)
  against the `lifeos_test` database defined in `.env.test`. The global setup creates the
  database and applies the migrations; each test starts from `TRUNCATE "USER" CASCADE`.
  The setup refuses to run if `DATABASE_URL` does not point at a database with "test" in
  its name.

Prerequisite: `npm run db:up`.

- **Web** (`npm run web:test`): Vitest + Testing Library, with MSW standing in for the
  API. The handlers are asserted against, not just stubbed — what is risky in this layer
  is the shape of the outgoing request (the header, the omitted empty query params,
  `areaIds: []`), which a hand-rolled `fetch` mock could not check. No database, no
  running API.

## Using the client

```ts
import { prisma } from "./src/lib/prisma";

const goals = await prisma.goal.findMany({
  where: { status: "ACTIVE" },
  include: { areas: { include: { area: true } } },
});
```

## Prisma 7 notes

- The generator is `prisma-client` (the old `prisma-client-js` is deprecated) and requires
  an explicit `output` — hence `src/generated/prisma`.
- `url` no longer lives in the `datasource` block: the CLI reads it from
  `prisma.config.ts` and the runtime gets it from the driver adapter.
- `new PrismaClient()` without an `adapter` fails — always import from `src/lib/prisma.ts`.
- `.env` is **not** loaded automatically; `prisma.config.ts` and `prisma/seed.ts` do
  `import "dotenv/config"` for that.

## CHECK constraints

The Prisma schema cannot express CHECK constraints. The `HABIT.frequencyTarget > 0` rule
(which exists in `life-os-model.sql`) lives in a hand-written migration:
`prisma/migrations/20260817145140_add_habit_frequency_target_check/`.

Implications:

- The constraint survives `migrate reset` and recreations, because migrations are replayed.
- The Prisma Client does **not** know about the rule: an invalid value only fails at the
  database, as a runtime error. Validate it in the application layer too
  (DTO / `class-validator`).
- To add another one: `npx prisma migrate dev --create-only --name <name>`, edit the SQL,
  then `npx prisma migrate dev`.

## Next steps

1. Real authentication, replacing `CurrentUserGuard`.
2. Web: the remaining Core screens — habits, notes and the timeline — and wiring the
   dashboard to `/goals/:id/progress` and `/habits/:id/summary`, which it does not read yet.
