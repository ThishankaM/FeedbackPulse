import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('⏳ Running database migrations (node-postgres)...');
  try {
    const migrationsFolder = path.resolve(__dirname, './migrations');
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
