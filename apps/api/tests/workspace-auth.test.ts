import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign } from 'hono/jwt';

// Set before dynamically importing the app, which validates its configuration.
process.env.JWT_SECRET = 'test-only-secret-never-use-in-production';
const { default: app } = await import('../src/index');

const body = { name: 'Acme Software', slug: 'acme', ownerEmail: 'victim@example.com' };

test('workspace creation rejects anonymous owner impersonation', async () => {
  const response = await app.request('/api/workspaces', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  assert.equal(response.status, 401);
  assert.equal('token' in await response.json(), false);
});

test('workspace creation rejects invalid and forged bearer tokens', async () => {
  const forged = await sign({ sub: 'victim', exp: Math.floor(Date.now() / 1000) + 60 }, 'feedbackpulse-super-secret-jwt-key-2026', 'HS256');
  for (const token of ['invalid', forged]) {
    const response = await app.request('/api/workspaces', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 401);
    assert.equal('token' in await response.json(), false);
  }
});
