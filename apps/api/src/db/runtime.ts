import { db as defaultDb } from './client.js';

export type RuntimeDatabase = typeof defaultDb;

let runtimeDb: RuntimeDatabase = defaultDb;

export function getDb(): RuntimeDatabase {
  return runtimeDb;
}

// Test-only hook used to point the application at an isolated in-memory database.
export function setDatabaseForTesting(database: unknown): void {
  runtimeDb = database as RuntimeDatabase;
}
