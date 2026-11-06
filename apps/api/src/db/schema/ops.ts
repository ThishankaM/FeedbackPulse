import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  uuid,
  primaryKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { primaryUuid } from './_helpers.js';
import { notificationKindEnum, emailStatusEnum } from './_enums.js';
import { workspaces } from './workspaces.js';
import { users } from './auth.js';
import { posts } from './feedback.js';
import { changelogs } from './content.js';

export const tags = pgTable('tags', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  color: varchar('color', { length: 30 }).default('#6B7280').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_tag_slug_idx').on(table.workspaceId, table.slug),
]);

export const postTags = pgTable('post_tags', {
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.postId, table.tagId] }),
]);

export const changelogTags = pgTable('changelog_tags', {
  changelogId: uuid('changelog_id').references(() => changelogs.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.changelogId, table.tagId] }),
]);

export const uploads = pgTable('uploads', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  uploaderUserId: uuid('uploader_user_id').references(() => users.id, { onDelete: 'set null' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull().unique(),
  contentType: varchar('content_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const postAttachments = pgTable('post_attachments', {
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.postId, table.uploadId] }),
]);

export const auditLogs = pgTable('audit_logs', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_logs_workspace_idx').on(table.workspaceId, table.createdAt),
]);

export const notifications = pgTable('notifications', {
  id: primaryUuid(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  kind: notificationKindEnum('kind').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('notifications_user_read_idx').on(table.userId, table.readAt),
]);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  kind: notificationKindEnum('kind').notNull(),
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.kind] }),
]);

export const emailOutbox = pgTable('email_outbox', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  toEmail: varchar('to_email', { length: 255 }).notNull(),
  template: varchar('template', { length: 100 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  dedupeKey: varchar('dedupe_key', { length: 255 }).unique(),
  status: emailStatusEnum('status').default('PENDING').notNull(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('email_outbox_status_scheduled_idx').on(table.status, table.scheduledFor),
]);
