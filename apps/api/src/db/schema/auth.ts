import { pgTable, text, varchar, timestamp, uniqueIndex, jsonb, uuid } from 'drizzle-orm/pg-core';
import { primaryUuid, timestamps, softDelete } from './_helpers.js';
import { userStatusEnum, tokenPurposeEnum, authProviderEnum } from './_enums.js';

export const users = pgTable('users', {
  id: primaryUuid(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  status: userStatusEnum('status').default('ACTIVE').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  ...softDelete,
  ...timestamps,
});

export const authAccounts = pgTable('auth_accounts', {
  id: primaryUuid(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: authProviderEnum('provider').notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_accounts_provider_uid_idx').on(table.provider, table.providerAccountId),
]);

export const sessions = pgTable('sessions', {
  id: primaryUuid(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const oneTimeTokens = pgTable('one_time_tokens', {
  id: primaryUuid(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  purpose: tokenPurposeEnum('purpose').notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
