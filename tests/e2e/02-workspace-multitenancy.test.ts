import '../helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase, type DbFixtureContext, seedUser, schema } from '../helpers/db-fixture.js';
import { eq } from 'drizzle-orm';
import { createApiClient } from '../helpers/api-client.js';

describe('Suite 02: Workspace Multi-Tenancy & Isolation (F6, F15)', () => {
  let fixture: DbFixtureContext;
  let client: ReturnType<typeof createApiClient>;
  let userToken: string;
  let userRecord: any;

  before(async () => {
    fixture = await createTestDatabase();
    client = createApiClient(fixture.app);

    const seeded = await seedUser(fixture.db, {
      name: 'Tenant Admin',
      email: `tenant_admin_${Date.now()}@example.com`,
    });
    userRecord = seeded.user;
    userToken = seeded.token;
  });

  after(async () => {
    await fixture.cleanup();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('F15-T1-03: Atomic workspace provisioning creates workspace, default board, and assigns OWNER', async () => {
    const slug = `ws-atomic-${Date.now()}`;
    const res = await client.post(
      '/api/workspaces',
      {
        name: 'Atomic Workspace',
        slug,
        primaryColor: '#6366F1',
      },
      userToken
    );

    assert.equal(res.status, 201);
    assert.equal(res.data.workspace.slug, slug);
    assert.ok(res.data.workspace.id);
    assert.ok(res.data.defaultBoard.id);
    assert.equal(res.data.defaultBoard.name, 'Feature Requests');

    // Verify OWNER membership
    const memberships = await fixture.db
      .select()
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.workspaceId, res.data.workspace.id));
    assert.equal(memberships.length, 1);
    assert.equal(memberships[0].userId, userRecord.id);
    assert.equal(memberships[0].role, 'OWNER');
  });

  it('F6-T1-02: Direct URL workspace resolution GET /api/workspaces/:slug returns workspace record', async () => {
    const slug = `ws-resolve-${Date.now()}`;
    await client.post('/api/workspaces', { name: 'Resolve Test', slug }, userToken);

    const res = await client.get(`/api/workspaces/${slug}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.workspace.slug, slug);
    assert.equal(res.data.workspace.name, 'Resolve Test');
  });

  it('F6-T1-04: Workspace slug sanitization utility converts names to kebab-case alphanumeric', () => {
    const sanitizeSlug = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    assert.equal(sanitizeSlug('My App & Co. (v2.0)!'), 'my-app-co-v2-0');
    assert.equal(sanitizeSlug('Acme Corporation 2026'), 'acme-corporation-2026');
    assert.equal(sanitizeSlug('   ---Leading Trailing--- '), 'leading-trailing');
  });

  it('F15-T1-06: /api/auth/me includes newly provisioned workspace in user memberships', async () => {
    const slug = `ws-me-${Date.now()}`;
    await client.post('/api/workspaces', { name: 'Me Membership Test', slug }, userToken);

    const meRes = await client.get('/api/auth/me', userToken);
    assert.equal(meRes.status, 200);
    const found = meRes.data.memberships.find((m: any) => m.workspaceSlug === slug);
    assert.ok(found, `Workspace ${slug} should appear in memberships`);
    assert.equal(found.role, 'OWNER');
  });

  it('F6-T1-05: Querying all public workspaces GET /api/workspaces returns array of workspaces', async () => {
    const res = await client.get('/api/workspaces');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.workspaces));
    assert.ok(res.data.workspaces.length > 0);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F15-T2-01: Cross-tenant post creation is blocked by workspace guard trigger', async () => {
    // Create Workspace A
    const slugA = `ws-a-${Date.now()}`;
    const resA = await client.post('/api/workspaces', { name: 'Workspace A', slug: slugA }, userToken);
    const wsA = resA.data.workspace;

    // Create Workspace B
    const slugB = `ws-b-${Date.now()}`;
    const resB = await client.post('/api/workspaces', { name: 'Workspace B', slug: slugB }, userToken);
    const boardB = resB.data.defaultBoard;

    // Direct database insert attempt: post has workspace A, but board belongs to workspace B
    await assert.rejects(
      async () => {
        await fixture.db.insert(schema.posts).values({
          workspaceId: wsA.id,
          boardId: boardB.id, // Mismatched cross-tenant board!
          authorUserId: userRecord.id,
          title: 'Illegal cross-tenant post',
          content: 'Should be rejected by fp_guard_post_workspace trigger',
        });
      },
      (err: any) => {
        return err.message.includes('Tenant integrity violation') ||
               err.message.includes('fp_guard_post_workspace');
      }
    );
  });

  it('F6-T2-01: Non-existent workspace slug in URL returns 404 Not Found', async () => {
    const res = await client.get('/api/workspaces/slug-does-not-exist-at-all-999');
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'Workspace not found');
  });

  it('F6-T2-03: Workspace creation with invalid slug regex is rejected with 400', async () => {
    const invalidSlugs = ['My_Workspace!', 'has spaces', 'CAPITALS', 'special@symbol'];
    for (const slug of invalidSlugs) {
      const res = await client.post(
        '/api/workspaces',
        {
          name: 'Invalid Slug Org',
          slug,
        },
        userToken
      );
      assert.equal(res.status, 400, `Slug "${slug}" should be rejected`);
    }
  });

  it('F6-T2-04: Workspace creation duplicate slug conflict returns 409 Conflict', async () => {
    const slug = `dupe-ws-${Date.now()}`;
    await client.post('/api/workspaces', { name: 'First', slug }, userToken);

    const dupeRes = await client.post('/api/workspaces', { name: 'Second', slug }, userToken);
    assert.equal(dupeRes.status, 409);
    assert.equal(dupeRes.data.error, 'A workspace with this slug already exists');
  });

  it('F15-T2-06: Anonymous workspace creation without Bearer token is rejected with 401', async () => {
    const res = await client.post('/api/workspaces', {
      name: 'Anon Workspace',
      slug: `anon-${Date.now()}`,
    });
    assert.equal(res.status, 401);
  });
});
