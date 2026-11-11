import '../helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createTestDatabase, type DbFixtureContext, tokenForUser } from '../helpers/db-fixture.js';
import { createApiClient } from '../helpers/api-client.js';
import { render } from '../helpers/render-helper.js';
import AuthModal from '../../apps/web/src/components/auth/AuthModal.js';

describe('Suite 01: API Health, Authentication & User Sessions (F14, F15)', () => {
  let fixture: DbFixtureContext;
  let client: ReturnType<typeof createApiClient>;

  before(async () => {
    fixture = await createTestDatabase();
    client = createApiClient(fixture.app);
  });

  after(async () => {
    await fixture.cleanup();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('F15-T1-01: API health probe endpoint returns 200 with database connected', async () => {
    const res = await client.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
    assert.equal(res.data.database, 'connected');
    assert.ok(res.data.timestamp);
    assert.ok(typeof res.data.uptime === 'number');
  });

  it('F14-T1-01: Auth modal sign in mode renders accessible inputs and buttons', () => {
    const component = React.createElement(AuthModal, {
      open: true,
      mode: 'login',
      onModeChange: () => undefined,
      onClose: () => undefined,
      onAuthenticated: () => undefined,
    });
    const result = render(component);
    assert.ok(result.html.length > 0);
    assert.ok(result.contains('type="password"'));
    assert.ok(result.contains('type="email"'));
    assert.ok(result.hasElement('button'));
    assert.ok(result.contains('Google') || result.contains('Apple'));
  });

  it('F14-T1-04: Successful user registration flow issues valid JWT token and user record', async () => {
    const email = `newuser_${Date.now()}@example.com`;
    const res = await client.post('/api/auth/register', {
      email,
      password: 'password123',
      name: 'Alice Wonder',
    });

    assert.equal(res.status, 201);
    assert.ok(res.data.token, 'Token must be issued upon registration');
    assert.equal(res.data.user.email, email);
    assert.equal(res.data.user.name, 'Alice Wonder');
    assert.ok(res.data.user.id);
  });

  it('F14-T1-05: Successful user login flow validates credentials and returns session token', async () => {
    const email = `loginuser_${Date.now()}@example.com`;
    const password = 'mypassword123';
    // Register first
    await client.post('/api/auth/register', { email, password, name: 'Login User' });

    // Now login
    const res = await client.post('/api/auth/login', { email, password });
    assert.equal(res.status, 200);
    assert.ok(res.data.token);
    assert.equal(res.data.user.email, email);
    assert.equal(res.data.user.name, 'Login User');
  });

  it('F15-T1-02: Authenticated user session /api/auth/me returns current user and memberships', async () => {
    const email = `meuser_${Date.now()}@example.com`;
    const regRes = await client.post('/api/auth/register', {
      email,
      password: 'password123',
      name: 'Me User',
    });
    const token = regRes.data.token;

    const meRes = await client.get('/api/auth/me', token);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.email, email);
    assert.equal(meRes.data.user.name, 'Me User');
    assert.ok(Array.isArray(meRes.data.memberships));
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F14-T2-01: Invalid login credentials returns 401 Unauthorized', async () => {
    const res = await client.post('/api/auth/login', {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    });
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Invalid email or password');
  });

  it('F14-T2-02: Duplicate email registration returns 409 Conflict', async () => {
    const email = `dupe_${Date.now()}@example.com`;
    await client.post('/api/auth/register', { email, password: 'password123', name: 'Original' });

    const dupeRes = await client.post('/api/auth/register', { email, password: 'password456', name: 'Dupe' });
    assert.equal(dupeRes.status, 409);
    assert.equal(dupeRes.data.error, 'User with this email already exists');
  });

  it('F14-T2-03: Password validation rejects short passwords (< 6 characters) with 400', async () => {
    const res = await client.post('/api/auth/register', {
      email: `shortpass_${Date.now()}@example.com`,
      password: '123',
      name: 'Shorty',
    });
    assert.equal(res.status, 400);
  });

  it('F14-T2-04: Invalid and forged bearer tokens are rejected with 401', async () => {
    const forgedToken = await tokenForUser({ id: 'fake', email: 'fake@example.com' }, 'forged-secret-key-1234');
    const res = await client.get('/api/auth/me', forgedToken);
    assert.equal(res.status, 401);

    const malformedRes = await client.get('/api/auth/me', 'not-a-valid-jwt');
    assert.equal(malformedRes.status, 401);
  });

  it('F14-T2-05: Unauthenticated access to /api/auth/me is rejected with 401', async () => {
    const res = await client.get('/api/auth/me');
    assert.equal(res.status, 401);
  });
});
