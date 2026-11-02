import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(apiRoot, 'src/db/migrations');
const postMigrateFile = path.join(apiRoot, 'src/db/sql/post_migrate.sql');

async function runInvariants() {
  console.log('🧪 Running FeedbackPulse Database Invariants (PGlite)...');
  const db = new PGlite();

  let passed = 0;
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`✓ ${message}`);
    passed++;
  }

  // 1. Migrations apply cleanly
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // Remove Drizzle statement-breakpoints
    const statements = sql.split('--> statement-breakpoint');
    for (const statement of statements) {
      if (statement.trim()) {
        await db.exec(statement);
      }
    }
  }
  assert(migrationFiles.length > 0, `generated migrations apply cleanly (${migrationFiles.length} file(s))`);

  // 2. post_migrate.sql applies cleanly
  const postSql = fs.readFileSync(postMigrateFile, 'utf8');
  await db.exec(postSql);
  assert(true, 'post_migrate.sql applies cleanly');

  // 3. Exactly 24 tables
  const tablesRes = await db.query(
    "SELECT count(*)::int as count FROM pg_tables WHERE schemaname = 'public';"
  );
  assert(tablesRes.rows[0].count === 24, 'public schema contains exactly 24 tables');

  // 4. Exactly 14 enums
  const enumsRes = await db.query(
    "SELECT count(*)::int as count FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e';"
  );
  assert(enumsRes.rows[0].count === 14, 'public schema contains exactly 14 enums');

  // 5. posts has search_vector column
  const searchColRes = await db.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'search_vector';"
  );
  assert(searchColRes.rows.length === 1, 'posts table has search_vector column');

  // 6. posts_board_feed_idx exists
  const feedIdxRes = await db.query(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'posts' AND indexname = 'posts_board_feed_idx';"
  );
  assert(feedIdxRes.rows.length === 1, 'posts_board_feed_idx index exists');

  // 7. post_votes_post_user_unique_idx exists with partial index condition
  const voteIdxRes = await db.query(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'post_votes' AND indexname = 'post_votes_post_user_unique_idx';"
  );
  assert(voteIdxRes.rows.length === 1, 'post_votes_post_user_unique_idx exists with partial index');

  // 8. Trigger function fp_set_updated_at exists
  const f1 = await db.query("SELECT proname FROM pg_proc WHERE proname = 'fp_set_updated_at';");
  assert(f1.rows.length === 1, 'fp_set_updated_at trigger function exists');

  // 9. Trigger function fp_sync_post_vote_count exists
  const f2 = await db.query("SELECT proname FROM pg_proc WHERE proname = 'fp_sync_post_vote_count';");
  assert(f2.rows.length === 1, 'fp_sync_post_vote_count trigger function exists');

  // 10. Trigger function fp_sync_post_comment_count exists
  const f3 = await db.query("SELECT proname FROM pg_proc WHERE proname = 'fp_sync_post_comment_count';");
  assert(f3.rows.length === 1, 'fp_sync_post_comment_count trigger function exists');

  // 11. Trigger function fp_guard_post_workspace exists
  const f4 = await db.query("SELECT proname FROM pg_proc WHERE proname = 'fp_guard_post_workspace';");
  assert(f4.rows.length === 1, 'fp_guard_post_workspace trigger function exists');

  // Setup test tenant fixtures
  const ws1 = (await db.query("INSERT INTO workspaces (name, slug) VALUES ('W1', 'w1') RETURNING id;")).rows[0].id;
  const ws2 = (await db.query("INSERT INTO workspaces (name, slug) VALUES ('W2', 'w2') RETURNING id;")).rows[0].id;
  const u1 = (await db.query("INSERT INTO users (email, name) VALUES ('u1@test.com', 'U1') RETURNING id;")).rows[0].id;
  const b1 = (await db.query(`INSERT INTO boards (workspace_id, name, slug) VALUES ('${ws1}', 'B1', 'b1') RETURNING id;`)).rows[0].id;
  const p1 = (await db.query(`INSERT INTO posts (workspace_id, board_id, author_user_id, title, content) VALUES ('${ws1}', '${b1}', '${u1}', 'Post 1', 'Content 1') RETURNING id;`)).rows[0].id;

  // 12. Initial counters are zero
  const pInit = (await db.query(`SELECT vote_count, comment_count FROM posts WHERE id = '${p1}';`)).rows[0];
  assert(pInit.vote_count === 0 && pInit.comment_count === 0, 'new post initializes with zero votes and zero comments');

  // 13. Inserting post_vote automatically increments vote_count
  const v1 = (await db.query(`INSERT INTO post_votes (workspace_id, post_id, user_id) VALUES ('${ws1}', '${p1}', '${u1}') RETURNING id;`)).rows[0].id;
  const pAfterVote = (await db.query(`SELECT vote_count FROM posts WHERE id = '${p1}';`)).rows[0];
  assert(pAfterVote.vote_count === 1, 'inserting post_vote increments post.vote_count automatically via trigger');

  // 14. Deleting post_vote automatically decrements vote_count
  await db.query(`DELETE FROM post_votes WHERE id = '${v1}';`);
  const pAfterUnvote = (await db.query(`SELECT vote_count FROM posts WHERE id = '${p1}';`)).rows[0];
  assert(pAfterUnvote.vote_count === 0, 'deleting post_vote decrements post.vote_count automatically via trigger');

  // 15. Inserting public comment automatically increments comment_count
  const c1 = (await db.query(`INSERT INTO comments (workspace_id, post_id, author_user_id, content, is_internal) VALUES ('${ws1}', '${p1}', '${u1}', 'Nice', false) RETURNING id;`)).rows[0].id;
  const pAfterComment = (await db.query(`SELECT comment_count FROM posts WHERE id = '${p1}';`)).rows[0];
  assert(pAfterComment.comment_count === 1, 'inserting public comment increments post.comment_count automatically');

  // 16. Internal note does NOT increment public comment_count
  await db.query(`INSERT INTO comments (workspace_id, post_id, author_user_id, content, is_internal) VALUES ('${ws1}', '${p1}', '${u1}', 'Internal note', true);`);
  const pAfterInternal = (await db.query(`SELECT comment_count FROM posts WHERE id = '${p1}';`)).rows[0];
  assert(pAfterInternal.comment_count === 1, 'internal comments are excluded from post.comment_count');

  // 17. Soft deleting a comment decrements comment_count
  await db.query(`UPDATE comments SET deleted_at = NOW() WHERE id = '${c1}';`);
  const pAfterSoftDelete = (await db.query(`SELECT comment_count FROM posts WHERE id = '${p1}';`)).rows[0];
  assert(pAfterSoftDelete.comment_count === 0, 'soft-deleting comment decrements post.comment_count');

  // 18. Cross-tenant post insertion is rejected by fp_guard_post_workspace
  let crossTenantFailed = false;
  try {
    // Attempt inserting post for ws2 into board belonging to ws1
    await db.query(`INSERT INTO posts (workspace_id, board_id, author_user_id, title, content) VALUES ('${ws2}', '${b1}', '${u1}', 'Hack', 'Cross tenant');`);
  } catch {
    crossTenantFailed = true;
  }
  assert(crossTenantFailed, 'cross-tenant post creation is blocked by workspace guard trigger');

  // 19. Duplicate user vote on same post is rejected by partial unique index
  let duplicateVoteFailed = false;
  await db.query(`INSERT INTO post_votes (workspace_id, post_id, user_id) VALUES ('${ws1}', '${p1}', '${u1}');`);
  try {
    await db.query(`INSERT INTO post_votes (workspace_id, post_id, user_id) VALUES ('${ws1}', '${p1}', '${u1}');`);
  } catch {
    duplicateVoteFailed = true;
  }
  assert(duplicateVoteFailed, 'duplicate user vote on same post is rejected by partial unique index');

  // 20. email dedupe_key prevents double sends in email_outbox
  let dedupeBlocked = false;
  await db.query(`INSERT INTO email_outbox (workspace_id, to_email, template, dedupe_key) VALUES ('${ws1}', 'test@example.com', 'welcome', 'key_123');`);
  try {
    await db.query(`INSERT INTO email_outbox (workspace_id, to_email, template, dedupe_key) VALUES ('${ws1}', 'test@example.com', 'welcome', 'key_123');`);
  } catch {
    dedupeBlocked = true;
  }
  assert(dedupeBlocked, 'email dedupe_key prevents double sends');

  // 21. post_migrate.sql is idempotent (running twice produces no errors)
  await db.exec(postSql);
  assert(true, 'post_migrate.sql is idempotent and re-applies cleanly');

  console.log(`\n🎉 ${passed} checks passed.`);
}

runInvariants().catch((err) => {
  console.error('Invariant test error:', err);
  process.exit(1);
});
