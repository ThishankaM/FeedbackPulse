import { db, client } from './index';
import { workspaces, users, workspaceMembers, boards, posts, votes, comments, changelogs } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Check or create demo user
    let [demoUser] = await db.select().from(users).where(eq(users.email, 'demo@feedbackpulse.com'));
    if (!demoUser) {
      [demoUser] = await db.insert(users).values({
        email: 'demo@feedbackpulse.com',
        name: 'Alex Product Manager',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop',
      }).returning();
      console.log('  Created demo user:', demoUser.email);
    }

    // 2. Check or create workspace
    let [acmeWorkspace] = await db.select().from(workspaces).where(eq(workspaces.slug, 'acme'));
    if (!acmeWorkspace) {
      [acmeWorkspace] = await db.insert(workspaces).values({
        name: 'Acme Software',
        slug: 'acme',
        primaryColor: '#4F46E5',
        logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop',
      }).returning();
      console.log('  Created demo workspace:', acmeWorkspace.slug);

      // Add user as OWNER
      await db.insert(workspaceMembers).values({
        workspaceId: acmeWorkspace.id,
        userId: demoUser.id,
        role: 'OWNER',
      });
      console.log('  Assigned user as OWNER of workspace');

      // 3. Create default boards
      const [featureBoard] = await db.insert(boards).values({
        workspaceId: acmeWorkspace.id,
        name: 'Feature Requests',
        slug: 'features',
        description: 'Suggest and vote on new features for upcoming releases.',
      }).returning();

      const [bugBoard] = await db.insert(boards).values({
        workspaceId: acmeWorkspace.id,
        name: 'Bug Reports',
        slug: 'bugs',
        description: 'Report glitches, regressions, and UI bugs.',
      }).returning();
      console.log('  Created boards: features & bugs');

      // 4. Create sample posts
      const [post1] = await db.insert(posts).values({
        boardId: featureBoard.id,
        authorId: demoUser.id,
        title: 'Dark Mode & Custom Theme Support',
        content: 'We need full dark mode support across the web dashboard and embeddable widget.',
        status: 'PLANNED',
        voteCount: 15,
      }).returning();

      const [post2] = await db.insert(posts).values({
        boardId: featureBoard.id,
        authorId: demoUser.id,
        title: 'Public REST API & Outbound Webhooks',
        content: 'Allow integrating FeedbackPulse with Slack, Linear, and Zapier via webhooks.',
        status: 'IN_PROGRESS',
        voteCount: 32,
      }).returning();

      const [post3] = await db.insert(posts).values({
        boardId: featureBoard.id,
        authorId: demoUser.id,
        title: 'Export Feedback Items to CSV & PDF',
        content: 'Product leaders should be able to download monthly feedback digests for stakeholder reviews.',
        status: 'UNDER_REVIEW',
        voteCount: 8,
      }).returning();

      const [post4] = await db.insert(posts).values({
        boardId: featureBoard.id,
        authorId: demoUser.id,
        title: 'Mobile-Responsive Public Feedback Board',
        content: 'Ensure all board views work smoothly on iOS and Android browsers with touch targets.',
        status: 'COMPLETED',
        voteCount: 42,
      }).returning();

      // Sample vote
      await db.insert(votes).values({
        postId: post1.id,
        userId: demoUser.id,
      });

      // Sample comments
      await db.insert(comments).values([
        {
          postId: post1.id,
          authorId: demoUser.id,
          content: 'We are starting design tokens for this in Sprint 1!',
          isInternal: false,
        },
        {
          postId: post1.id,
          authorId: demoUser.id,
          content: 'Internal note: Tailwind v4 or shadcn ThemeProvider handles this easily.',
          isInternal: true,
        },
      ]);

      // 5. Sample Changelog Entry
      await db.insert(changelogs).values({
        workspaceId: acmeWorkspace.id,
        title: 'v1.0 Release - Welcome to FeedbackPulse',
        slug: 'v1-0-release',
        content: '### Highlights\n- Public feedback board for Acme\n- Upvoting and community discussions\n- Real-time roadmap preview',
        isPublished: true,
        publishedAt: new Date(),
        tags: ['New Feature', 'Improvement'],
      });
      console.log('  Created sample changelog release note');
    } else {
      console.log('  Workspace already exists, skipping seed.');
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
