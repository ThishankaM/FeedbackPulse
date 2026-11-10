import { relations } from 'drizzle-orm';
import { users, authAccounts, sessions } from './auth.js';
import { workspaces, workspaceMembers, workspaceEmbedDomains, apiKeys } from './workspaces.js';
import { visitors, boards, posts, postVotes, comments } from './feedback.js';
import { changelogs, changelogPosts } from './content.js';
import { tags, postTags, changelogTags, postAttachments, auditLogs, notifications, emailOutbox } from './ops.js';

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  authAccounts: many(authAccounts),
  sessions: many(sessions),
  posts: many(posts),
  comments: many(comments),
  votes: many(postVotes),
  notifications: many(notifications),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  embedDomains: many(workspaceEmbedDomains),
  apiKeys: many(apiKeys),
  visitors: many(visitors),
  boards: many(boards),
  posts: many(posts),
  tags: many(tags),
  changelogs: many(changelogs),
  auditLogs: many(auditLogs),
  emailOutbox: many(emailOutbox),
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
  workspace: one(workspaces, { fields: [posts.workspaceId], references: [workspaces.id] }),
  board: one(boards, { fields: [posts.boardId], references: [boards.id] }),
  authorUser: one(users, { fields: [posts.authorUserId], references: [users.id] }),
  authorVisitor: one(visitors, { fields: [posts.authorVisitorId], references: [visitors.id] }),
  mergedInto: one(posts, { fields: [posts.mergedIntoPostId], references: [posts.id] }),
  votes: many(postVotes),
  comments: many(comments),
  tags: many(postTags),
  attachments: many(postAttachments),
  changelogPosts: many(changelogPosts),
}));

export const postVotesRelations = relations(postVotes, ({ one }) => ({
  post: one(posts, { fields: [postVotes.postId], references: [posts.id] }),
  user: one(users, { fields: [postVotes.userId], references: [users.id] }),
  visitor: one(visitors, { fields: [postVotes.visitorId], references: [visitors.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  parent: one(comments, { fields: [comments.parentId], references: [comments.id] }),
  replies: many(comments),
  authorUser: one(users, { fields: [comments.authorUserId], references: [users.id] }),
  authorVisitor: one(visitors, { fields: [comments.authorVisitorId], references: [visitors.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [tags.workspaceId], references: [workspaces.id] }),
  postTags: many(postTags),
  changelogTags: many(changelogTags),
}));

export const changelogsRelations = relations(changelogs, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [changelogs.workspaceId], references: [workspaces.id] }),
  authorUser: one(users, { fields: [changelogs.authorUserId], references: [users.id] }),
  tags: many(changelogTags),
  posts: many(changelogPosts),
}));
