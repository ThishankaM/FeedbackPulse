# FeedbackPulse Database Handoff & Architecture Documentation

## 1. Preflight Decisions (T0)

| Decision Category | Observed State | Resolution / Command Convention |
| :--- | :--- | :--- |
| **Node.js Runtime** | Node `v25.8.1` (>= 20.x) | Node 20+ compatible |
| **Package Manager** | `package-lock.json` present | Use `npm run <cmd> --workspace=@feedbackpulse/api` |
| **PostgreSQL Environment** | Local `psql` (PostgreSQL 18.4) & Docker 29.8 | Primary: local PostgreSQL (`feedbackpulse`) / Docker compose fallback |
| **Existing Schema** | Single-file `schema.ts` | Replaced by modular `src/db/schema/*.ts` + barrel file |
| **Migrations Path** | Standardized | `apps/api/src/db/migrations` (T3 standard) |

---

## 2. Invariant Verification & Testing (T9)

The PGlite in-memory test suite (`npm run test:db`) validates **21 checks passed** with zero external database service required:

```text
✓ generated migrations apply cleanly (1 file(s))
✓ post_migrate.sql applies cleanly
✓ public schema contains exactly 24 tables
✓ public schema contains exactly 14 enums
✓ posts table has search_vector column
✓ posts_board_feed_idx index exists
✓ post_votes_post_user_unique_idx exists with partial index
✓ fp_set_updated_at trigger function exists
✓ fp_sync_post_vote_count trigger function exists
✓ fp_sync_post_comment_count trigger function exists
✓ fp_guard_post_workspace trigger function exists
✓ new post initializes with zero votes and zero comments
✓ inserting post_vote increments post.vote_count automatically via trigger
✓ deleting post_vote decrements post.vote_count automatically via trigger
✓ inserting public comment increments post.comment_count automatically
✓ internal comments are excluded from post.comment_count
✓ soft-deleting comment decrements post.comment_count
✓ cross-tenant post creation is blocked by workspace guard trigger
✓ duplicate user vote on same post is rejected by partial unique index
✓ email dedupe_key prevents double sends
✓ post_migrate.sql is idempotent and re-applies cleanly

21 checks passed.
```

---

## 3. Seeded Accounts & Test Data (T8)

| Entity | Identifier / Email | Role / State |
| :--- | :--- | :--- |
| **Workspace** | `/b/acme` | Plan: `PRO`, primary: `#4F46E5` |
| **Owner** | `owner@acme.test` | Role: `OWNER`, status: `ACTIVE`, password: `demo1234` |
| **Admin** | `admin@acme.test` | Role: `ADMIN`, status: `ACTIVE`, password: `demo1234` |
| **Member** | `member@acme.test` | Role: `MEMBER`, status: `ACTIVE`, password: `demo1234` |
| **Boards** | `features`, `bugs` | Default & public boards |
| **Sample Posts** | 6 posts | "Dark mode for the widget", "Public REST API", etc. |
| **Comments** | 4 comments | 3 public, 1 internal note |
| **Changelogs** | 2 release notes | 1 published (`v1.0 Release`), 1 draft (`v1.1 Draft`) |

---

## 4. Critical Operating Invariants for Sprint 2+

1. **Trigger-Controlled Counters:**
   * Never manually write or calculate `vote_count`, `comment_count`, or `updated_at`.
   * Inserting into `post_votes` automatically increments `posts.vote_count`.
   * Deleting from `post_votes` automatically decrements `posts.vote_count`.
   * Comments automatically increment/decrement `posts.comment_count` while strictly ignoring `is_internal = true` and soft-deleted comments.
2. **Tenant Isolation:**
   * Triggers reject any post whose `workspace_id` does not match its parent board's `workspace_id`.
   * All API queries must filter by `workspace_id`.
3. **Voting Logic:**
   * Always call `toggleVote()` in `src/db/queries/feedback.ts` inside a transaction.
