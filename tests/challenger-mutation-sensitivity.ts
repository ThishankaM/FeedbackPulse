import './helpers/setup.js';
import assert from 'node:assert/strict';
import React from 'react';
import { createTestDatabase, seedUser, seedWorkspace, schema } from './helpers/db-fixture.js';
import { createApiClient } from './helpers/api-client.js';
import { render } from './helpers/render-helper.js';
import { Button } from '../apps/web/src/components/ui/button.js';
import { loadAndParseStylesheets } from './helpers/token-parser.js';

async function testMutationSensitivity() {
  console.log('--- RUNNING EMPIRICAL MUTATION SENSITIVITY SUITE ---');
  const fixture = await createTestDatabase();
  const client = createApiClient(fixture.app);

  let passedSensitivities = 0;
  let tautologiesFound = 0;

  try {
    // 1. Check API authentication sensitivity:
    // If invalid password is sent, does it return 400? If we mutate expectation to 200, does assert fail?
    const badPassRes = await client.post('/api/auth/register', {
      email: 'test_mut@example.com',
      password: 'short',
      name: 'Tester',
    });
    assert.equal(badPassRes.status, 400);
    // Mutated assertion MUST throw:
    assert.throws(
      () => assert.equal(badPassRes.status, 200),
      /Expected values to be strictly equal/,
      'Mutation sensitivity passed: badPassRes assertion is sensitive'
    );
    passedSensitivities++;
    console.log('[Sensitivity 1 PASS] Auth registration password check is empirically sensitive.');

    // 2. Check UI component render helper sensitivity:
    const btn = render(React.createElement(Button, { variant: 'default' }, 'Click me'));
    assert.ok(btn.hasClass('bg-primary'));
    // Mutated assertion: non-existent class MUST fail
    assert.throws(
      () => assert.ok(btn.hasClass('bg-totally-nonexistent-class')),
      /evaluated to a falsy value|ERR_ASSERTION/
    );
    passedSensitivities++;
    console.log('[Sensitivity 2 PASS] UI component render class check is empirically sensitive.');

    // 3. Check DB trigger sensitivity:
    const owner = await seedUser(fixture.db, { email: `owner_mut_${Date.now()}@example.com`, name: 'Owner' });
    const ws = await seedWorkspace(fixture.db, { name: 'Mut WS', slug: `mut-ws-${Date.now()}`, ownerId: owner.user.id });
    const p = await client.post('/api/posts', {
      workspaceId: ws.workspace.id,
      boardId: ws.board.id,
      title: 'Mut Post',
      content: 'Content',
    }, owner.token);
    const postId = p.data.post.id;

    // Upvote
    const voteRes = await client.post(`/api/posts/${postId}/vote`, {}, owner.token);
    assert.equal(voteRes.data.voteCount, 1);
    // Mutated assertion: expecting 0 or 2 MUST throw
    assert.throws(
      () => assert.equal(voteRes.data.voteCount, 999),
      /Expected values to be strictly equal/
    );
    passedSensitivities++;
    console.log('[Sensitivity 3 PASS] DB vote trigger assertion is empirically sensitive.');

    // 4. Check Suite 09 Line 72 Tautology:
    // assert.ok(hasReducedMotionRule || true);
    // If hasReducedMotionRule were FALSE:
    const fakeFalseRule = false;
    // With tautology:
    assert.doesNotThrow(() => {
      assert.ok(fakeFalseRule || true);
    });
    tautologiesFound++;
    console.log('[Tautology 1 CONFIRMED] Suite 09 line 72: assert.ok(hasReducedMotionRule || true) is insensitive to failure.');

    // 5. Check Suite 05 Line 242 Tautology (F11-T2-04):
    // const onSelect = () => { triggered = true; }; onSelect(); assert.equal(triggered, true);
    let triggered = false;
    const onSelect = () => { triggered = true; };
    onSelect();
    assert.equal(triggered, true);
    tautologiesFound++;
    console.log('[Tautology 2 CONFIRMED] Suite 05 line 250: onSelect() is self-invoked and tautological.');

    // 6. Check Suite 12 Line 358 Tautology (E2E-T4-07):
    localStorage.setItem('feedbackpulse-theme', 'dark');
    assert.equal(localStorage.getItem('feedbackpulse-theme'), 'dark');
    tautologiesFound++;
    console.log('[Tautology 3 CONFIRMED] Suite 12 line 358: E2E-T4-07 only asserts localStorage string, not theme/view transitions.');

    // 7. Check Suite 12 Line 370 Tautology (E2E-T4-08):
    const focusable = ['close-btn', 'input-title', 'textarea-content', 'submit-btn'];
    let focusedIndex = 0;
    const pressTab = () => { focusedIndex = (focusedIndex + 1) % focusable.length; return focusable[focusedIndex]; };
    assert.equal(pressTab(), 'input-title');
    tautologiesFound++;
    console.log('[Tautology 4 CONFIRMED] Suite 12 line 370: E2E-T4-08 only asserts modulo math on dummy array, not DOM focus trap.');

    console.log(`\nSensitivity check complete: ${passedSensitivities} real sensitive assertions verified, ${tautologiesFound} tautological patterns confirmed.`);
  } finally {
    await fixture.cleanup();
  }
}

testMutationSensitivity().catch((err) => {
  console.error('MUTATION SENSITIVITY TEST FAILED:', err);
  process.exit(1);
});
