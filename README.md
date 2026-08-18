# Life OS

Personal Life Operating System. The product and domain definition lives in
[`life-os-foundation.md`](./life-os-foundation.md).

Current state: **backend V1 — users, areas and goals** on PostgreSQL + Prisma 7.

## Stack

| Layer      | Technology               |
| ---------- | ------------------------ |
| Backend    | NestJS 11                |
| Database   | PostgreSQL 16 (Docker)   |
| ORM        | Prisma 7 (`prisma-client` + `@prisma/adapter-pg` driver adapter) |
| Validation | class-validator + global ValidationPipe; environment via zod |
| Tests      | Jest (unit) + Supertest (e2e against a real Postgres) |
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
| PATCH  | `/goals/:id`   | `areaIds` replaces the whole set of areas   |
| DELETE | `/goals/:id`   | 204                                         |
| POST   | `/habits`      | `status` defaults to `ACTIVE`               |
| GET    | `/habits`      | filters `?status=` and `?frequency=`        |
| GET    | `/habits/:id`  |                                             |
| PATCH  | `/habits/:id`  |                                             |
| DELETE | `/habits/:id`  | 204                                         |
| POST   | `/events`      | `source` defaults to `CORE`, `metadata` to `{}` |
| GET    | `/events`      | filters `?type=`, `?source=`, `?from=`, `?to=`  |
| GET    | `/events/:id`  |                                             |
| DELETE | `/events/:id`  | 204                                         |
| POST   | `/metrics`     | `source` defaults to `CORE`, `metadata` to `{}` |
| GET    | `/metrics`     | filters `?key=`, `?source=`, `?from=`, `?to=`   |
| GET    | `/metrics/:id` |                                             |
| DELETE | `/metrics/:id` | 204                                         |
| POST   | `/notes`       |                                             |
| GET    | `/notes`       | `?q=` searches title and content, case-insensitive |
| GET    | `/notes/:id`   |                                             |
| PATCH  | `/notes/:id`   |                                             |
| DELETE | `/notes/:id`   | 204                                         |

### Append-only records

**Events and metrics have no `PATCH`.** The schema gives them a `createdAt` but no
`updatedAt`, which is the model saying an occurrence or a measurement is not edited
after the fact. A wrong record is deleted and recorded again, so history is never
silently rewritten. Habits and notes do have `updatedAt` and take the usual `PATCH`.

`from` and `to` are inclusive and apply to `occurredAt` for events and to `recordedAt`
for metrics — the columns their indexes are built on. Both are the moment the thing
happened, as opposed to `createdAt`, which is when it reached the database. A range
whose `to` precedes its `from` is a 400.

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

## Commits

Two Husky hooks guard every commit:

| Hook         | What it runs                        | Why it fails                         |
| ------------ | ----------------------------------- | ------------------------------------ |
| `pre-commit` | `npx tsc --noEmit` then `npm test`  | A type error or a failing unit test  |
| `commit-msg` | `commitlint --edit`                 | A message that is not conventional   |

`pre-commit` takes a few seconds — the unit tests need no database. It stops at the
first failure, so a type error never reaches the test run. Use `git commit --no-verify`
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
life-os-model.sql          # hand-written reference SQL model
life-os-foundation.md      # product and domain foundation
```

## Tests

- **Unit** (`npm test`): services with a mocked `PrismaService`, no database.
- **E2E** (`npm run test:e2e`): boot the whole app (the same pipeline as `main.ts`)
  against the `lifeos_test` database defined in `.env.test`. The global setup creates the
  database and applies the migrations; each test starts from `TRUNCATE "USER" CASCADE`.
  The setup refuses to run if `DATABASE_URL` does not point at a database with "test" in
  its name.

Prerequisite: `npm run db:up`.

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

1. Pagination on `/events` and `/metrics`. They are append-only and grow without bound,
   so today a list request returns the user's whole history.
2. Timeline (events + notes) and goal progress calculation.
3. Real authentication, replacing `CurrentUserGuard`.
4. React frontend + dashboard.
