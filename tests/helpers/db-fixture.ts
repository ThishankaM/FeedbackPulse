import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import * as schema from '../../apps/api/src/db/schema';
import { setDatabaseForTesting } from '../../apps/api/src/db/runtime';

export const TEST_SECRET = 'test-only-secret-never-use-in-production-feedbackpulse';
process.env.JWT_SECRET = TEST_SECRET;

const apiRoot = path.resolve(process.cwd(), 'apps/api');
const migrationsDir = path.join(apiRoot, 'src/db/migrations');
const postMigrateFile = path.join(apiRoot, 'src/db/sql/post_migrate.sql');

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export interface DbFixtureContext {
  pglite: PGlite;
  db: TestDb;
  app: any;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(): Promise<DbFixtureContext> {
  const pglite = new PGlite();

  // Apply migrations
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) {
          await pglite.exec(statement);
        }
      }
    }
  }

  // Apply idempotent post_migrate triggers and guards
  if (fs.existsSync(postMigrateFile)) {
    const postSql = fs.readFileSync(postMigrateFile, 'utf8');
    await pglite.exec(postSql);
  }

  const db = drizzle(pglite, { schema });
  setDatabaseForTesting(db);

  const appModule = await import('../../apps/api/src/index');
  const app = appModule.default;

  const cleanup = async () => {
    try {
      const { pool } = await import('../../apps/api/src/db/client.js');
      await pool.end().catch(() => undefined);
    } catch {
      // ignore
    }
    await pglite.close().catch(() => undefined);
  };

  return { pglite, db, app, cleanup };
}

export async function tokenForUser(user: { id: string; email: string }, secret = TEST_SECRET): Promise<string> {
  return sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    secret,
    'HS256'
  );
}

export async function seedUser(
  db: TestDb,
  data: { email: string; name: string; avatarUrl?: string }
) {
  const [user] = await db
    .insert(schema.users)
    .values(data)
    .returning();
  const token = await tokenForUser(user);
  return { user, token };
}

export async function seedWorkspace(
  db: TestDb,
  data: { name: string; slug: string; primaryColor?: string; ownerId: string }
) {
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: data.name,
      slug: data.slug,
      primaryColor: data.primaryColor || '#4F46E5',
    })
    .returning();

  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: data.ownerId,
    role: 'OWNER',
  });

  const [board] = await db
    .insert(schema.boards)
    .values({
      workspaceId: workspace.id,
      name: 'Feature Requests',
      slug: 'features',
      isDefault: true,
    })
    .returning();

  return { workspace, board };
}

export async function seedPost(
  db: TestDb,
  data: {
    workspaceId: string;
    boardId: string;
    authorUserId?: string;
    title: string;
    content: string;
    status?: 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
    moderationStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SPAM';
  }
) {
  const [post] = await db
    .insert(schema.posts)
    .values({
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      authorUserId: data.authorUserId,
      title: data.title,
      content: data.content,
      status: data.status || 'UNDER_REVIEW',
      moderationStatus: data.moderationStatus || 'APPROVED',
    })
    .returning();

  return post;
}

export async function seedComment(
  db: TestDb,
  data: {
    workspaceId: string;
    postId: string;
    authorUserId?: string;
    content: string;
    isInternal?: boolean;
    parentId?: string;
  }
) {
  const [comment] = await db
    .insert(schema.comments)
    .values({
      workspaceId: data.workspaceId,
      postId: data.postId,
      authorUserId: data.authorUserId,
      content: data.content,
      isInternal: data.isInternal || false,
      parentId: data.parentId,
      moderationStatus: 'APPROVED',
    })
    .returning();

  return comment;
}

export { schema };
