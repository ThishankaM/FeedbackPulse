import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from './db/index';
import { workspaces, users, workspaceMembers, boards, posts, changelogs, postVotes, comments, auditLogs } from './db/schema';
import { eq, and, isNull, desc, asc, gte, lt } from 'drizzle-orm';
import { toggleVote } from './db/queries/feedback';
import { hashPassword, verifyPassword, createToken, verifyAuthToken } from './lib/auth';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new Hono();

const percentDelta = (current: number, previous: number): string => {
  if (previous <= 0) {
    return current > 0 ? '+100%' : '+0%';
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta >= 0 ? '+' : ''}${delta}%`;
};

// Middlewares
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Route Definitions chained for Hono RPC type inference
const routes = app
  // 0. Welcome / Index
  .get('/', (c) => {
    return c.json({
      name: 'FeedbackPulse API',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        health: '/api/health',
        workspaces: '/api/workspaces/:slug',
        login: '/api/auth/login',
        register: '/api/auth/register',
        me: '/api/auth/me',
      },
    });
  })

  // 1. Healthcheck
  .get('/api/health', async (c) => {
    try {
      // Simple database connectivity probe
      await db.select().from(workspaces).limit(1);
      return c.json({
        status: 'ok',
        uptime: process.uptime(),
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return c.json({
        status: 'degraded',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
      }, 503);
    }
  })

  // 2. Auth: Register
  .post(
    '/api/auth/register',
    zValidator(
      'json',
      z.object({
        email: z.string().email(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        name: z.string().min(1).optional(),
      })
    ),
    async (c) => {
      const { email, password, name } = c.req.valid('json');

      try {
        const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
        if (existing) {
          return c.json({ error: 'User with this email already exists' }, 409);
        }

        const passwordHash = await hashPassword(password);
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            name: name || email.split('@')[0],
            passwordHash,
            status: 'ACTIVE',
          })
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            avatarUrl: users.avatarUrl,
          });

        const token = await createToken(newUser);
        return c.json({ token, user: newUser }, 201);
      } catch (error: any) {
        return c.json({ error: error.message || 'Registration failed' }, 500);
      }
    }
  )

  // 3. Auth: Login
  .post(
    '/api/auth/login',
    zValidator(
      'json',
      z.object({
        email: z.string().email(),
        password: z.string().min(1, 'Password is required'),
      })
    ),
    async (c) => {
      const { email, password } = c.req.valid('json');

      try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user || user.deletedAt || user.status !== 'ACTIVE') {
          return c.json({ error: 'Invalid email or password' }, 401);
        }

        // Password sign-in requires a password to verify against; accounts
        // created without one (SSO/seeded demo users) cannot use it.
        if (!user.passwordHash) {
          return c.json({ error: 'This account has no password set' }, 401);
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return c.json({ error: 'Invalid email or password' }, 401);
        }

        const safeUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        };

        const token = await createToken(safeUser);
        return c.json({ token, user: safeUser }, 200);
      } catch (error: any) {
        return c.json({ error: error.message || 'Login failed' }, 500);
      }
    }
  )

  // 4. Auth: Current User Profile & Workspaces
  .get('/api/auth/me', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: Missing token' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyAuthToken(token);
    if (!payload || !payload.sub) {
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.sub));

    if (!user || user.status !== 'ACTIVE') {
      return c.json({ error: 'User not found or inactive' }, 401);
    }

    // Fetch user's workspace memberships
    const members = await db
      .select({
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        primaryColor: workspaces.primaryColor,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, user.id));

    return c.json({ user, memberships: members }, 200);
  })

  // 5. Workspaces
  .get('/api/workspaces', async (c) => {
    const allWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        primaryColor: workspaces.primaryColor,
      })
      .from(workspaces)
      .limit(20);
    return c.json({ workspaces: allWorkspaces }, 200);
  })
  .get('/api/workspaces/:slug', async (c) => {
    const slug = c.req.param('slug');
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
    
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    return c.json({ workspace }, 200);
  })
  .post(
    '/api/workspaces',
    zValidator(
      'json',
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(255),
        slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
        primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Must be a valid hex color').default('#4F46E5'),
        logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
        ownerEmail: z.string().email().optional(),
        ownerName: z.string().optional(),
      })
    ),
    async (c) => {
      const { name, slug, primaryColor, logoUrl, ownerEmail, ownerName } = c.req.valid('json');

      try {
        // 1. If auth header is provided, use authenticated user as owner
        let owner: any = null;
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const payload = await verifyAuthToken(authHeader.substring(7));
          if (payload?.sub) {
            const [existingAuthUser] = await db.select().from(users).where(eq(users.id, payload.sub as string));
            if (existingAuthUser) {
              owner = existingAuthUser;
            }
          }
        }

        // 2. If not authenticated, find or create user by ownerEmail
        if (!owner) {
          const emailToUse = ownerEmail || `${slug}-admin@feedbackpulse.dev`;
          const [existing] = await db.select().from(users).where(eq(users.email, emailToUse));
          if (existing) {
            owner = existing;
          } else {
            [owner] = await db
              .insert(users)
              .values({
                email: emailToUse,
                name: ownerName || emailToUse.split('@')[0],
                status: 'ACTIVE',
              })
              .returning();
          }
        }

        // 3. Create workspace
        const [workspace] = await db
          .insert(workspaces)
          .values({
            name,
            slug,
            primaryColor,
            logoUrl: logoUrl && logoUrl.trim().length > 0 ? logoUrl : null,
          })
          .returning();

        // 4. Assign user as OWNER
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: owner.id,
          role: 'OWNER',
        });

        // 5. Create default feedback board for this workspace
        const [defaultBoard] = await db
          .insert(boards)
          .values({
            workspaceId: workspace.id,
            name: 'Feature Requests',
            slug: 'features',
            description: 'General feedback and feature requests',
            isDefault: true,
            isPublic: true,
          })
          .returning();

        // 6. Issue JWT token for the owner
        const token = await createToken({
          id: owner.id,
          email: owner.email,
          name: owner.name,
        });

        return c.json({ workspace, owner, defaultBoard, token }, 201);
      } catch (error: any) {
        if (error?.code === '23505') { // Postgres unique violation
          return c.json({ error: 'A workspace with this slug already exists' }, 409);
        }
        return c.json({ error: error.message || 'Failed to create workspace' }, 500);
      }
    }
  )

  // 6. Workspace Dashboard Data (KPI Metrics + Status Columns + Boards)
  .get('/api/workspaces/:slug/dashboard', async (c) => {
    const slug = c.req.param('slug');

    try {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
      if (!workspace) {
        return c.json({ error: 'Workspace not found' }, 404);
      }

      const workspaceBoards = await db
        .select({
          id: boards.id,
          name: boards.name,
          slug: boards.slug,
          description: boards.description,
          isDefault: boards.isDefault,
        })
        .from(boards)
        .where(and(eq(boards.workspaceId, workspace.id), isNull(boards.archivedAt)));

      // Fetch approved, non-deleted posts for this workspace
      const workspacePosts = await db
        .select({
          id: posts.id,
          boardId: posts.boardId,
          title: posts.title,
          content: posts.content,
          status: posts.status,
          voteCount: posts.voteCount,
          commentCount: posts.commentCount,
          createdAt: posts.createdAt,
          authorName: users.name,
          authorAvatar: users.avatarUrl,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorUserId, users.id))
        .where(
          and(
            eq(posts.workspaceId, workspace.id),
            isNull(posts.deletedAt),
            eq(posts.moderationStatus, 'APPROVED')
          )
        )
        .orderBy(desc(posts.voteCount), desc(posts.createdAt));

      // Calculate real KPI metrics from database
      const totalFeedback = workspacePosts.length;
      const totalVotes = workspacePosts.reduce((acc, p) => acc + (p.voteCount || 0), 0);
      const totalComments = workspacePosts.reduce((acc, p) => acc + (p.commentCount || 0), 0);

      // Month-over-month deltas for the KPI cards
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const feedbackThisMonth = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.workspaceId, workspace.id),
            isNull(posts.deletedAt),
            gte(posts.createdAt, monthStart)
          )
        );

      const feedbackLastMonth = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.workspaceId, workspace.id),
            isNull(posts.deletedAt),
            gte(posts.createdAt, prevMonthStart),
            lt(posts.createdAt, monthStart)
          )
        );

      const votesThisMonth = await db
        .select({ id: postVotes.id })
        .from(postVotes)
        .where(
          and(
            eq(postVotes.workspaceId, workspace.id),
            gte(postVotes.createdAt, monthStart)
          )
        );

      const votesLastMonth = await db
        .select({ id: postVotes.id })
        .from(postVotes)
        .where(
          and(
            eq(postVotes.workspaceId, workspace.id),
            gte(postVotes.createdAt, prevMonthStart),
            lt(postVotes.createdAt, monthStart)
          )
        );

      const commentsThisMonth = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.workspaceId, workspace.id),
            eq(comments.isInternal, false),
            isNull(comments.deletedAt),
            gte(comments.createdAt, monthStart)
          )
        );

      const commentsLastMonth = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.workspaceId, workspace.id),
            eq(comments.isInternal, false),
            isNull(comments.deletedAt),
            gte(comments.createdAt, prevMonthStart),
            lt(comments.createdAt, monthStart)
          )
        );

      const releasesThisMonth = await db
        .select({ id: changelogs.id })
        .from(changelogs)
        .where(
          and(
            eq(changelogs.workspaceId, workspace.id),
            eq(changelogs.status, 'PUBLISHED'),
            gte(changelogs.publishedAt, monthStart)
          )
        );

      const releasesLastMonth = await db
        .select({ id: changelogs.id })
        .from(changelogs)
        .where(
          and(
            eq(changelogs.workspaceId, workspace.id),
            eq(changelogs.status, 'PUBLISHED'),
            gte(changelogs.publishedAt, prevMonthStart),
            lt(changelogs.publishedAt, monthStart)
          )
        );

      const thisMonthReleases = releasesThisMonth.length;

      // Group posts by status
      const columns = {
        UNDER_REVIEW: workspacePosts.filter((p) => p.status === 'UNDER_REVIEW'),
        PLANNED: workspacePosts.filter((p) => p.status === 'PLANNED'),
        IN_PROGRESS: workspacePosts.filter((p) => p.status === 'IN_PROGRESS'),
        COMPLETED: workspacePosts.filter((p) => p.status === 'COMPLETED'),
        CLOSED: workspacePosts.filter((p) => p.status === 'CLOSED'),
      };

      return c.json({
        workspace,
        metrics: {
          totalFeedback,
          totalVotes,
          totalComments,
          thisMonthReleases,
          deltas: {
            feedback: percentDelta(feedbackThisMonth.length, feedbackLastMonth.length),
            votes: percentDelta(votesThisMonth.length, votesLastMonth.length),
            comments: percentDelta(commentsThisMonth.length, commentsLastMonth.length),
            releases: percentDelta(releasesThisMonth.length, releasesLastMonth.length),
          },
        },
        columns,
        boards: workspaceBoards,
      }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch dashboard data' }, 500);
    }
  })

  // 7. Feedback: Create Post
  .post(
    '/api/posts',
    zValidator(
      'json',
      z.object({
        workspaceId: z.string().uuid(),
        boardId: z.string().uuid(),
        title: z.string().min(3, 'Title must be at least 3 characters').max(255),
        content: z.string().min(3, 'Description must be at least 3 characters'),
        status: z.enum(['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).default('UNDER_REVIEW'),
      })
    ),
    async (c) => {
      const { workspaceId, boardId, title, content, status } = c.req.valid('json');

      try {
        // Creating feedback requires an authenticated, active workspace member
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return c.json({ error: 'Sign in to submit feedback' }, 401);
        }

        const payload = await verifyAuthToken(authHeader.substring(7));
        if (!payload?.sub) {
          return c.json({ error: 'Sign in to submit feedback' }, 401);
        }

        const [author] = await db
          .select({ id: users.id, status: users.status })
          .from(users)
          .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

        if (!author || author.status !== 'ACTIVE') {
          return c.json({ error: 'Your account is not active' }, 401);
        }

        const [membership] = await db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspaceId),
              eq(workspaceMembers.userId, author.id)
            )
          );

        if (!membership) {
          return c.json({ error: 'You are not a member of this workspace' }, 403);
        }

        // Verify the target board belongs to this workspace
        const [targetBoard] = await db
          .select({ id: boards.id })
          .from(boards)
          .where(and(eq(boards.id, boardId), eq(boards.workspaceId, workspaceId)));

        if (!targetBoard) {
          return c.json({ error: 'Board not found for this workspace' }, 400);
        }

        const [newPost] = await db
          .insert(posts)
          .values({
            workspaceId,
            boardId,
            title,
            content,
            status,
            authorUserId: author.id,
            moderationStatus: 'APPROVED',
          })
          .returning();

        return c.json({ post: newPost }, 201);
      } catch (error: any) {
        return c.json({ error: error.message || 'Failed to create post' }, 500);
      }
    }
  )

  // 8. Feedback: Toggle Upvote (Atomic via database trigger)
  .post('/api/posts/:id/vote', async (c) => {
    const postId = c.req.param('id');

    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      if (!post) {
        return c.json({ error: 'Post not found' }, 404);
      }

      // Voting requires an authenticated, active workspace member
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Sign in to vote' }, 401);
      }

      const payload = await verifyAuthToken(authHeader.substring(7));
      if (!payload?.sub) {
        return c.json({ error: 'Sign in to vote' }, 401);
      }

      const [voter] = await db
        .select({ id: users.id, status: users.status })
        .from(users)
        .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

      if (!voter || voter.status !== 'ACTIVE') {
        return c.json({ error: 'Your account is not active' }, 401);
      }

      const [membership] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, post.workspaceId),
            eq(workspaceMembers.userId, voter.id)
          )
        );

      if (!membership) {
        return c.json({ error: 'You are not a member of this workspace' }, 403);
      }

      const result = await toggleVote({
        workspaceId: post.workspaceId,
        postId: post.id,
        userId: voter.id,
      });

      return c.json(result, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to toggle vote' }, 500);
    }
  })

  // 9. Feedback: Get Single Post Details
  .get('/api/posts/:id', async (c) => {
    const postId = c.req.param('id');

    try {
      const [post] = await db
        .select({
          id: posts.id,
          workspaceId: posts.workspaceId,
          boardId: posts.boardId,
          title: posts.title,
          content: posts.content,
          status: posts.status,
          voteCount: posts.voteCount,
          commentCount: posts.commentCount,
          createdAt: posts.createdAt,
          authorName: users.name,
          authorAvatar: users.avatarUrl,
          authorEmail: users.email,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorUserId, users.id))
        .where(
          and(
            eq(posts.id, postId),
            isNull(posts.deletedAt),
            eq(posts.moderationStatus, 'APPROVED')
          )
        );

      if (!post) {
        return c.json({ error: 'Post not found' }, 404);
      }

      // Query internal notes count directly from database
      const internalComments = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.postId, postId),
            eq(comments.workspaceId, post.workspaceId),
            eq(comments.isInternal, true),
            isNull(comments.deletedAt)
          )
        );

      // Query activity count directly from auditLogs
      const activityRecords = await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityId, postId),
            eq(auditLogs.workspaceId, post.workspaceId)
          )
        );

      // Check if current user has voted
      let hasVoted = false;
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const payload = await verifyAuthToken(authHeader.substring(7));
        if (payload?.sub) {
          const [vote] = await db
            .select({ id: postVotes.id })
            .from(postVotes)
            .where(
              and(
                eq(postVotes.postId, postId),
                eq(postVotes.userId, payload.sub)
              )
            );
          hasVoted = !!vote;
        }
      }

      return c.json({
        post: {
          ...post,
          hasVoted,
          internalCount: internalComments.length,
          activityCount: activityRecords.length,
        },
      }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch post' }, 500);
    }
  })

  // 10. Feedback: Update Post Status
  .patch(
    '/api/posts/:id/status',
    zValidator(
      'json',
      z.object({
        status: z.enum(['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']),
      })
    ),
    async (c) => {
      const postId = c.req.param('id');
      const { status } = c.req.valid('json');

      try {
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        if (!post) {
          return c.json({ error: 'Post not found' }, 404);
        }

        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return c.json({ error: 'Sign in to update status' }, 401);
        }

        const payload = await verifyAuthToken(authHeader.substring(7));
        if (!payload?.sub) {
          return c.json({ error: 'Sign in to update status' }, 401);
        }

        const [membership] = await db
          .select({ role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, post.workspaceId),
              eq(workspaceMembers.userId, payload.sub)
            )
          );

        if (!membership) {
          return c.json({ error: 'You are not a member of this workspace' }, 403);
        }

        const [updatedPost] = await db
          .update(posts)
          .set({ status })
          .where(eq(posts.id, postId))
          .returning();

        // Record real audit log event in database
        try {
          await db.insert(auditLogs).values({
            workspaceId: post.workspaceId,
            actorUserId: payload.sub,
            action: 'STATUS_CHANGED',
            entityType: 'post',
            entityId: post.id,
            metadata: {
              oldStatus: post.status,
              newStatus: status,
            },
          });
        } catch {
          // Non-blocking for audit logging
        }

        return c.json({ post: updatedPost }, 200);
      } catch (error: any) {
        return c.json({ error: error.message || 'Failed to update status' }, 500);
      }
    }
  )

  // 11. Feedback: Get Post Comments
  .get(
    '/api/posts/:id/comments',
    zValidator(
      'query',
      z.object({
        sort: z.string().optional(),
        type: z.string().optional(),
      })
    ),
    async (c) => {
      const postId = c.req.param('id');
      const { sort = 'latest', type = 'comments' } = c.req.valid('query');

    try {
      const [post] = await db
        .select({ id: posts.id, workspaceId: posts.workspaceId })
        .from(posts)
        .where(eq(posts.id, postId));

      if (!post) {
        return c.json({ error: 'Post not found' }, 404);
      }

      const isInternalFilter = type === 'internal';

      const postComments = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          parentId: comments.parentId,
          content: comments.content,
          isInternal: comments.isInternal,
          createdAt: comments.createdAt,
          authorName: users.name,
          authorAvatar: users.avatarUrl,
          authorEmail: users.email,
          authorRole: workspaceMembers.role,
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorUserId, users.id))
        .leftJoin(
          workspaceMembers,
          and(
            eq(workspaceMembers.userId, comments.authorUserId),
            eq(workspaceMembers.workspaceId, post.workspaceId)
          )
        )
        .where(
          and(
            eq(comments.postId, postId),
            eq(comments.workspaceId, post.workspaceId),
            isNull(comments.deletedAt),
            eq(comments.isInternal, isInternalFilter),
            eq(comments.moderationStatus, 'APPROVED')
          )
        )
        .orderBy(sort === 'oldest' ? asc(comments.createdAt) : desc(comments.createdAt));

      return c.json({ comments: postComments }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch comments' }, 500);
    }
  })

  // 12. Feedback: Post a Comment or Internal Note
  .post(
    '/api/posts/:id/comments',
    zValidator(
      'json',
      z.object({
        content: z.string().min(1, 'Comment cannot be empty').max(2000),
        parentId: z.string().uuid().optional(),
        isInternal: z.boolean().optional().default(false),
      })
    ),
    async (c) => {
      const postId = c.req.param('id');
      const { content, parentId, isInternal } = c.req.valid('json');

      try {
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        if (!post) {
          return c.json({ error: 'Post not found' }, 404);
        }

        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return c.json({ error: 'Sign in to comment' }, 401);
        }

        const payload = await verifyAuthToken(authHeader.substring(7));
        if (!payload?.sub) {
          return c.json({ error: 'Sign in to comment' }, 401);
        }

        const [author] = await db
          .select({
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
            email: users.email,
            status: users.status,
          })
          .from(users)
          .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

        if (!author || author.status !== 'ACTIVE') {
          return c.json({ error: 'Your account is not active' }, 401);
        }

        // Get user role in workspace
        const [member] = await db
          .select({ role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.userId, author.id),
              eq(workspaceMembers.workspaceId, post.workspaceId)
            )
          );

        const [newComment] = await db
          .insert(comments)
          .values({
            workspaceId: post.workspaceId,
            postId: post.id,
            parentId: parentId || null,
            authorUserId: author.id,
            content,
            isInternal: !!isInternal,
            moderationStatus: 'APPROVED',
          })
          .returning();

        return c.json(
          {
            comment: {
              ...newComment,
              authorName: author.name,
              authorAvatar: author.avatarUrl,
              authorEmail: author.email,
              authorRole: member?.role || 'MEMBER',
            },
          },
          201
        );
      } catch (error: any) {
        return c.json({ error: error.message || 'Failed to post comment' }, 500);
      }
    }
  )

  // 13. Feedback: Get Post Activity Timeline
  .get('/api/posts/:id/activity', async (c) => {
    const postId = c.req.param('id');
    try {
      const [post] = await db
        .select({ id: posts.id, workspaceId: posts.workspaceId })
        .from(posts)
        .where(eq(posts.id, postId));

      if (!post) {
        return c.json({ error: 'Post not found' }, 404);
      }

      const activities = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          actorName: users.name,
          actorAvatar: users.avatarUrl,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(
          and(
            eq(auditLogs.entityId, postId),
            eq(auditLogs.workspaceId, post.workspaceId)
          )
        )
        .orderBy(desc(auditLogs.createdAt));

      return c.json({ activities }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch activity' }, 500);
    }
  });

app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path,
    documentation: 'Try / or /api/health',
  }, 404);
});

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 FeedbackPulse API running on http://localhost:${info.port}`);
});

export default app;
export type AppType = typeof routes;
