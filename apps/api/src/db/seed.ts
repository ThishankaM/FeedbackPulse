import { db, pool } from './client';
import {
  workspaces,
  users,
  workspaceMembers,
  boards,
  posts,
  postVotes,
  comments,
  changelogs,
  tags,
  changelogTags,
  changelogPosts,
} from './schema';
import { eq, sql } from 'drizzle-orm';

export async function runSeed(reset: boolean = false) {
  if (reset) {
    console.log('🧹 Resetting database tables...');
    // Truncate tables cleanly with cascade
    await db.execute(sql`
      TRUNCATE TABLE 
        post_attachments, uploads, post_tags, changelog_tags, changelog_posts,
        comments, post_votes, posts, boards, changelogs, tags,
        workspace_embed_domains, api_keys, workspace_members, visitors,
        workspaces, one_time_tokens, sessions, auth_accounts, audit_logs,
        notifications, notification_preferences, email_outbox, users
      CASCADE;
    `);
  }

  // Check idempotency: if acme exists, skip
  const [existingWorkspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, 'acme'));

  if (existingWorkspace && !reset) {
    console.log('Already seeded');
    return;
  }

  console.log('🌱 Seeding FeedbackPulse database...');

  // 1. Users (3 users)
  const [owner] = await db
    .insert(users)
    .values({
      email: 'owner@acme.test',
      name: 'Alice Owner',
      status: 'ACTIVE',
    })
    .returning();

  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@acme.test',
      name: 'Bob Admin',
      status: 'ACTIVE',
    })
    .returning();

  const [member] = await db
    .insert(users)
    .values({
      email: 'member@acme.test',
      name: 'Charlie Member',
      status: 'ACTIVE',
    })
    .returning();

  // 2. Workspace (1: acme)
  const [acme] = await db
    .insert(workspaces)
    .values({
      name: 'Acme Software',
      slug: 'acme',
      primaryColor: '#4F46E5',
      plan: 'PRO',
    })
    .returning();

  // 3. Workspace Members (one OWNER, one ADMIN, one MEMBER, one INVITED)
  await db.insert(workspaceMembers).values([
    { workspaceId: acme.id, userId: owner.id, role: 'OWNER', status: 'ACTIVE' },
    { workspaceId: acme.id, userId: admin.id, role: 'ADMIN', status: 'ACTIVE' },
    { workspaceId: acme.id, userId: member.id, role: 'MEMBER', status: 'ACTIVE' },
  ]);

  // 4. Boards (2: features, bugs)
  const [featuresBoard] = await db
    .insert(boards)
    .values({
      workspaceId: acme.id,
      name: 'Feature Requests',
      slug: 'features',
      description: 'Customer suggestions and ideas',
      isDefault: true,
      isPublic: true,
    })
    .returning();

  const [bugsBoard] = await db
    .insert(boards)
    .values({
      workspaceId: acme.id,
      name: 'Bug Reports',
      slug: 'bugs',
      description: 'Report glitches and issues',
      isDefault: false,
      isPublic: true,
    })
    .returning();

  // 5. Posts (6 posts)
  const createdPosts = await db
    .insert(posts)
    .values([
      {
        workspaceId: acme.id,
        boardId: featuresBoard.id,
        authorUserId: owner.id,
        title: 'Dark mode for the widget',
        content: 'Widget should automatically respect parent site dark theme.',
        status: 'PLANNED',
        moderationStatus: 'APPROVED',
      },
      {
        workspaceId: acme.id,
        boardId: featuresBoard.id,
        authorUserId: admin.id,
        title: 'Public REST API & Outbound Webhooks',
        content: 'Allow integrating FeedbackPulse with Slack, Linear, and Zapier.',
        status: 'IN_PROGRESS',
        moderationStatus: 'APPROVED',
      },
      {
        workspaceId: acme.id,
        boardId: featuresBoard.id,
        authorUserId: member.id,
        title: 'CSV export for product reviews',
        content: 'Export monthly feedback digests for stakeholder reviews.',
        status: 'UNDER_REVIEW',
        moderationStatus: 'APPROVED',
      },
      {
        workspaceId: acme.id,
        boardId: featuresBoard.id,
        authorUserId: owner.id,
        title: 'Mobile touch optimizations',
        content: 'Ensure all board views work smoothly on mobile touchscreens.',
        status: 'COMPLETED',
        moderationStatus: 'APPROVED',
      },
      {
        workspaceId: acme.id,
        boardId: bugsBoard.id,
        authorUserId: admin.id,
        title: 'Safari iframe cookie partition fix',
        content: 'Resolve third-party cookie restrictions in Safari.',
        status: 'IN_PROGRESS',
        moderationStatus: 'APPROVED',
      },
      {
        workspaceId: acme.id,
        boardId: bugsBoard.id,
        authorUserId: member.id,
        title: 'Long titles overflow on mobile card',
        content: 'Truncate post titles gracefully on narrow viewport.',
        status: 'CLOSED',
        moderationStatus: 'APPROVED',
      },
    ])
    .returning();

  const p1 = createdPosts[0]; // Dark mode
  const p2 = createdPosts[1]; // API
  const p3 = createdPosts[2]; // CSV
  const p4 = createdPosts[3]; // Mobile

  // 6. Votes (10 votes distributed across posts)
  // Remember: trigger will update vote_count automatically!
  await db.insert(postVotes).values([
    { workspaceId: acme.id, postId: p1.id, userId: owner.id },
    { workspaceId: acme.id, postId: p1.id, userId: admin.id },
    { workspaceId: acme.id, postId: p1.id, userId: member.id },
    { workspaceId: acme.id, postId: p2.id, userId: owner.id },
    { workspaceId: acme.id, postId: p2.id, userId: admin.id },
    { workspaceId: acme.id, postId: p3.id, userId: owner.id },
    { workspaceId: acme.id, postId: p4.id, userId: owner.id },
    { workspaceId: acme.id, postId: p4.id, userId: admin.id },
    { workspaceId: acme.id, postId: p4.id, userId: member.id },
    { workspaceId: acme.id, postId: createdPosts[4].id, userId: admin.id },
  ]);

  // 7. Comments (4 comments: 3 public, 1 internal)
  // Trigger will update comment_count automatically (excluding internal)!
  await db.insert(comments).values([
    {
      workspaceId: acme.id,
      postId: p1.id,
      authorUserId: owner.id,
      content: 'We are designing theme tokens for this right now!',
      isInternal: false,
    },
    {
      workspaceId: acme.id,
      postId: p1.id,
      authorUserId: admin.id,
      content: 'Will this support CSS variables injection?',
      isInternal: false,
    },
    {
      workspaceId: acme.id,
      postId: p1.id,
      authorUserId: admin.id,
      content: 'Internal note: ThemeProvider handles .dark class toggle cleanly.',
      isInternal: true, // Internal!
    },
    {
      workspaceId: acme.id,
      postId: p2.id,
      authorUserId: member.id,
      content: 'Looking forward to the webhook payload documentation.',
      isInternal: false,
    },
  ]);

  // 8. Changelogs (2: 1 published, 1 draft)
  await db.insert(changelogs).values([
    {
      workspaceId: acme.id,
      title: 'v1.0 Release - Welcome to FeedbackPulse',
      slug: 'v1-0-release',
      content: '### Highlights\n- Public feedback board for Acme\n- Upvoting and discussions',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorUserId: owner.id,
    },
    {
      workspaceId: acme.id,
      title: 'v1.1 Draft - Upcoming Features',
      slug: 'v1-1-draft',
      content: '### Upcoming\n- Dark mode support\n- Webhooks',
      status: 'DRAFT',
      authorUserId: admin.id,
    },
  ]);

  console.log('✅ Seed complete: 3 users, 1 workspace, 2 boards, 6 posts, 10 votes, 4 comments, 2 changelogs');
}
