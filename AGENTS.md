# Agent Guidelines for FeedbackPulse

## Database rules (apps/api)

- Schema source of truth: `apps/api/src/db/schema/*.ts`. Never hand-write SQL tables.
- Change protocol: edit schema -> `npm run db:generate --workspace=@feedbackpulse/api` -> review the generated SQL -> `npm run db:migrate` -> `npm run db:post-migrate`.
- Never hand-edit files in `src/db/migrations/`. Never delete an applied migration.
- `src/db/sql/post_migrate.sql` holds triggers/guards and is idempotent: run it after every migration, in deploys too.
- Never write `posts.vote_count`, `posts.comment_count`, `posts.last_activity_at`, `posts.completed_at`, or any `updated_at`: triggers own them.
- Every business query filters by `workspace_id`. Public/anonymous reads must also filter `deleted_at is null and moderation_status = 'APPROVED'`, and must never select `comments.is_internal = true`.
- Vote writes go through `toggleVote()` in `src/db/queries/feedback.ts` (transaction + partial unique indexes). Do not INSERT votes ad hoc.
- Never store raw tokens, raw IPs, or password hashes in plaintext columns.
- Before any `TRUNCATE`/`DROP`/`seed:reset`, confirm `DATABASE_URL` points at localhost.
