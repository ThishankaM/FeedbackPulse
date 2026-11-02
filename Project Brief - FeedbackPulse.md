# Project Brief: FeedbackPulse
### Multi-Tenant Customer Feedback, Public Roadmap & Changelog SaaS

**Timeline:** 4 Weeks (20 Working Days)  
**Schedule:** **Starts Today (November 2, 2026) — Finishes by November 27, 2026**  
**Architecture:** **Hono (Backend API) + React 19 / Vite (Frontend SPA)**  
**Target Deliverable:** A production-ready, fully functional micro-SaaS application with an embeddable website widget.

---

## Welcome to the FeedbackPulse Project

This document is your comprehensive technical brief and sprint execution guide. It outlines the architectural standards, database schema, end-to-end type safety workflow, and detailed weekly sprint milestones to guide you from repository initialization to the final release showcase.

---

## 1. Project Overview & Objectives

**FeedbackPulse** is a modern customer feedback hub enabling software companies to:
1. **Collect & Prioritize Feedback:** Provide a dedicated public board (`/b/:workspace-slug`) where users submit feature ideas, discuss improvements, and upvote existing requests.
2. **Communicate Roadmaps:** Expose a transparent Kanban roadmap showing what features are *Planned*, *In Progress*, and *Completed*.
3. **Publish Product Releases:** Maintain a rich markdown changelog feed with categorized release notes.
4. **Embed Anywhere:** Provide an embeddable script snippet (`widget.js`) so any client website can display recent product updates and collect user feedback without page redirects.

---

## 2. Core Architectural Decisions & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       PROJECT MONOREPO                      │
├──────────────────────────────┬──────────────────────────────┤
│    apps/api (Hono)           │    apps/web (React + Vite)   │
│  - Hono Framework            │  - React 19 + TypeScript     │
│  - Drizzle ORM (PostgreSQL)  │  - shadcn/ui (Tailwind CSS)  │
│  - Snake_case database       │  - ThemeProvider (Dark/Light)│
│  - Exports AppType for RPC   │  - react-i18next (en first)  │
│  - JWT / Auth middleware     │  - Hono RPC client (hc)      │
└──────────────────────────────┴──────────────────────────────┘
```

* **Backend:** **Hono** (Node.js or Bun runtime) with modular route handlers and Zod validation middleware.
* **Frontend:** **React 19 (Vite, TypeScript)** configured for fast HMR and optimized production bundles.
* **End-to-End Type Safety:** **Hono RPC (`hc<AppType>`)** — The React frontend imports the backend's route types directly, giving you 100% compile-time autocomplete and type checking on every endpoint, request body, and response without code generation.
* **Database & ORM:** **PostgreSQL** with **Drizzle ORM** (strict `snake_case` table and column names).
* **UI Component System:** **shadcn/ui** (official Vite + React setup with Tailwind CSS).
* **Theme Support:** **Dark & Light Mode** with a React `ThemeProvider` managing the `.dark` CSS class and `localStorage` persistence.
* **Internationalization (i18n):** **`react-i18next`** from Day 1. Base locale is **English (`en`)** via `locales/en.json`. Strict rule: zero hardcoded user-facing strings in JSX.
* **Transactional Email:** Resend API integration for automated status notifications.
* **Testing:** Playwright E2E test suite covering critical user and admin journeys.

---

## 3. Database Schema (Drizzle ORM & PostgreSQL `snake_case`)

All database identifiers follow PostgreSQL best practices with strict **`snake_case`** table and column names.

### Drizzle Schema Definition (`apps/api/src/db/schema.ts`)

```typescript
import { pgTable, uuid, text, varchar, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- WORKSPACES ---
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // e.g. "acme" $\to$ /b/acme
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 30 }).default('#4F46E5').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- USERS ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- WORKSPACE MEMBERS ---
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('MEMBER').notNull(), // "OWNER", "ADMIN", "MEMBER"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_member_unique_idx').on(table.workspaceId, table.userId),
]);

// --- BOARDS ---
export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // e.g. "Feature Requests"
  slug: varchar('slug', { length: 100 }).notNull(), // e.g. "features"
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_board_slug_idx').on(table.workspaceId, table.slug),
]);

// --- POSTS (FEEDBACK ITEMS) ---
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(), // Markdown format
  status: varchar('status', { length: 50 }).default('UNDER_REVIEW').notNull(), // UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETED, CLOSED
  voteCount: integer('vote_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('posts_board_status_idx').on(table.boardId, table.status),
  index('posts_vote_count_idx').on(table.boardId, table.voteCount),
]);

// --- VOTES ---
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('post_user_vote_unique_idx').on(table.postId, table.userId),
]);

// --- COMMENTS ---
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(), // Admin internal note
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- CHANGELOGS ---
export const changelogs = pgTable('changelogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  content: text('content').notNull(), // Markdown formatted release notes
  publishedAt: timestamp('published_at', { withTimezone: true }),
  isPublished: boolean('is_published').default(false).notNull(),
  tags: text('tags').array(), // e.g. ["Improvement", "New Feature"]
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_changelog_slug_idx').on(table.workspaceId, table.slug),
]);

// Relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  boards: many(boards),
  changelogs: many(changelogs),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  board: one(boards, { fields: [posts.boardId], references: [boards.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  votes: many(votes),
  comments: many(comments),
}));
```

---

## 4. End-to-End Type Safety via Hono RPC

The standout advantage of Hono + React is **Hono RPC**. The frontend doesn't need Axios, manual DTO types, or code generators:

### In Backend (`apps/api/src/index.ts`):
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from './db';
import { posts } from './db/schema';

const app = new Hono();

const routes = app
  .get('/api/posts', async (c) => {
    const allPosts = await db.select().from(posts);
    return c.json({ posts: allPosts });
  })
  .post(
    '/api/posts',
    zValidator('json', z.object({
      title: z.string().min(3),
      content: z.string().min(10),
      boardId: z.string().uuid()
    })),
    async (c) => {
      const data = c.req.valid('json');
      // Insert via Drizzle...
      return c.json({ success: true, message: 'Post created' }, 201);
    }
  );

export default app;
export type AppType = typeof routes; // Exported directly to React!
```

### In Frontend (`apps/web/src/lib/api.ts`):
```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../../api/src/index';

// Full autocomplete and type checking on every endpoint and payload!
export const api = hc<AppType>(import.meta.env.VITE_API_URL || 'http://localhost:3000');
```

---

## 5. UI, Themes & i18n Standards

### 1. shadcn/ui for Vite
* Initialized via `npx shadcn@latest init` configured for Vite (`@/components`, `@/lib/utils`).
* UI components installed as needed (`Button`, `Card`, `Dialog`, `DropdownMenu`, `Tabs`, `Input`, `Textarea`, `Badge`, `Avatar`, `Skeleton`, `Toast`).

### 2. Dark & Light Mode ThemeProvider
* Simple React context wrapping `App.tsx` that toggles the `dark` class on `document.documentElement` and persists preference in `localStorage`:
  ```tsx
  <ThemeProvider defaultTheme="system" storageKey="feedbackpulse-theme">
    <App />
  </ThemeProvider>
  ```

### 3. Internationalization with `react-i18next`
* Configured in `src/lib/i18n.ts`:
  ```typescript
  import i18n from 'i18next';
  import { initReactI18next } from 'react-i18next';
  import en from '../locales/en.json';

  i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  ```
* Standard rule: **Zero hardcoded strings in JSX.**
  ```tsx
  const { t } = useTranslation();
  return <Button>{t('feedback.newPost')}</Button>;
  ```

---

## 6. 4-Week Sprint Breakdown

```
Week 1 (Nov 02 – Nov 06): Monorepo Setup (Hono + React Vite), Drizzle ORM, shadcn/ui & Theme/i18n
   │
Week 2 (Nov 09 – Nov 13): Public Feedback Board, Hono RPC Integration & Optimistic Upvotes
   │
Week 3 (Nov 16 – Nov 20): Admin Status Workflow, Kanban Roadmap & Changelog CMS
   │
Week 4 (Nov 23 – Nov 27): Embeddable Widget.js, Playwright Tests, Production Builds & Showcase
```

---

### **Sprint 1 (Week 1: November 2 – November 6, 2026): Monorepo Setup, Hono API, Drizzle ORM & React Shell**

* **Core Goal:** Establish a rock-solid developer foundation: initialize the monorepo workspace, setup the Hono API with Drizzle ORM connected to PostgreSQL, build the React 19 shell with shadcn/ui and theme/i18n infrastructure, and connect end-to-end Hono RPC.

#### **Day-by-Day Execution Plan:**
* **Days 1–2: Monorepo Architecture & Backend Initialization**
  * Initialize the workspace using npm / pnpm workspaces (`apps/api`, `apps/web`).
  * Configure shared TypeScript root configurations and path aliases.
  * Initialize `apps/api` using Hono with CORS middleware and structured request logging.
  * Configure Drizzle ORM with PostgreSQL database connection (`DATABASE_URL`).
  * Define core schema tables (`workspaces`, `users`, `workspace_members`) with strict `snake_case` column naming.
  * Generate and apply initial migrations using `drizzle-kit generate` and `drizzle-kit migrate`.
  * Implement authentication middleware (JWT / Bearer token validation) and `GET /api/health` healthcheck route.
* **Days 3–4: Frontend Shell, Design System & Tooling**
  * Initialize `apps/web` with React 19, TypeScript, and Vite.
  * Configure Tailwind CSS and initialize `shadcn/ui` with the Vite preset.
  * Install initial shadcn components: `Button`, `Card`, `Input`, `Dialog`, `DropdownMenu`, `Tabs`, `Avatar`, `Badge`.
  * Implement `ThemeProvider` supporting system preference detection, light/dark switching, and `localStorage` persistence.
  * Configure `react-i18next` with modular JSON structure (`src/locales/en.json`) and verify zero hardcoded strings.
  * Configure Hono RPC client (`hc<AppType>`) connecting React to the backend API.
* **Day 5: Workspace Creation Flow, End-to-End Test & Review**
  * Build the backend endpoint `POST /api/workspaces` with Zod validation (workspace name, unique slug generation, primary color).
  * Build the frontend onboarding screen allowing users to create a new workspace.
  * Wire up the form to `api.workspaces.$post` using Hono RPC, verifying autocomplete and type inference.
  * Run database validation to confirm records are inserted correctly in PostgreSQL with relations.

#### **Technical Deliverables & Endpoints:**
* **`apps/api`:**
  * `GET /api/health` — Service health & database connectivity check.
  * `POST /api/auth/login` — Authentication handler returning user token & profile.
  * `POST /api/workspaces` — Creates a workspace & assigns the current user as `OWNER`.
  * `GET /api/workspaces/:slug` — Fetches workspace details and theme branding.
* **`apps/web`:**
  * Shell layout with persistent top navigation, workspace selector, and theme switcher.
  * Workspace onboarding / creation dialog validated with client-side Zod schemas.
  * `src/lib/api.ts` configured with `hc<AppType>` and auth token interceptor.
  * `src/locales/en.json` populated with common UI keys (`nav.*`, `auth.*`, `workspace.*`).

#### **Acceptance Criteria & Definition of Done:**
1. Running `npm run dev` concurrently boots both Hono API (`localhost:3000`) and React frontend (`localhost:5173`).
2. Drizzle migrations execute cleanly on PostgreSQL without schema drift.
3. Dark and Light modes switch seamlessly without page reload and persist across refreshes.
4. End-to-end type safety confirmed: modifying an endpoint in `apps/api` immediately reflects type errors in `apps/web` if payloads mismatch.
5. Zero unlocalized hardcoded text strings in JSX.

#### **Friday Demo Script:**
1. Boot the application from cold start.
2. Authenticate $\to$ Toggle light and dark modes (verify CSS class updates and persistence).
3. Fill out the "Create Workspace" form with name "Acme Software" $\to$ Observe slug auto-generation to "acme".
4. Submit form $\to$ Verify API responds with 201 Created $\to$ Inspect PostgreSQL to show the new record in `workspaces` and `workspace_members`.
5. Switch browser language or view locale file to verify i18n keys are actively rendered.

---

### **Sprint 2 (Week 2: November 9 – November 13, 2026): Public Board, Submissions & Optimistic Upvoting**

* **Core Goal:** Build the customer-facing core of FeedbackPulse: deliver the public feedback board route (`/b/:workspaceSlug`), a rich submission modal with client/server validation, responsive post listing with status filters, and an optimistic upvoting system.

#### **Day-by-Day Execution Plan:**
* **Days 6–7: Public Board Route & Post Listing**
  * Implement Drizzle schema for `boards`, `posts`, and `votes`.
  * Create backend endpoints:
    * `GET /api/workspaces/:slug/boards` (fetch default and custom boards).
    * `GET /api/boards/:boardId/posts` with query parameters for sorting (`trending`, `top`, `recent`) and status filtering.
  * Build the public board layout at `/b/:workspaceSlug` featuring workspace branding (logo, title, custom primary color accent).
  * Build responsive post cards using shadcn/ui `Card` displaying title, snippet, author avatar, status badge, comment count, and vote button.
* **Days 8–9: Feedback Submission Modal & Optimistic Upvotes**
  * Implement `POST /api/boards/:boardId/posts` with strict Zod validation:
    * `title`: string between 3 and 255 characters.
    * `content`: markdown string minimum 10 characters.
  * Build the "New Feedback" modal (`Dialog`) with title input, markdown description textarea, and board selector.
  * Implement optimistic upvoting engine:
    * Backend: `POST /api/posts/:postId/vote` endpoint executing atomic Drizzle transaction with `uniqueIndex(post_user_vote_unique_idx)`. Toggles vote on/off.
    * Frontend: Upvote button increments local state counter and toggles active state immediately upon click.
    * Error handling: If API call fails, gracefully roll back state counter and trigger a toast notification.
* **Day 10: Post Detail Page & Discussion Thread**
  * Route: `/b/:workspaceSlug/p/:postId` displaying full post content with markdown rendering.
  * Implement comments table and endpoints: `GET /api/posts/:postId/comments` and `POST /api/posts/:postId/comments`.
  * Build comment thread UI with user avatars, relative timestamp (`date-fns` or native `Intl.RelativeTimeFormat`), and author indicators.
  * Sprint 2 test suite and polish.

#### **Technical Deliverables & Endpoints:**
* **`apps/api`:**
  * `GET /api/b/:workspaceSlug` — Fetches workspace public info and active boards.
  * `GET /api/boards/:boardId/posts?sort=top&status=UNDER_REVIEW` — Filtered & sorted posts list.
  * `POST /api/boards/:boardId/posts` — Creates feedback item with Zod validation.
  * `POST /api/posts/:postId/vote` — Toggles user vote with atomic counter update.
  * `GET /api/posts/:postId` & `POST /api/posts/:postId/comments` — Thread discussion endpoints.
* **`apps/web`:**
  * Public board page with filter tabs (`All`, `Under Review`, `Planned`, `In Progress`).
  * Search bar with debounced query filtering.
  * Optimistic `VoteButton` component with animated counter transitions.
  * Markdown preview tab inside feedback creation modal.

#### **Acceptance Criteria & Definition of Done:**
1. Public board loads without requiring user login for read-only browsing.
2. Submitting a new feature request validates input on both client and API; post appears at the top of the feed upon creation.
3. Upvoting feels instant (<16ms) via optimistic React updates; duplicate voting is prevented at both the UI and database constraint levels.
4. Post detail route renders markdown descriptions (headings, code blocks, lists) safely.
5. All new labels, buttons, and validation messages mapped in `src/locales/en.json`.

#### **Friday Demo Script:**
1. Open incognito window and navigate to `/b/acme`.
2. Browse existing feedback items; test sorting by "Top Voted" vs "Most Recent".
3. Click "Suggest a Feature" $\to$ Attempt to submit empty form to demonstrate Zod validation error messages.
4. Fill in valid title & markdown description $\to$ Submit $\to$ Post renders dynamically on board.
5. Click upvote button $\to$ Show instant counter increment $\to$ Refresh page to prove persistence in database.
6. Click into post detail $\to$ Post a discussion comment $\to$ Verify comment appears in thread.

---

### **Sprint 3 (Week 3: November 16 – November 20, 2026): Admin Status Workflow, Kanban Roadmap & Changelog CMS**

* **Core Goal:** Build the administrative product management engine: status transition workflows, a public 3-column Kanban roadmap (`Planned`, `In Progress`, `Completed`), an integrated changelog CMS with markdown publishing, and automated transactional notifications.

#### **Day-by-Day Execution Plan:**
* **Days 11–12: Admin Post Management & Status Workflow**
  * Enforce role-based access control (RBAC): restrict status transitions and internal notes to users with `OWNER` or `ADMIN` roles in `workspace_members`.
  * Build status management endpoint: `PATCH /api/posts/:postId/status` validating transition states (`UNDER_REVIEW`, `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`).
  * Build admin action toolbar on post items: status dropdown, board migration, and delete option.
  * Implement internal team notes: add `is_internal` boolean flag to comments, hidden from public board visitors and visible only to team members.
* **Days 13–14: Public Kanban Roadmap & Changelog CMS**
  * Build the public roadmap route: `/b/:workspaceSlug/roadmap`.
  * Implement a 3-column Kanban board layout:
    * Column 1: **Planned** (Features approved for upcoming cycles).
    * Column 2: **In Progress** (Features currently under active development).
    * Column 3: **Completed** (Recently shipped improvements).
  * Build the Changelog CMS schema and backend:
    * `changelogs` table with title, slug, content (markdown), published date, and tags (`New Feature`, `Improvement`, `Fix`).
    * Admin release notes editor with markdown preview and tag selector pills.
  * Build the public changelog feed route: `/b/:workspaceSlug/changelog` with timeline markers and category filters.
* **Day 15: Transactional Email Integration & Review**
  * Integrate Resend API into `apps/api`: when a post status changes to `COMPLETED`, trigger an email to the original author and upvoters notifying them that their requested feature has shipped.
  * Add configuration settings screen for workspace admins (custom primary color, logo URL, workspace name).
  * Sprint 3 regression testing and Friday demo preparation.

#### **Technical Deliverables & Endpoints:**
* **`apps/api`:**
  * `PATCH /api/posts/:postId/status` — Admin-only status updater with audit log.
  * `GET /api/workspaces/:slug/roadmap` — Groups posts into `PLANNED`, `IN_PROGRESS`, `COMPLETED`.
  * `POST /api/workspaces/:slug/changelogs` — Creates or publishes release notes.
  * `GET /api/workspaces/:slug/changelogs` — Public changelog feed with published filter.
  * Resend webhook / service module for automated email dispatch.
* **`apps/web`:**
  * Admin moderation toolbar with shadcn `DropdownMenu` and `Select` components.
  * Public Kanban board with column counts, responsive horizontal scroll on mobile, and cards linking to post details.
  * Changelog management dashboard + public changelog feed view.
  * Settings view for customizing workspace branding.

#### **Acceptance Criteria & Definition of Done:**
1. Only authenticated workspace admins can access status update actions and publish release notes; public users receive 403 Forbidden on write attempts.
2. Updating a post status to "In Progress" or "Completed" immediately updates its position on the public `/roadmap` page.
3. Changelogs support full markdown formatting, tags, and publish/draft toggles.
4. Internal comments are strictly filtered out of the API response for non-admin visitors.
5. All UI elements adhere to dark/light theme and English i18n dictionary.

#### **Friday Demo Script:**
1. Log in as an admin $\to$ Navigate to a feedback post with status "Under Review".
2. Add an internal note $\to$ Open the same post in an incognito window to verify the internal note is invisible to public visitors.
3. Change the post status to "In Progress" $\to$ Navigate to `/b/acme/roadmap` to show the post prominently placed in the "In Progress" Kanban column.
4. Open the Changelog CMS $\to$ Draft a release note titled "v1.1 Release" with markdown bullets and tag "New Feature" $\to$ Click "Publish".
5. Navigate to `/b/acme/changelog` $\to$ Show the newly published release note live in the chronological feed.

---

### **Sprint 4 (Week 4: November 23 – November 27, 2026): Embeddable Widget (`widget.js`), E2E Testing, Production Builds & Showcase**

* **Core Goal:** Finalize production readiness: develop the standalone embeddable `widget.js`, implement a complete Playwright end-to-end test suite, validate optimized production builds, and deliver the final project showcase.

#### **Day-by-Day Execution Plan:**
* **Days 16–17: Standalone Embeddable Script (`widget.js`)**
  * Configure Vite in library mode (`vite.config.widget.ts`) to build a zero-dependency standalone bundle `widget.js` (<35KB gzipped).
  * Implement embed script functionality:
    ```html
    <script 
      src="https://api.feedbackpulse.com/widget.js" 
      data-workspace="acme" 
      data-theme="auto" 
      data-position="bottom-right" 
      defer>
    </script>
    ```
  * Script injects an unobtrusive floating launcher trigger button into the host webpage.
  * Clicking the trigger slides out an iframe drawer loading the widget SPA:
    * Tab 1: Submit feedback / feature request.
    * Tab 2: What's New (latest changelog updates).
  * Configure postMessage communication between iframe and host window for resizing and open/close states.
  * Set up strict CORS headers on Hono API to permit embedding across allowed external origins.
* **Days 18–19: Automated Testing & Production Builds**
  * Write 5–10 comprehensive Playwright E2E tests:
    1. Public board browsing, search, and category filtering.
    2. Feedback submission modal validation and successful creation.
    3. Upvote toggle and counter accuracy.
    4. Admin status change reflecting on Kanban roadmap.
    5. Changelog publishing workflow.
    6. Widget embedding verification inside a standalone test HTML page (`test-embed.html`).
  * Run automated linter and type-checker: zero TypeScript errors, zero console warnings.
  * Production Build & Environment Validation:
    * Validate production build pipeline: ensure `apps/api` compiles cleanly and `apps/web` builds via `npm run build` with zero warnings.
    * Verify database migration execution against a clean PostgreSQL instance via `drizzle-kit migrate`.
    * Validate environment variables template (`.env.example`) and configuration hygiene.
* **Day 20: Performance Audit, Documentation & Showcase**
  * Run Lighthouse audit: ensure accessibility, SEO, and performance scores are >= 90.
  * Final audit: verify zero hardcoded strings remain in JSX (`locales/en.json` fully utilized).
  * Assemble project documentation: write comprehensive `README.md` with architecture diagram, local setup guide, and API reference.
  * **Project Demo & Launch Showcase:** 20-minute live demonstration and code walkthrough with the team.

#### **Technical Deliverables & Endpoints:**
* **`widget.js`:**
  * Self-bootstrapping script supporting `data-workspace`, `data-theme`, `data-position`.
  * Responsive iframe drawer with smooth slide-in animation.
* **Testing Suite:**
  * Playwright configuration (`playwright.config.ts`) with test reports and CI workflow file.
* **Production Build Artifacts:**
  * Standalone compiled `widget.js` bundle with test harness page.
  * Production build bundles for `apps/api` and `apps/web`.
  * Standalone test page demonstrating the embedded widget in action.

#### **Acceptance Criteria & Definition of Done:**
1. `widget.js` functions on any arbitrary external HTML page without CSS collision or console errors.
2. 100% of Playwright E2E tests pass reliably in headless mode.
3. Both API and Web frontend production builds compile cleanly and connect to PostgreSQL without runtime errors.
4. Mobile responsiveness verified across mobile (375px), tablet (768px), and desktop (1280px+).
5. Codebase adheres strictly to the defined stack: Hono RPC, Drizzle ORM, shadcn/ui, `snake_case` DB, and `react-i18next`.

#### **Friday Demo Script (Final Showcase):**
1. **Architecture & Application Flow:** Present the complete micro-SaaS application running in production build mode.
2. **End-to-End User Story:**
   * Visitor visits `/b/acme` on mobile viewport $\to$ searches for existing feedback $\to$ submits a new request.
   * Upvotes another feature request $\to$ verifies immediate optimistic update.
3. **Admin Experience:**
   * Log into admin dashboard $\to$ triage the newly submitted feedback $\to$ transition status to "Planned".
   * Show instant status update on the public Kanban roadmap.
   * Publish a rich release note in the Changelog CMS.
4. **Widget Demonstration:**
   * Open an external static HTML website running on a separate port or domain.
   * Click the floating launcher button $\to$ Widget drawer slides out $\to$ Submit feedback directly from the external page $\to$ View latest changelog entry inside the widget.
5. **Code Quality & Test Walkthrough:**
   * Run Playwright test suite in terminal to demonstrate all tests passing green.
   * Highlight Hono RPC type safety, Drizzle schema, and i18n structure.

---

## 7. Scope Guardrails & Technical Standards

To maintain velocity and deliver a polished product within the 4-week timeline, adhere strictly to these scope boundaries:

| Core Priority (In-Scope) | Out-of-Scope / Stretch (Do Not Prioritize Ahead of Core) |
| :--- | :--- |
| **Hono RPC (`hc`)** for all client-server communication | Setting up GraphQL, Apollo, or tRPC |
| **Drizzle ORM** with `snake_case` PostgreSQL schema | Writing raw manual SQL queries or using Prisma |
| **shadcn/ui** components for all UI elements | Writing custom unstyled UI components from scratch |
| **Dark/Light ThemeProvider** via Tailwind CSS `.dark` class | Complex custom theme creators with multi-color pickers |
| **`react-i18next`** with clean English keys (`en.json`) | Full localization into 5+ languages during Month 1 |
| **Standalone Vite library mode `widget.js`** | Developing native iOS / Android mobile SDKs |
| **Core Role-Based Access (Owner, Admin, Member)** | Complex multi-role granular permission matrices |

---

## 8. Getting Started & Development Workflow

### Quickstart Commands
```bash
# Clone and install dependencies
git clone <repo-url> feedbackpulse
cd feedbackpulse
npm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Run database migrations
npm run db:generate --workspace=apps/api
npm run db:migrate --workspace=apps/api

# Start local development (concurrent API + Frontend)
npm run dev
```

### Essential Guidelines for Success
1. **Always export and consume `AppType`:** Whenever you create or modify an API route in `apps/api`, ensure the route is chained in the exported `AppType` so the frontend client (`hc<AppType>`) receives immediate type awareness.
2. **Never hardcode strings:** Add every button label, placeholder, error message, and header to `apps/web/src/locales/en.json` and use `const { t } = useTranslation()`.
3. **Keep Drizzle schemas clean:** Use PostgreSQL `snake_case` for all table and column names (`created_at`, `workspace_id`, `is_internal`).
4. **Ship iteratively:** Complete each week's deliverables before moving to the next sprint. The Friday demos ensure you always have a working, demonstrable increment of the product.
