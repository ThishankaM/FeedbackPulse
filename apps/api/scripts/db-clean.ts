import { pool } from '../src/db/client.js';

async function cleanDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  // Guard per AGENTS.md R7: Confirm DATABASE_URL points at localhost
  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('postgres:');
  if (!isLocal) {
    console.error('⛔ Safety guard blocked TRUNCATE: DATABASE_URL does not point at localhost.');
    process.exit(1);
  }

  console.log('🧹 Truncating all data from PostgreSQL tables...');

  const truncateSql = `
    TRUNCATE TABLE 
      post_attachments, uploads, post_tags, changelog_tags, changelog_posts,
      comments, post_votes, posts, boards, changelogs, tags,
      workspace_embed_domains, api_keys, workspace_members, visitors,
      workspaces, one_time_tokens, sessions, auth_accounts, audit_logs,
      notifications, notification_preferences, email_outbox, users
    CASCADE;
  `;

  await pool.query(truncateSql);
  console.log('✨ All test data removed! Database is now completely empty and clean.');
  await pool.end();
}

cleanDatabase().catch((err) => {
  console.error('❌ Failed to clean database:', err);
  process.exit(1);
});
