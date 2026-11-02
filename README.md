# FeedbackPulse 🚀

> Multi-Tenant Customer Feedback, Public Roadmap & Changelog SaaS

FeedbackPulse is a modern, high-performance customer feedback hub built with **Hono**, **React 19**, **Vite**, **PostgreSQL**, and **Drizzle ORM**. It features 100% compile-time type safety via **Hono RPC**, a dark/light design system, internationalization (`react-i18next`), and an embeddable widget.

---

## Architecture & Monorepo Structure

```
FeedbackPulse/
├── apps/
│   ├── api/                        # Hono Backend API
│   │   ├── drizzle/                # Generated SQL migration files (Drizzle)
│   │   ├── sql/init_schema.sql     # Standalone DDL SQL file for manual/direct execution
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts        # Database connection & client
│   │   │   │   ├── schema.ts       # Drizzle schema (PostgreSQL snake_case)
│   │   │   │   ├── migrate.ts      # Automated migration runner
│   │   │   │   └── seed.ts         # Development seed script
│   │   │   └── index.ts            # Hono application & AppType export
│   │   ├── drizzle.config.ts       # Drizzle Kit configuration
│   │   └── .env.example            # Backend environment variables template
│   └── web/                        # React 19 + Vite Frontend SPA
│       ├── src/
│       │   ├── context/
│       │   │   └── ThemeProvider.tsx # Dark/Light/System theme provider
│       │   ├── lib/
│       │   │   ├── api.ts          # Hono RPC client (hc<AppType>)
│       │   │   └── i18n.ts         # react-i18next configuration
│       │   ├── locales/
│       │   │   └── en.json         # Centralized English translations (zero hardcoded JSX strings)
│       │   └── App.tsx             # Shell layout & Workspace onboarding screen
│       └── vite.config.ts
├── package.json                    # Root npm workspace runner
└── README.md
```

---

## Prerequisites

- **Node.js**: v20 or higher
- **PostgreSQL**: v14 or higher (local service or Docker)

---

## Quickstart & Initializing for New Developers

### 1. Install Dependencies

```bash
git clone <your-repo-url>
cd FeedbackPulse
npm install
```

### 2. Configure Environment Variables

Create `.env` inside `apps/api`:

```bash
cp apps/api/.env.example apps/api/.env
```

Ensure your `DATABASE_URL` matches your local PostgreSQL instance:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/feedbackpulse
PORT=3000
CLIENT_URL=http://localhost:5173
```

### 3. Create Database & Apply Initial Migrations

#### Option A: Using npm script & Drizzle Migrator (Recommended)

1. Create the database in PostgreSQL if it doesn't already exist:
   ```bash
   psql -U postgres -c "CREATE DATABASE feedbackpulse;"
   ```

2. Run migrations:
   ```bash
   npm run db:migrate
   ```

3. (Optional) Populate seed data (demo user, workspace, boards, sample feedback):
   ```bash
   npm run db:seed
   ```

*(Shortcut for steps 2 & 3: `npm run db:setup`)*

#### Option B: Direct SQL File (Zero-Tooling DDL)

If you prefer applying raw SQL directly via `psql` or a GUI client (e.g. pgAdmin, DBeaver):

```bash
psql -U postgres -d feedbackpulse -f apps/api/sql/init_schema.sql
```

---

### 4. Run Local Development Server

Run both Hono API (`localhost:3000`) and React frontend (`localhost:5173`) concurrently:

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Boots both API (`:3000`) and Web (`:5173`) concurrently |
| `npm run build` | Compiles both API (`tsc`) and Web (`vite build`) with zero errors |
| `npm run db:generate` | Generates a new timestamped `.sql` migration from schema changes |
| `npm run db:migrate` | Runs all pending Drizzle SQL migrations against the database |
| `npm run db:seed` | Inserts demo workspace (`/b/acme`), demo admin, boards, and feedback |
| `npm run db:setup` | Executes `db:migrate` followed immediately by `db:seed` |
| `npm run db:studio` | Opens Drizzle Studio local visual database GUI in browser |
