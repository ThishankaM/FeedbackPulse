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
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { primaryUuid, timestamps, softDelete } from './_helpers.js';
import { postStatusEnum, moderationStatusEnum } from './_enums.js';
import { workspaces } from './workspaces.js';
import { users } from './auth.js';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const visitors = pgTable('visitors', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  anonymousId: varchar('anonymous_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  ipHash: varchar('ip_hash', { length: 100 }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_visitor_anon_idx').on(table.workspaceId, table.anonymousId),
]);

export const boards = pgTable('boards', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  isDefault: boolean('is_default').default(false).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_board_slug_idx').on(table.workspaceId, table.slug),
]);

export const posts = pgTable('posts', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  authorVisitorId: uuid('author_visitor_id').references(() => visitors.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  status: postStatusEnum('status').default('UNDER_REVIEW').notNull(),
  moderationStatus: moderationStatusEnum('moderation_status').default('APPROVED').notNull(),
  voteCount: integer('vote_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  searchVector: tsvector('search_vector').generatedAlwaysAs(
    sql`to_tsvector('english', coalesce(${sql.raw('title')}, '') || ' ' || coalesce(${sql.raw('content')}, ''))`
  ),
  mergedIntoPostId: uuid('merged_into_post_id').references((): any => posts.id, { onDelete: 'set null' }),
  ...softDelete,
  ...timestamps,
}, (table) => [
  index('posts_workspace_board_idx').on(table.workspaceId, table.boardId),
  index('posts_workspace_status_idx').on(table.workspaceId, table.status),
  index('posts_workspace_vote_count_idx').on(table.workspaceId, table.voteCount),
  index('posts_board_feed_idx').on(table.boardId, table.status, table.voteCount),
  // Composite index for public/anonymous reads
  index('posts_workspace_filter_idx').on(table.workspaceId, table.deletedAt, table.moderationStatus),
]);

export const postVotes = pgTable('post_votes', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  visitorId: uuid('visitor_id').references(() => visitors.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('post_votes_post_user_unique_idx')
    .on(table.postId, table.userId)
    .where(sql`${table.userId} IS NOT NULL`),
  uniqueIndex('post_votes_post_visitor_unique_idx')
    .on(table.postId, table.visitorId)
    .where(sql`${table.visitorId} IS NOT NULL`),
]);

export const comments = pgTable('comments', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id').references((): any => comments.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  authorVisitorId: uuid('author_visitor_id').references(() => visitors.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  moderationStatus: moderationStatusEnum('moderation_status').default('APPROVED').notNull(),
  ...softDelete,
  ...timestamps,
}, (table) => [
  index('comments_post_idx').on(table.postId),
]);
