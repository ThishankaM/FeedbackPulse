import { pgTable, text, varchar, timestamp, boolean, uniqueIndex, jsonb, uuid } from 'drizzle-orm/pg-core';
import { primaryUuid, timestamps, softDelete } from './_helpers';
import { workspacePlanEnum, workspaceMemberRoleEnum, workspaceMemberStatusEnum } from './_enums';
import { users } from './auth';

export const workspaces = pgTable('workspaces', {
  id: primaryUuid(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 30 }).default('#4F46E5').notNull(),
  plan: workspacePlanEnum('plan').default('FREE').notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  ...softDelete,
  ...timestamps,
});

export const workspaceMembers = pgTable('workspace_members', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: workspaceMemberRoleEnum('role').default('MEMBER').notNull(),
  status: workspaceMemberStatusEnum('status').default('ACTIVE').notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('workspace_member_unique_idx').on(table.workspaceId, table.userId),
]);

export const workspaceEmbedDomains = pgTable('workspace_embed_domains', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  origin: varchar('origin', { length: 255 }).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_embed_origin_unique_idx').on(table.workspaceId, table.origin),
]);

export const apiKeys = pgTable('api_keys', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
  scopes: jsonb('scopes').$type<string[]>().default(['read', 'write']).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
