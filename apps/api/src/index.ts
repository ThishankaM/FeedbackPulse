import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from './db/index';
import { workspaces, users, workspaceMembers } from './db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createToken, verifyAuthToken } from './lib/auth';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new Hono();

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
        if (!user) {
          return c.json({ error: 'Invalid email or password' }, 401);
        }

        // Check password if set
        if (user.passwordHash) {
          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) {
            return c.json({ error: 'Invalid email or password' }, 401);
          }
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
        ownerEmail: z.string().email(),
        ownerName: z.string().optional(),
      })
    ),
    async (c) => {
      const { name, slug, primaryColor, ownerEmail, ownerName } = c.req.valid('json');

      try {
        // Find or create owner user
        let [owner] = await db.select().from(users).where(eq(users.email, ownerEmail));
        if (!owner) {
          [owner] = await db.insert(users).values({
            email: ownerEmail,
            name: ownerName || ownerEmail.split('@')[0],
          }).returning();
        }

        // Create workspace
        const [workspace] = await db.insert(workspaces).values({
          name,
          slug,
          primaryColor,
        }).returning();

        // Assign user as OWNER
        await db.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: owner.id,
          role: 'OWNER',
        });

        return c.json({ workspace, owner }, 201);
      } catch (error: any) {
        if (error?.code === '23505') { // Postgres unique violation
          return c.json({ error: 'A workspace with this slug already exists' }, 409);
        }
        return c.json({ error: error.message || 'Failed to create workspace' }, 500);
      }
    }
  );

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
