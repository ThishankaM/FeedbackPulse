# FeedbackPulse 🚀

> Modern, Multi-Tenant Customer Feedback, Public Roadmap & Changelog SaaS

FeedbackPulse is an open-source, high-performance customer feedback hub designed for SaaS products and modern software teams. It provides centralized feedback boards, voting, thread discussions, public roadmaps, and changelogs. Built with a full-stack TypeScript architecture using **Hono**, **React 19**, **Vite**, **PostgreSQL**, and **Drizzle ORM**, it guarantees 100% compile-time type safety via **Hono RPC**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Monorepo Architecture](#-monorepo-architecture)
- [Database & Data Layer Architecture](#-database--data-layer-architecture)
  - [24 Tables across 6 Clusters](#24-tables-across-6-functional-clusters)
  - [PostgreSQL Triggers & Counter Invariants](#postgresql-triggers--counter-invariants)
  - [Automated Invariant Test Suite](#automated-invariant-test-suite)
- [Authentication & Multi-Tenancy](#-authentication--multi-tenancy)
- [API Endpoints](#-api-endpoints)
- [Prerequisites](#-prerequisites)
- [Quickstart Guide](#-quickstart-guide)
- [Available Scripts](#-available-scripts)
- [Documentation & Architectural References](#-documentation--architectural-references)

---

## ✨ Key Features

- **Multi-Tenant by Design**: Complete workspace isolation backed by composite foreign keys and PostgreSQL database-level cross-tenant guards.
- **Enterprise-Grade Database Architecture**: 24 tables across 6 functional domains, 14 PostgreSQL enums, composite and partial unique indexes, and generated full-text search vectors.
- **Zero-Drift Atomic Counters**: Feedback vote counts (`vote_count`) and public comment counts (`comment_count`) are maintained exclusively by PostgreSQL triggers in `post_migrate.sql`—eliminating race conditions and manual counter increments.
- **Service-Free Invariant Testing**: Built-in `@electric-sql/pglite` test harness (`npm run test:db`) verifying 21 database and trigger invariants in-memory in milliseconds without needing an active database connection or Docker container.
- **End-to-End Type Safety**: Shared types between backend and frontend using Hono RPC (`hc<AppType>`), ensuring full compile-time validation for requests, responses, and parameters.
- **Authentication & Security**: JWT-based session tokens, salted password hashing via `bcryptjs`, and strict route authorization middleware.
- **Modern React 19 Frontend**: Lightweight Tailwind CSS interface with Dark/Light theme switching, centralized localization (`en.json`), and optimistic UI patterns.

---

## 🏗 Monorepo Architecture

The monorepo uses npm workspaces (`apps/*`) to isolate client and server code while enabling seamless code and type sharing:

```
FeedbackPulse/
├── apps/
│   ├── api/                            # Hono Backend API
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/             # Modular 24-table Drizzle schema
│   │   │   │   │   ├── _enums.ts       # 14 PostgreSQL native enums
│   │   │   │   │   ├── _helpers.ts     # Timestamps, UUID PKs, shared column helpers
│   │   │   │   │   ├── auth.ts         # Users, user_identities, sessions
│   │   │   │   │   ├── workspaces.ts   # Workspaces, workspace_members, invites
│   │   │   │   │   ├── feedback.ts     # Boards, posts, post_votes, comments, tags
│   │   │   │   │   ├── content.ts      # Roadmaps, status_definitions, changelog
│   │   │   │   │   ├── ops.ts          # Moderation, audit_logs, webhooks, notifications
│   │   │   │   │   ├── relations.ts    # Drizzle relational queries mapping
│   │   │   │   │   └── index.ts        # Schema barrel export
│   │   │   │   ├── migrations/         # Drizzle Kit generated SQL migrations
│   │   │   │   │   └── 0000_init_feedbackpulse.sql
│   │   │   │   ├── queries/            # Reusable business queries (e.g. toggleVote)
│   │   │   │   │   └── feedback.ts
│   │   │   │   ├── sql/
│   │   │   │   │   └── post_migrate.sql# 10 functions & 19 triggers for counters & guards
│   │   │   │   ├── client.ts           # PostgreSQL connection pool (pg driver)
│   │   │   │   ├── index.ts            # Database instance export
│   │   │   │   ├── schema.ts           # ESM-safe barrel file for Drizzle Kit
│   │   │   │   ├── seed.ts             # Programmatic developer seed generator
│   │   │   │   └── seed-cli.ts         # Interactive/CLI database seed runner
│   │   │   ├── lib/
│   │   │   │   └── auth.ts             # Password hashing (bcryptjs) & JWT utilities
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts             # Bearer JWT verification middleware
│   │   │   └── index.ts                # Hono server setup, REST endpoints & AppType
│   │   ├── scripts/
│   │   │   ├── db-invariants.mjs       # PGlite WASM invariant test suite (21 checks)
│   │   │   └── post-migrate.ts         # Cross-platform runner for post_migrate.sql
│   │   ├── drizzle.config.ts           # Drizzle Kit migration configuration
│   │   └── .env.example                # Backend environment configuration template
│   │
│   └── web/                            # React 19 + Vite Frontend SPA
│       ├── src/
│       │   ├── context/
│       │   │   ├── AuthContext.tsx     # User session state, tokens & memberships
│       │   │   └── ThemeProvider.tsx   # Dark/Light/System theme provider
│       │   ├── lib/
│       │   │   ├── api.ts              # Hono RPC typed client (hc<AppType>)
│       │   │   └── i18n.ts             # Centralized i18next internationalization
│       │   ├── locales/
│       │   │   └── en.json             # English copy dictionary (no hardcoded JSX strings)
│       │   ├── App.tsx                 # Main layout, auth modals, workspace onboarding
│       │   └── main.tsx                # Client application root
│       ├── vite.config.ts              # Vite bundler configuration
│       └── tsconfig.app.json           # Strict TypeScript configuration
│
├── .github/workflows/
│   └── db.yml                          # CI pipeline: schema typecheck, drift & test:db
├── docker-compose.yml                  # Local PostgreSQL 16 service definition
├── AGENTS.md                           # Strict development & database operating rules
├── docs/
│   ├── database-architecture.md        # Comprehensive DB schema & trigger documentation
│   └── db-handoff.md                   # Verification checklist & migration log
├── package.json                        # Monorepo root workspace orchestrator
└── README.md
```

---

## 🗄 Database & Data Layer Architecture

The database schema is defined modularly in `apps/api/src/db/schema/` using [Drizzle ORM](https://orm.drizzle.team/) targeting PostgreSQL 16+.

### 24 Tables across 6 Functional Clusters

| Cluster | Tables | Purpose |
| :--- | :--- | :--- |
| **1. Workspaces & Identity** | `workspaces`, `workspace_members`, `users`, `user_identities`, `sessions` | Organization tenants, membership RBAC (`OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`), credentials, and social SSO logins. |
| **2. Core Feedback Engine** | `boards`, `posts`, `post_votes`, `comments`, `tags`, `post_tags` | Multi-board feedback channels, posts with status tracking, upvoting engine, threaded comments, and categorization tags. |
| **3. Moderation & Audit Logs** | `moderation_events`, `audit_logs`, `content_filters`, `workspace_invites` | Moderation workflows (`PENDING`, `APPROVED`, `FLAGGED`, `REJECTED`, `SPAM`), tenant audit trails, automated keyword filters, and team invites. |
| **4. Roadmaps & Status Tracking** | `status_definitions`, `roadmap_views`, `roadmap_items` | Customizable Kanban roadmap columns (Planned, In Progress, Complete), post stage associations, and custom ordering. |
| **5. Changelog & Communication** | `changelog_posts`, `changelog_labels`, `changelog_post_labels` | Public product release notes, release labels (New, Improved, Fixed), and subscriber broadcasts. |
| **6. Notifications & Webhooks** | `notification_preferences`, `notifications`, `webhooks`, `webhook_deliveries` | Per-user event subscriptions, in-app notifications, and outbound HTTP webhooks with execution logs and retry status. |

### PostgreSQL Triggers & Counter Invariants

Database counters and relational invariants are maintained at the database engine level via `apps/api/src/db/sql/post_migrate.sql` (10 stored procedures, 19 triggers):

1. **Vote Count Integrity**:
   - `fp_trg_post_votes_insert` & `fp_trg_post_votes_delete` atomically increment and decrement `posts.vote_count`.
   - Applications must never manually write or calculate `posts.vote_count`.
2. **Comment Count Integrity**:
   - `fp_trg_comments_insert` & `fp_trg_comments_delete` maintain `posts.comment_count`, ignoring internal staff notes (`is_internal = true`).
3. **Cross-Tenant Board-to-Post Guard**:
   - `fp_guard_post_workspace()` executes on post insertion/modification to guarantee a post's `workspace_id` matches its parent `board.workspace_id`.
4. **Automated Timestamps**:
   - `fp_set_updated_at()` and `fp_touch_workspace_updated_at()` automatically refresh `updated_at` on records when rows are modified.

> [!IMPORTANT]
> Always execute `npm run db:post-migrate` after applying database migrations to ensure triggers and stored procedures are active.

### Automated Invariant Test Suite

FeedbackPulse ships with a zero-dependency in-memory PostgreSQL test suite powered by `@electric-sql/pglite`. It compiles an entire WASM PostgreSQL instance in Node.js, applies migrations and triggers, and verifies all 21 system invariants:

```bash
npm run test:db
```

Output:
```text
✔ 21 checks passed (0 skipped)
✨ Database invariants verified successfully in WASM PostgreSQL.
```

---

## 🔐 Authentication & Multi-Tenancy

- **Password Hashing**: Secure salted hashes generated using `bcryptjs` with cost factor 10.
- **JWT Authorization**: Signed bearer tokens carrying user identity claims (`sub`, `email`, `role`).
- **Workspace Scoping**: Every business query filters strictly by `workspace_id`. Public/anonymous queries enforce `deleted_at IS NULL AND moderation_status = 'APPROVED'` and hide `is_internal` comments.
- **React Auth Context**: `AuthContext.tsx` handles automatic token storage in `localStorage`, attaches `Authorization: Bearer <token>` to all API requests via `apps/web/src/lib/api.ts`, and exposes login, register, and session refresh helpers.

---

## 📡 API Endpoints

The API is fully documented and discoverable at `http://localhost:3000/`.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | API service directory and status |
| `GET` | `/api/health` | Public | System status and database connectivity probe |
| `POST` | `/api/auth/register` | Public | Register new user account; returns JWT and user payload |
| `POST` | `/api/auth/login` | Public | Authenticate existing credentials; returns JWT |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user profile and list of workspace memberships |
| `GET` | `/api/workspaces/:slug` | Public | Retrieve workspace public branding and configuration |
| `POST` | `/api/workspaces` | Public / Auth | Provision new workspace and assign caller as `OWNER` |

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v14+ (or Docker for running the bundled compose service)

---

## 🚀 Quickstart Guide

### 1. Clone the Repository & Install Dependencies

```bash
git clone https://github.com/your-username/feedbackpulse.git
cd feedbackpulse
npm install
```

### 2. Configure Environment Variables

Copy the example environment file inside `apps/api`:

```bash
cp apps/api/.env.example apps/api/.env
```

Verify your database connection parameters in `apps/api/.env`:

```env
DATABASE_URL=postgresql://feedbackpulse:feedbackpulse@localhost:5432/feedbackpulse
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-development-jwt-secret-key-at-least-32-chars
```

### 3. Start Local PostgreSQL Service

You can start the bundled PostgreSQL 16 container with Docker:

```bash
docker compose up -d postgres
```

*(Alternatively, run your own local PostgreSQL instance and ensure a database named `feedbackpulse` is created).*

### 4. Run Migrations, Triggers & Seed Data

Run the complete database setup pipeline in a single command:

```bash
npm run db:setup
```

This command sequentially executes:
1. `npm run db:migrate` — Applies all pending Drizzle schema migrations.
2. `npm run db:post-migrate` — Installs the 19 triggers and stored functions.
3. `npm run db:seed` — Seeds demo tenant (`Acme Corp`, slug: `acme`), demo user (`alex@example.com`), boards, posts, votes, and tags.

### 5. Verify Database Invariants

Confirm that the database rules and triggers operate as intended:

```bash
npm run test:db
```

### 6. Start the Development Servers

Boot both the Hono backend API (`http://localhost:3000`) and the React 19 frontend SPA (`http://localhost:5173`) concurrently:

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠 Available Scripts

Execute these scripts from the monorepo root:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Hono API (`:3000`) and Vite Web (`:5173`) concurrently |
| `npm run build` | Compiles both API (`tsc`) and Web (`vite build`) without errors |
| `npm run test:db` | Runs the 21-check WASM PGlite database and trigger test suite |
| `npm run db:generate` | Inspects schema changes and generates new Drizzle migration files |
| `npm run db:migrate` | Applies pending Drizzle migrations to the target PostgreSQL database |
| `npm run db:post-migrate` | Applies idempotent triggers, guards, and counter functions |
| `npm run db:seed` | Populates demo workspace, user, boards, posts, and votes |
| `npm run db:seed:reset` | Truncates data and re-seeds clean development entities |
| `npm run db:setup` | One-step bootstrap: runs `migrate` -> `post-migrate` -> `seed` |
| `npm run db:check` | Checks migration files against schema to detect drift |

---

## 📚 Documentation & Architectural References

For in-depth guides and operating specifications, review the project documentation:

- [Database Architecture Specification](docs/database-architecture.md) — Comprehensive reference for all 24 tables, 14 enums, composite indexes, stored functions, and triggers.
- [Database Handoff & Acceptance Protocol](docs/db-handoff.md) — Verification checklist and historical decisions log.
- [Agent Operating Guidelines](AGENTS.md) — Non-negotiable database, tenant isolation, and counter write protocols for developers and AI agents.

---

## 📄 License

FeedbackPulse is licensed under the MIT License.
