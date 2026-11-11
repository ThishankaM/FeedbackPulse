import { db as defaultDb } from './client.js';

export type RuntimeDatabase = typeof defaultDb;

const GLOBAL_DB_KEY = Symbol.for('__feedbackpulse_runtime_db__');

export function getDb(): RuntimeDatabase {
  return (globalThis as any)[GLOBAL_DB_KEY] || defaultDb;
}

// Test-only hook used to point the application at an isolated in-memory database.
export function setDatabaseForTesting(database: unknown): void {
  (globalThis as any)[GLOBAL_DB_KEY] = database as RuntimeDatabase;
}
