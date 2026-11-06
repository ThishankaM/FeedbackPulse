import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL_DIRECT ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/feedbackpulse';

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
});

export const db = drizzle(pool, { schema });
export * from './schema.js';
