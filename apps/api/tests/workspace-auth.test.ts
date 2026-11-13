import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import * as schema from '../src/db/schema';
import { setDatabaseForTesting } from '../src/db/runtime';

const TEST_SECRET = 'test-only-secret-never-use-in-production';
process.env.JWT_SECRET = TEST_SECRET;

const apiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsDir = path.join(apiRoot, 'src/db/migrations');
const postMigrateFile = path.join(apiRoot, 'src/db/sql/post_migrate.sql');

let pglite: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
let app: Awaited<typeof import('../src/index')>['default'];
let ownerToken: string;
let adminToken: string;
let memberToken: string;
let ownerUserId: string;
let securityPostId: string;

function tokenFor(user: { id: string; email: string }): Promise<string> {
  return sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    TEST_SECRET,
    'HS256'
  );
}

before(async () => {
  pglite = new PGlite();
  const migrationFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    for (const statement of migrationSql.split('--> statement-breakpoint')) {
      if (statement.trim()) await pglite.exec(statement);
    }
  }
  await pglite.exec(fs.readFileSync(postMigrateFile, 'utf8'));

  db = drizzle(pglite, { schema });
  setDatabaseForTesting(db);
  app = (await import('../src/index')).default;

  const [owner] = await db
    .insert(schema.users)
    .values({ email: 'owner@example.test', name: 'Owner' })
    .returning({ id: schema.users.id, email: schema.users.email });
  const [admin] = await db
    .insert(schema.users)
    .values({ email: 'admin@example.test', name: 'Admin' })
    .returning({ id: schema.users.id, email: schema.users.email });
  const [member] = await db
    .insert(schema.users)
    .values({ email: 'member@example.test', name: 'Member' })
    .returning({ id: schema.users.id, email: schema.users.email });

  ownerUserId = owner.id;
  ownerToken = await tokenFor(owner);
  adminToken = await tokenFor(admin);
  memberToken = await tokenFor(member);

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ name: 'Security Fixture', slug: 'security-fixture' })
    .returning({ id: schema.workspaces.id });
  await db.insert(schema.workspaceMembers).values([
    { workspaceId: workspace.id, userId: owner.id, role: 'OWNER' },
    { workspaceId: workspace.id, userId: admin.id, role: 'ADMIN' },
    { workspaceId: workspace.id, userId: member.id, role: 'MEMBER' },
  ]);

  const [board] = await db
    .insert(schema.boards)
    .values({ workspaceId: workspace.id, name: 'Features', slug: 'features' })
    .returning({ id: schema.boards.id });
  const [post] = await db
    .insert(schema.posts)
    .values({
      workspaceId: workspace.id,
      boardId: board.id,
      authorUserId: owner.id,
      title: 'Security fixture post',
      content: 'Verifies internal note access.',
      moderationStatus: 'APPROVED',
    })
    .returning({ id: schema.posts.id });
  securityPostId = post.id;

  await db.insert(schema.comments).values([
    {
      workspaceId: workspace.id,
      postId: post.id,
      authorUserId: member.id,
      content: 'Public comment',
      moderationStatus: 'APPROVED',
    },
    {
      workspaceId: workspace.id,
      postId: post.id,
      authorUserId: admin.id,
      content: 'Internal comment',
      isInternal: true,
      moderationStatus: 'APPROVED',
    },
  ]);
});

after(async () => {
  const { pool } = await import('../src/db/client');
  await pool.end().catch(() => undefined);
  await pglite.close();
});

test('workspace creation rejects anonymous owner impersonation', async () => {
  const response = await app.request('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Acme Software',
      slug: 'acme',
      ownerEmail: 'victim@example.com',
    }),
  });
  assert.equal(response.status, 401);
  assert.equal('token' in await response.json(), false);
});

test('workspace creation rejects invalid and forged bearer tokens', async () => {
  const forged = await sign(
    { sub: 'victim', exp: Math.floor(Date.now() / 1000) + 60 },
    'feedbackpulse-super-secret-jwt-key-2026',
    'HS256'
  );
  for (const token of ['invalid', forged]) {
    const response = await app.request('/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Acme Software', slug: 'acme' }),
    });
    assert.equal(response.status, 401);
    assert.equal('token' in await response.json(), false);
  }
});

test('authenticated workspace creation assigns the caller as owner', async () => {
  const response = await app.request('/api/workspaces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Created Workspace',
      slug: 'created-workspace',
      primaryColor: '#4F46E5',
    }),
  });
  assert.equal(response.status, 201);

  const data = await response.json();
  assert.equal(data.workspace.slug, 'created-workspace');
  assert.ok(data.defaultBoard.id);

  const memberships = await db
    .select({ role: schema.workspaceMembers.role, userId: schema.workspaceMembers.userId })
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.workspaceId, data.workspace.id));
  assert.equal(memberships.length, 1);
  assert.equal(memberships[0].userId, ownerUserId);
  assert.equal(memberships[0].role, 'OWNER');

  const [defaultBoard] = await db
    .select({ isDefault: schema.boards.isDefault })
    .from(schema.boards)
    .where(eq(schema.boards.id, data.defaultBoard.id));
  assert.equal(defaultBoard.isDefault, true);
});

test('public post and comment responses never expose internal notes or emails', async () => {
  const postResponse = await app.request(`/api/posts/${securityPostId}`);
  assert.equal(postResponse.status, 200);
  const postData = await postResponse.json();
  assert.equal(postData.post.authorEmail, undefined);
  assert.equal(postData.post.internalCount, 0);

  const commentsResponse = await app.request(`/api/posts/${securityPostId}/comments?type=comments`);
  assert.equal(commentsResponse.status, 200);
  const commentsData = await commentsResponse.json();
  assert.equal(commentsData.comments.length, 1);
  assert.equal(commentsData.comments[0].content, 'Public comment');
  assert.equal(commentsData.comments[0].authorEmail, undefined);
});

test('internal notes require a workspace admin', async () => {
  const anonymous = await app.request(`/api/posts/${securityPostId}/comments?type=internal`);
  assert.equal(anonymous.status, 401);

  const member = await app.request(`/api/posts/${securityPostId}/comments?type=internal`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  assert.equal(member.status, 403);

  const admin = await app.request(`/api/posts/${securityPostId}/comments?type=internal`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(admin.status, 200);
  const adminData = await admin.json();
  assert.equal(adminData.comments.length, 1);
  assert.equal(adminData.comments[0].content, 'Internal comment');
  assert.equal(adminData.comments[0].authorEmail, undefined);

  const memberCreate = await app.request(`/api/posts/${securityPostId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ content: 'Not allowed', isInternal: true }),
  });
  assert.equal(memberCreate.status, 403);

  const adminCreate = await app.request(`/api/posts/${securityPostId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ content: 'Admin internal note', isInternal: true }),
  });
  assert.equal(adminCreate.status, 201);
});

test('status changes require a workspace admin', async () => {
  const memberResponse = await app.request(`/api/posts/${securityPostId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ status: 'PLANNED' }),
  });
  assert.equal(memberResponse.status, 403);

  const adminResponse = await app.request(`/api/posts/${securityPostId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'PLANNED' }),
  });
  assert.equal(adminResponse.status, 200);
  const data = await adminResponse.json();
  assert.equal(data.post.status, 'PLANNED');
});

test('board creation requires a workspace admin or owner', async () => {
  const memberResponse = await app.request('/api/workspaces/security-fixture/boards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ name: 'Bug Reports', slug: 'bugs' }),
  });
  assert.equal(memberResponse.status, 403);

  const adminResponse = await app.request('/api/workspaces/security-fixture/boards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: 'Bug Reports', slug: 'bugs', description: 'Track bugs' }),
  });
  assert.equal(adminResponse.status, 201);
  const data = await adminResponse.json();
  assert.equal(data.board.name, 'Bug Reports');
  assert.equal(data.board.slug, 'bugs');

  const duplicateResponse = await app.request('/api/workspaces/security-fixture/boards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: 'Duplicate Bugs', slug: 'bugs' }),
  });
  assert.equal(duplicateResponse.status, 409);
});

test('changelog creation, update, and deletion requires a workspace admin or owner', async () => {
  // 1. Unauthenticated creation is rejected with 401
  const anonResponse = await app.request('/api/workspaces/security-fixture/changelogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'v1.0.0 Launch',
      slug: 'v1-0-0-launch',
      content: 'Major features included in this launch.',
      status: 'PUBLISHED',
    }),
  });
  assert.equal(anonResponse.status, 401);

  // 2. Regular member is rejected with 403
  const memberResponse = await app.request('/api/workspaces/security-fixture/changelogs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({
      title: 'v1.0.0 Launch',
      slug: 'v1-0-0-launch',
      content: 'Major features included in this launch.',
      status: 'PUBLISHED',
    }),
  });
  assert.equal(memberResponse.status, 403);

  // 3. Workspace admin can create a draft changelog
  const adminDraftResponse = await app.request('/api/workspaces/security-fixture/changelogs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'v1.1.0 Beta Draft',
      slug: 'v1-1-0-draft',
      content: 'Internal preview features not yet ready.',
      status: 'DRAFT',
    }),
  });
  assert.equal(adminDraftResponse.status, 201);
  const draftData = await adminDraftResponse.json();
  const draftId = draftData.changelog.id;
  assert.equal(draftData.changelog.status, 'DRAFT');

  // 4. Public changelog listing does not leak drafts to unauthenticated users
  const publicListResponse = await app.request('/api/workspaces/security-fixture/changelogs');
  assert.equal(publicListResponse.status, 200);
  const publicList = await publicListResponse.json();
  assert.ok(!publicList.changelogs.some((c: any) => c.id === draftId));

  // 5. Admin listing includes drafts
  const adminListResponse = await app.request('/api/workspaces/security-fixture/changelogs', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminListResponse.status, 200);
  const adminList = await adminListResponse.json();
  assert.ok(adminList.changelogs.some((c: any) => c.id === draftId));

  // 6. Member cannot update the changelog
  const memberPatchResponse = await app.request(`/api/workspaces/security-fixture/changelogs/${draftId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ title: 'Hacked Title' }),
  });
  assert.equal(memberPatchResponse.status, 403);

  // 7. Admin can update and publish the changelog
  const adminPatchResponse = await app.request(`/api/workspaces/security-fixture/changelogs/${draftId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'v1.1.0 Released',
      status: 'PUBLISHED',
      content: 'Updated content shipped to production.',
    }),
  });
  assert.equal(adminPatchResponse.status, 200);
  const updatedData = await adminPatchResponse.json();
  assert.equal(updatedData.changelog.title, 'v1.1.0 Released');
  assert.equal(updatedData.changelog.status, 'PUBLISHED');

  // 8. Member cannot delete the changelog
  const memberDeleteResponse = await app.request(`/api/workspaces/security-fixture/changelogs/${draftId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  assert.equal(memberDeleteResponse.status, 403);

  // 9. Admin can delete the changelog
  const adminDeleteResponse = await app.request(`/api/workspaces/security-fixture/changelogs/${draftId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminDeleteResponse.status, 200);
  const deleteData = await adminDeleteResponse.json();
  assert.equal(deleteData.success, true);
});
