import { pool } from '../src/db/client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPostMigrate() {
  const sqlPath = path.resolve(__dirname, '../src/db/sql/post_migrate.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('⚡ Applying trigger and security layer (post_migrate.sql)...');
  await pool.query(sql);
  console.log('✅ Trigger and security layer applied successfully!');
  await pool.end();
}

runPostMigrate().catch((err) => {
  console.error('❌ post_migrate failed:', err);
  process.exit(1);
});
