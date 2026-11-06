# FeedbackPulse

FeedbackPulse is a multi-tenant customer feedback, public roadmap, and changelog SaaS. It uses a Hono API, a React 19/Vite SPA, PostgreSQL, Drizzle ORM, and end-to-end Hono RPC types.

## Stack

- API: Hono, Zod, Drizzle ORM, JWT authentication
- Web: React 19, Vite, Tailwind CSS, shadcn-style UI primitives
- Database: PostgreSQL 16+ with 24 tables, 14 enums, partial unique indexes, and trigger-owned counters
- UI foundations: dark/light/system theme, English and Spanish locale dictionaries, Hono `hc<AppType>` client
- Testing: Node test runner and isolated PGlite databases

## Repository layout

```text
apps/
  api/
    src/db/schema/       Modular Drizzle schema (source of truth)
    src/db/migrations/   Generated Drizzle migrations
    src/db/sql/          Idempotent triggers, guards, and counter functions
    src/db/queries/      Transactional business queries such as toggleVote()
    src/index.ts         Hono routes and AppType export
    tests/               API integration tests using PGlite
  web/
    src/lib/api.ts       Typed Hono RPC client
    src/locales/         UI translation dictionaries
    src/context/         Authentication and theme providers
docs/
  database-architecture.md
  db-handoff.md
```

## Prerequisites

- Node.js 20 or newer; Node 22 LTS is recommended because it matches CI
- npm 10 or newer
- PostgreSQL 16 or newer, locally or through Docker

## Quickstart for a new local environment

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create the API environment file.

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   PowerShell:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   ```

3. Set a unique `JWT_SECRET` of at least 32 characters and point `DATABASE_URL` at the intended database.

4. Start PostgreSQL.

   ```bash
   docker compose up -d postgres
   ```

5. Apply migrations, install database guards, and seed demo data.

   ```bash
   npm run db:setup
   ```

   `db:setup` runs `db:migrate`, then `db:post-migrate`, then `db:seed`. Do not run it against an existing shared or production database without reviewing the pending migrations first.

6. Verify the schema and application behavior.

   ```bash
   npm test
   npm run build
   ```

7. Start both development servers.

   ```bash
   npm run dev
   ```

   API: `http://localhost:3000`

   Web: `http://localhost:5173`

## Existing database workflow

The current 24-table schema is the canonical schema. If a database is already provisioned at that revision, no migration should be run just to start the application.

When a schema change is needed:

1. Edit the relevant file under `apps/api/src/db/schema/`.
2. Generate a migration:

   ```bash
   npm run db:generate
   ```

3. Review the generated SQL in `apps/api/src/db/migrations/`.
4. Apply it only to the intended database:

   ```bash
   npm run db:migrate
   npm run db:post-migrate
   ```

5. Run the drift and invariant checks:

   ```bash
   npm run db:check
   npm run test:db
   ```

Never hand-edit generated migrations and never delete an applied migration. Run `db:post-migrate` after every migration so trigger and tenant-guard changes are installed.

## Demo data

`npm run db:seed` is idempotent. It creates:

| Entity | Value |
| --- | --- |
| Workspace | `Acme Software`, slug `acme` |
| Owner | `owner@acme.test` / `demo1234` |
| Admin | `admin@acme.test` / `demo1234` |
| Member | `member@acme.test` / `demo1234` |
| Content | 2 boards, 6 posts, 10 votes, 4 comments, 2 changelogs |

`npm run db:seed:reset` truncates data before seeding. Use it only against localhost after confirming `DATABASE_URL`.

## Database invariants

- `vote_count`, `comment_count`, activity timestamps, completion timestamps, and `updated_at` fields are maintained by PostgreSQL triggers.
- Application code must not write trigger-owned columns.
- Vote writes must use `toggleVote()` in `apps/api/src/db/queries/feedback.ts`.
- All business queries must be filtered by `workspace_id`.
- Public reads must exclude soft-deleted and non-approved content.
- Internal comments must never be returned to unauthenticated users or regular workspace members.
- Raw tokens, IP addresses, and password hashes must not be stored in plaintext.

## API

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/` | Public service directory |
| `GET` | `/api/health` | Public health and database probe |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/workspaces` | Public directory |
| `POST` | `/api/workspaces` | Authenticated; caller becomes `OWNER` |
| `GET` | `/api/workspaces/:slug` | Public workspace branding |
| `GET` | `/api/workspaces/:slug/dashboard` | Workspace-scoped dashboard data |
| `POST` | `/api/posts` | Active workspace member |
| `GET` | `/api/posts/:id` | Public approved post |
| `POST` | `/api/posts/:id/vote` | Active workspace member |
| `PATCH` | `/api/posts/:id/status` | Workspace `OWNER` or `ADMIN` |
| `GET` | `/api/posts/:id/comments` | Public comments; internal type requires admin |
| `POST` | `/api/posts/:id/comments` | Authenticated; internal notes require admin |
| `GET` | `/api/posts/:id/activity` | Public status activity |

Public post and comment responses do not include author email addresses.

## Verification commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-checks and builds both workspaces |
| `npm run lint` | Lints the web application |
| `npm run test:db` | Applies migrations and `post_migrate.sql` to PGlite and runs 21 invariant checks |
| `npm run test:auth` | Runs workspace, privacy, and admin-authorization API tests in PGlite |
| `npm test` | Runs the database and API test suites |
| `npm run db:check` | Checks generated migrations for drift |
| `npm run db:generate` | Generates a migration from the Drizzle schema |
| `npm run db:migrate` | Applies pending migrations to the configured database |
| `npm run db:post-migrate` | Reapplies idempotent triggers and guards |
| `npm run db:seed` | Seeds the idempotent demo workspace |
| `npm run db:setup` | Runs migrate, post-migrate, and seed for a new local database |

## Production build

```bash
npm run build
npm run start -w @feedbackpulse/api
```

Set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, and `VITE_API_URL` for the target environment. The API requires `JWT_SECRET` to be at least 32 characters.

## Further documentation

- [Database architecture](docs/database-architecture.md)
- [Database handoff and verification record](docs/db-handoff.md)
- [Agent and database operating rules](AGENTS.md)
