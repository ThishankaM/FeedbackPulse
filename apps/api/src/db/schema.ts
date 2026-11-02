import { pgTable, uuid, text, varchar, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- WORKSPACES ---
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // e.g. "acme" -> /b/acme
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 30 }).default('#4F46E5').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- USERS ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- WORKSPACE MEMBERS ---
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('MEMBER').notNull(), // "OWNER", "ADMIN", "MEMBER"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_member_unique_idx').on(table.workspaceId, table.userId),
]);

// --- BOARDS ---
export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // e.g. "Feature Requests"
  slug: varchar('slug', { length: 100 }).notNull(), // e.g. "features"
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_board_slug_idx').on(table.workspaceId, table.slug),
]);

// --- POSTS (FEEDBACK ITEMS) ---
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(), // Markdown format
  status: varchar('status', { length: 50 }).default('UNDER_REVIEW').notNull(), // UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETED, CLOSED
  voteCount: integer('vote_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('posts_board_status_idx').on(table.boardId, table.status),
  index('posts_vote_count_idx').on(table.boardId, table.voteCount),
]);

// --- VOTES ---
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('post_user_vote_unique_idx').on(table.postId, table.userId),
]);

// --- COMMENTS ---
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(), // Admin internal note
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- CHANGELOGS ---
export const changelogs = pgTable('changelogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull(),
  content: text('content').notNull(), // Markdown formatted release notes
  publishedAt: timestamp('published_at', { withTimezone: true }),
  isPublished: boolean('is_published').default(false).notNull(),
  tags: text('tags').array(), // e.g. ["Improvement", "New Feature"]
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_changelog_slug_idx').on(table.workspaceId, table.slug),
]);

// --- RELATIONS ---
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  boards: many(boards),
  changelogs: many(changelogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  posts: many(posts),
  votes: many(votes),
  comments: many(comments),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [boards.workspaceId], references: [workspaces.id] }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  board: one(boards, { fields: [posts.boardId], references: [boards.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  votes: many(votes),
  comments: many(comments),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  post: one(posts, { fields: [votes.postId], references: [posts.id] }),
  user: one(users, { fields: [votes.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const changelogsRelations = relations(changelogs, ({ one }) => ({
  workspace: one(workspaces, { fields: [changelogs.workspaceId], references: [workspaces.id] }),
}));
