import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createTestDatabase, seedUser, seedWorkspace, type DbFixtureContext } from './helpers/db-fixture.js';
import { render } from './helpers/render-helper.js';

describe('Adversarial Challenge: PGlite Lifecycle, Concurrency & Resource Isolation', () => {

  it('Challenge 1: Sequential creation and complete cleanup of 3 PGlite instances', async () => {
    for (let i = 0; i < 3; i++) {
      const fixture = await createTestDatabase();
      const res = await fixture.pglite.query('SELECT 1 as num');
      assert.equal(res.rows[0].num, 1);

      // Seed a user
      const { user } = await seedUser(fixture.db, {
        name: `Seq User ${i}`,
        email: `seq_${i}_${Date.now()}@test.com`,
      });
      assert.ok(user.id);

      // Verify cleanup
      await fixture.cleanup();

      // Check closed state
      assert.equal(fixture.pglite.closed, true, `PGlite instance ${i} must have closed=true`);

      // Attempting to query must reject
      await assert.rejects(
        async () => {
          await fixture.pglite.query('SELECT 1');
        },
        /closed/i,
        'Querying closed PGlite instance must reject with closed error'
      );
    }
  });

  it('Challenge 2: Concurrent multi-instance PGlite isolation without data leakage', async () => {
    // Launch 3 distinct database instances concurrently
    const [fixA, fixB, fixC] = await Promise.all([
      createTestDatabase(),
      createTestDatabase(),
      createTestDatabase(),
    ]);

    try {
      const uniqueA = `tenant-a-${Date.now()}`;
      const uniqueB = `tenant-b-${Date.now()}`;
      const uniqueC = `tenant-c-${Date.now()}`;

      const userA = await seedUser(fixA.db, { name: 'User A', email: `${uniqueA}@test.com` });
      const userB = await seedUser(fixB.db, { name: 'User B', email: `${uniqueB}@test.com` });
      const userC = await seedUser(fixC.db, { name: 'User C', email: `${uniqueC}@test.com` });

      await seedWorkspace(fixA.db, { name: 'Workspace A', slug: uniqueA, ownerId: userA.user.id });
      await seedWorkspace(fixB.db, { name: 'Workspace B', slug: uniqueB, ownerId: userB.user.id });
      await seedWorkspace(fixC.db, { name: 'Workspace C', slug: uniqueC, ownerId: userC.user.id });

      // Query each DB: ensure strict isolation (A only in fixA, etc.)
      const rowsA = await fixA.pglite.query(`SELECT slug FROM workspaces WHERE slug = $1`, [uniqueA]);
      const leakInAFromB = await fixA.pglite.query(`SELECT slug FROM workspaces WHERE slug = $1`, [uniqueB]);
      const leakInAFromC = await fixA.pglite.query(`SELECT slug FROM workspaces WHERE slug = $1`, [uniqueC]);

      assert.equal(rowsA.rows.length, 1);
      assert.equal(leakInAFromB.rows.length, 0, 'fixA must not contain tenant B');
      assert.equal(leakInAFromC.rows.length, 0, 'fixA must not contain tenant C');

      const rowsB = await fixB.pglite.query(`SELECT slug FROM workspaces WHERE slug = $1`, [uniqueB]);
      assert.equal(rowsB.rows.length, 1);

      const rowsC = await fixC.pglite.query(`SELECT slug FROM workspaces WHERE slug = $1`, [uniqueC]);
      assert.equal(rowsC.rows.length, 1);
    } finally {
      // Clean up all 3 in parallel
      await Promise.all([fixA.cleanup(), fixB.cleanup(), fixC.cleanup()]);

      assert.equal(fixA.pglite.closed, true);
      assert.equal(fixB.pglite.closed, true);
      assert.equal(fixC.pglite.closed, true);
    }
  });

  it('Challenge 3: Transaction error and rollback leaves PGlite cleanly recoverable and closeable', async () => {
    const fixture = await createTestDatabase();
    try {
      // Begin transaction that fails
      await assert.rejects(async () => {
        await fixture.pglite.transaction(async (tx) => {
          await tx.query('SELECT 1');
          throw new Error('Simulated transaction panic');
        });
      }, /Simulated transaction panic/);

      // Verify connection is still responsive for subsequent queries
      const recovery = await fixture.pglite.query('SELECT 42 as recovered');
      assert.equal(recovery.rows[0].recovered, 42);
    } finally {
      await fixture.cleanup();
      assert.equal(fixture.pglite.closed, true);
    }
  });

  it('Challenge 4: DOM Mock environment does not leak global document/window when render() finishes', () => {
    const initialDoc = (globalThis as any).document;
    const initialWin = (globalThis as any).window;

    // Render a React node
    const element = React.createElement('div', { id: 'test-div', className: 'p-4' }, 'Sample Text');
    const result = render(element);

    assert.ok(result.contains('Sample Text'));
    assert.equal((globalThis as any).document, initialDoc, 'document must be restored after render()');
    assert.equal((globalThis as any).window, initialWin, 'window must be restored after render()');
  });

  it('Challenge 5: DOM render handles exception during rendering without corrupting global state', () => {
    const initialDoc = (globalThis as any).document;
    const initialWin = (globalThis as any).window;

    function FaultyComponent(): React.ReactElement {
      throw new Error('Explosive render');
    }

    assert.throws(() => {
      render(React.createElement(FaultyComponent));
    }, /Explosive render/);

    assert.equal((globalThis as any).document, initialDoc, 'document must be restored even after render throws');
    assert.equal((globalThis as any).window, initialWin, 'window must be restored even after render throws');
  });
});
