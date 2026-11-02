import { runSeed } from './seed';
import { pool } from './client';

const reset = process.argv.includes('--reset');

runSeed(reset)
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seeding failed:', err);
    await pool.end();
    process.exit(1);
  });
