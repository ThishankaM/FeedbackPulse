import { pgTable, text, varchar, timestamp, uniqueIndex, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { primaryUuid, timestamps } from './_helpers';
import { changelogStatusEnum } from './_enums';
import { workspaces } from './workspaces';
import { users } from './auth';
import { posts } from './feedback';

export const changelogs = pgTable('changelogs', {
  id: primaryUuid(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  content: text('content').notNull(),
  status: changelogStatusEnum('status').default('DRAFT').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (table) => [
  uniqueIndex('workspace_changelog_slug_idx').on(table.workspaceId, table.slug),
]);

export const changelogPosts = pgTable('changelog_posts', {
  changelogId: uuid('changelog_id').references(() => changelogs.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.changelogId, table.postId] }),
]);
