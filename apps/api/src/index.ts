import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb, type RuntimeDatabase } from './db/runtime.js';
import { workspaces, users, workspaceMembers, boards, posts, changelogs, postVotes, comments, auditLogs } from './db/schema.js';
import { eq, and, isNull, desc, asc, gte, lt, ilike, or } from 'drizzle-orm';
import { toggleVote } from './db/queries/feedback.js';
import { hashPassword, verifyPassword, createToken, verifyAuthToken, getJwtSecret } from './lib/auth.js';
import { authMiddleware } from './middleware/auth.js';
import * as dotenv from 'dotenv';

dotenv.config();
getJwtSecret();

const db: RuntimeDatabase = new Proxy({} as any, {
  get: (_, prop) => {
    const target = getDb() as any;
    const val = target[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  },
});
const app = new Hono();

async function getCurrentWorkspaceAccess(c: any, workspaceId: string) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, isAdmin: false, userId: null as string | null, role: null as string | null };
  }

  const payload = await verifyAuthToken(authHeader.substring(7));
  if (!payload?.sub) {
    return { authenticated: false, isAdmin: false, userId: null as string | null, role: null as string | null };
  }

  const [membership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, payload.sub),
        eq(workspaceMembers.status, 'ACTIVE'),
        eq(users.status, 'ACTIVE'),
        isNull(users.deletedAt)
      )
    );

  return {
    authenticated: true,
    isAdmin: membership?.role === 'OWNER' || membership?.role === 'ADMIN',
    userId: payload.sub,
    role: membership?.role ?? null,
  };
}

const percentDelta = (current: number, previous: number): string => {
  if (previous <= 0) {
    return current > 0 ? '+100%' : '+0%';
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta >= 0 ? '+' : ''}${delta}%`;
};

async function getUserVotedPostIds(workspaceId: string, userId?: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db
    .select({ postId: postVotes.postId })
    .from(postVotes)
    .where(and(eq(postVotes.workspaceId, workspaceId), eq(postVotes.userId, userId)));
  return new Set(rows.map((r) => r.postId));
}

async function resolveActiveMember(c: any, workspaceId: string) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Sign in to submit feedback', status: 401 as const, userId: null };
  }

  const payload = await verifyAuthToken(authHeader.substring(7));
  if (!payload?.sub) {
    return { error: 'Sign in to submit feedback', status: 401 as const, userId: null };
  }

  const [author] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

  if (!author || author.status !== 'ACTIVE') {
    return { error: 'Your account is not active', status: 401 as const, userId: null };
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
    return { error: 'You are not a member of this workspace', status: 403 as const, userId: null };
  }

  return { error: null, status: 200 as const, userId: author.id };
}

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
    authMiddleware,
    zValidator(
      'json',
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(255),
        slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
        primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Must be a valid hex color').default('#4F46E5'),
        logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
      })
    ),
    async (c) => {
      const { name, slug, primaryColor, logoUrl } = c.req.valid('json');
      const owner = c.get('user');

      try {
        // Provisioning is atomic: a failed membership or board insert must not
        // leave behind an orphaned workspace.
        const result = await db.transaction(async (tx) => {
          const [workspace] = await tx
            .insert(workspaces)
            .values({
              name,
              slug,
              primaryColor,
              logoUrl: logoUrl && logoUrl.trim().length > 0 ? logoUrl : null,
            })
            .returning();

          await tx.insert(workspaceMembers).values({
            workspaceId: workspace.id,
            userId: owner.id,
            role: 'OWNER',
          });

          const [defaultBoard] = await tx
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

          return { workspace, defaultBoard };
        });

        return c.json(result, 201);
      } catch (error: any) {
        if (error?.code === '23505') {
          return c.json({ error: 'A workspace with this slug already exists' }, 409);
        }
        return c.json({ error: 'Failed to create workspace' }, 500);
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

      // Fetch approved/published changelogs for this workspace
      const workspaceChangelogs = await db
        .select({
          id: changelogs.id,
          title: changelogs.title,
          slug: changelogs.slug,
          content: changelogs.content,
          status: changelogs.status,
          publishedAt: changelogs.publishedAt,
          createdAt: changelogs.createdAt,
          authorName: users.name,
          authorAvatar: users.avatarUrl,
        })
        .from(changelogs)
        .leftJoin(users, eq(changelogs.authorUserId, users.id))
        .where(
          and(
            eq(changelogs.workspaceId, workspace.id),
            eq(changelogs.status, 'PUBLISHED')
          )
        )
        .orderBy(desc(changelogs.publishedAt), desc(changelogs.createdAt));

      const access = await getCurrentWorkspaceAccess(c, workspace.id);
      const votedPostIds = await getUserVotedPostIds(workspace.id, access.userId);
      const postsWithVoteState = workspacePosts.map((p) => ({
        ...p,
        hasVoted: votedPostIds.has(p.id),
      }));

      // Group posts by status
      const columns = {
        UNDER_REVIEW: postsWithVoteState.filter((p) => p.status === 'UNDER_REVIEW'),
        PLANNED: postsWithVoteState.filter((p) => p.status === 'PLANNED'),
        IN_PROGRESS: postsWithVoteState.filter((p) => p.status === 'IN_PROGRESS'),
        COMPLETED: postsWithVoteState.filter((p) => p.status === 'COMPLETED'),
        CLOSED: postsWithVoteState.filter((p) => p.status === 'CLOSED'),
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
        changelogs: workspaceChangelogs,
      }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch dashboard data' }, 500);
    }
  })

  // 6b. Workspace Changelogs List
  .get('/api/workspaces/:slug/changelogs', async (c) => {
    const slug = c.req.param('slug');

    try {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
      if (!workspace) {
        return c.json({ error: 'Workspace not found' }, 404);
      }

      const access = await getCurrentWorkspaceAccess(c, workspace.id);
      const conditions = [eq(changelogs.workspaceId, workspace.id)];
      if (!access.isAdmin) {
        conditions.push(eq(changelogs.status, 'PUBLISHED'));
      }

      const items = await db
        .select({
          id: changelogs.id,
          title: changelogs.title,
          slug: changelogs.slug,
          content: changelogs.content,
          status: changelogs.status,
          publishedAt: changelogs.publishedAt,
          createdAt: changelogs.createdAt,
          authorName: users.name,
          authorAvatar: users.avatarUrl,
        })
        .from(changelogs)
        .leftJoin(users, eq(changelogs.authorUserId, users.id))
        .where(and(...conditions))
        .orderBy(desc(changelogs.publishedAt), desc(changelogs.createdAt));

      return c.json({ changelogs: items }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch changelogs' }, 500);
    }
  })

  // 6c. Public Board Workspace Info & Active Public Boards
  .get('/api/b/:workspaceSlug', async (c) => {
    const slug = c.req.param('workspaceSlug');
    try {
      const [workspace] = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          logoUrl: workspaces.logoUrl,
          primaryColor: workspaces.primaryColor,
        })
        .from(workspaces)
        .where(eq(workspaces.slug, slug));

      if (!workspace) {
        return c.json({ error: 'Workspace not found' }, 404);
      }

      const publicBoards = await db
        .select({
          id: boards.id,
          name: boards.name,
          slug: boards.slug,
          description: boards.description,
          isDefault: boards.isDefault,
        })
        .from(boards)
        .where(
          and(
            eq(boards.workspaceId, workspace.id),
            eq(boards.isPublic, true),
            isNull(boards.archivedAt)
          )
        );

      return c.json({ workspace, boards: publicBoards }, 200);
    } catch (error: any) {
      return c.json({ error: error.message || 'Failed to fetch public board' }, 500);
    }
  })

  // 6d. Board-Scoped Filtered & Sorted Posts List
  .get(
    '/api/boards/:boardId/posts',
    zValidator(
      'query',
      z.object({
        sort: z.enum(['trending', 'top', 'recent']).optional().default('trending'),
        status: z.enum(['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).optional(),
        q: z.string().optional(),
      })
    ),
    async (c) => {
      const boardId = c.req.param('boardId');
      const { sort, status, q } = c.req.valid('query');

      try {
        const [board] = await db
          .select({ id: boards.id, workspaceId: boards.workspaceId, isPublic: boards.isPublic })
          .from(boards)
          .where(and(eq(boards.id, boardId), isNull(boards.archivedAt)));

        if (!board) {
          return c.json({ error: 'Board not found' }, 404);
        }

        const access = await getCurrentWorkspaceAccess(c, board.workspaceId);
        if (!board.isPublic && !access.role) {
          return c.json({ error: 'Board not found' }, 404);
        }

        const conditions = [
          eq(posts.workspaceId, board.workspaceId),
          eq(posts.boardId, board.id),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, 'APPROVED'),
        ];
        if (status) {
          conditions.push(eq(posts.status, status));
        }
        const trimmedQ = q?.trim();
        if (trimmedQ) {
          const pattern = `%${trimmedQ}%`;
          conditions.push(or(ilike(posts.title, pattern), ilike(posts.content, pattern))!);
        }

        const rows = await db
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
          .where(and(...conditions))
          .orderBy(
            sort === 'recent' ? desc(posts.createdAt) : desc(posts.voteCount),
            desc(posts.createdAt)
          );

        const votedIds = await getUserVotedPostIds(board.workspaceId, access.userId);
        let mapped = rows.map((p) => ({
          ...p,
          hasVoted: votedIds.has(p.id),
        }));

        if (sort === 'trending') {
          mapped = mapped.sort(
            (a, b) =>
              b.voteCount + b.commentCount * 2 - (a.voteCount + a.commentCount * 2) ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        return c.json({ posts: mapped }, 200);
      } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch board posts' }, 500);
      }
    }
  )

  // 6e. Board-Scoped Create Post (Sprint 2 strict min 10 chars content validation)
  .post(
    '/api/boards/:boardId/posts',
    zValidator(
      'json',
      z.object({
        title: z.string().trim().min(3, 'Title must be at least 3 characters').max(255),
        content: z.string().trim().min(10, 'Description must be at least 10 characters'),
        status: z.enum(['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).default('UNDER_REVIEW'),
      })
    ),
    async (c) => {
      const boardId = c.req.param('boardId');
      const { title, content, status } = c.req.valid('json');

      try {
        const [targetBoard] = await db
          .select({ id: boards.id, workspaceId: boards.workspaceId })
          .from(boards)
          .where(and(eq(boards.id, boardId), isNull(boards.archivedAt)));

        if (!targetBoard) {
          return c.json({ error: 'Board not found' }, 404);
        }

        const member = await resolveActiveMember(c, targetBoard.workspaceId);
        if (member.error || !member.userId) {
          return c.json({ error: member.error || 'Unauthorized' }, member.status);
        }

        const [newPost] = await db
          .insert(posts)
          .values({
            workspaceId: targetBoard.workspaceId,
            boardId: targetBoard.id,
            title,
            content,
            status,
            authorUserId: member.userId,
            moderationStatus: 'APPROVED',
          })
          .returning();

        return c.json({ post: newPost }, 201);
      } catch (error: any) {
        return c.json({ error: error.message || 'Failed to create post' }, 500);
      }
    }
  )

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
        const member = await resolveActiveMember(c, workspaceId);
        if (member.error || !member.userId) {
          return c.json({ error: member.error || 'Unauthorized' }, member.status);
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
            authorUserId: member.userId,
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

      const access = await getCurrentWorkspaceAccess(c, post.workspaceId);

      // Internal notes are only queryable by workspace admins. Public callers
      // never cause a query against internal comment rows.
      const internalComments = access.isAdmin
        ? await db
            .select({ id: comments.id })
            .from(comments)
            .where(
              and(
                eq(comments.postId, postId),
                eq(comments.workspaceId, post.workspaceId),
                eq(comments.isInternal, true),
                isNull(comments.deletedAt)
              )
            )
        : [];

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
      if (access.authenticated && access.userId) {
        const [vote] = await db
          .select({ id: postVotes.id })
          .from(postVotes)
          .where(
            and(
              eq(postVotes.postId, postId),
              eq(postVotes.userId, access.userId)
            )
          );
        hasVoted = !!vote;
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

        const access = await getCurrentWorkspaceAccess(c, post.workspaceId);
        if (!access.authenticated) {
          return c.json({ error: 'Sign in to update status' }, 401);
        }
        if (!access.isAdmin) {
          return c.json({ error: 'Only workspace admins can update status' }, 403);
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
            actorUserId: access.userId,
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
        type: z.enum(['comments', 'internal']).optional(),
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
      if (isInternalFilter) {
        const access = await getCurrentWorkspaceAccess(c, post.workspaceId);
        if (!access.authenticated) {
          return c.json({ error: 'Sign in to view internal notes' }, 401);
        }
        if (!access.isAdmin) {
          return c.json({ error: 'Only workspace admins can view internal notes' }, 403);
        }
      }

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
            status: users.status,
          })
          .from(users)
          .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

        if (!author || author.status !== 'ACTIVE') {
          return c.json({ error: 'Your account is not active' }, 401);
        }

        if (isInternal) {
          const access = await getCurrentWorkspaceAccess(c, post.workspaceId);
          if (!access.isAdmin) {
            return c.json({ error: 'Only workspace admins can create internal notes' }, 403);
          }
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

// Importing the app for tests or RPC types must not start a server.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🚀 FeedbackPulse API running on http://localhost:${info.port}`);
  });
}

export default app;
export type AppType = typeof routes;
