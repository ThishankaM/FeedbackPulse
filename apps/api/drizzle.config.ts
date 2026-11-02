import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL_DIRECT ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/feedbackpulse',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
