import { createMiddleware } from 'hono/factory';
import { verifyAuthToken } from '../lib/auth';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface AuthContextVariables {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export const authMiddleware = createMiddleware<{ Variables: AuthContextVariables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: Missing or invalid authorization token' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyAuthToken(token);

    if (!payload || !payload.sub) {
      return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
    }

    // Verify user exists and is active
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        status: users.status,
      })
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

    if (!user || user.status !== 'ACTIVE') {
      return c.json({ error: 'Unauthorized: User not found or inactive' }, 401);
    }

    c.set('user', user);
    await next();
  }
);
