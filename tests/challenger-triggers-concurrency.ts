import './helpers/setup.js';
import assert from 'node:assert/strict';
import { createTestDatabase, seedUser, seedWorkspace, schema, tokenForUser } from './helpers/db-fixture.js';
import { createApiClient } from './helpers/api-client.js';
import { eq } from 'drizzle-orm';

async function runAdversarialChallenges() {
  console.log('--- STARTING ADVERSARIAL CHALLENGES ---');
  const fixture = await createTestDatabase();
  const client = createApiClient(fixture.app);

  try {
    // Setup base workspace & board
    const owner = await seedUser(fixture.db, {
      name: 'Owner User',
      email: `owner_${Date.now()}@example.com`,
    });
    const ws = await seedWorkspace(fixture.db, {
      name: 'Stress Workspace',
      slug: `stress-${Date.now()}`,
      ownerId: owner.user.id,
    });

    // Create a target post
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: ws.workspace.id,
        boardId: ws.board.id,
        title: 'Target Concurrency Post',
        content: 'Testing concurrency on the same post.',
      },
      owner.token
    );
    assert.equal(postRes.status, 201, 'Post creation must succeed');
    const postId = postRes.data.post.id;

    // =========================================================================
    // Challenge 1: Multi-user concurrent upvoting on the EXACT SAME POST
    // =========================================================================
    console.log('[Challenge 1] 10 distinct users upvoting the exact same post concurrently...');
    const userCount = 10;
    const users: { user: any; token: string }[] = [];

    for (let i = 0; i < userCount; i++) {
      const u = await seedUser(fixture.db, {
        name: `Voter ${i}`,
        email: `voter_${i}_${Date.now()}@example.com`,
      });
      // Add member to workspace
      await fixture.db.insert(schema.workspaceMembers).values({
        workspaceId: ws.workspace.id,
        userId: u.user.id,
        role: 'MEMBER',
      });
      users.push(u);
    }

    // Fire 10 concurrent votes
    const voteResponses = await Promise.all(
      users.map((u) => client.post(`/api/posts/${postId}/vote`, {}, u.token))
    );

    const statuses = voteResponses.map((r) => r.status);
    console.log(`Vote responses status distribution:`, statuses);

    // Verify DB vote_count
    const [dbPostAfterVotes] = await fixture.db
      .select({ voteCount: schema.posts.voteCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));

    const votesInDb = await fixture.db
      .select()
      .from(schema.postVotes)
      .where(eq(schema.postVotes.postId, postId));

    console.log(`DB post.vote_count: ${dbPostAfterVotes.voteCount}, Actual post_votes rows: ${votesInDb.length}`);
    assert.equal(
      dbPostAfterVotes.voteCount,
      votesInDb.length,
      `Trigger inconsistency: posts.vote_count (${dbPostAfterVotes.voteCount}) != post_votes rows (${votesInDb.length})`
    );

    // =========================================================================
    // Challenge 2: Rapid concurrent toggle votes by the SAME user on the same post
    // =========================================================================
    console.log('[Challenge 2] Rapid concurrent toggle votes by the SAME user...');
    const singleUser = users[0];
    const toggleAttempts = 5;
    const togglePromises = [];
    for (let i = 0; i < toggleAttempts; i++) {
      togglePromises.push(client.post(`/api/posts/${postId}/vote`, {}, singleUser.token));
    }
    const toggleResults = await Promise.all(togglePromises);
    const toggleStatuses = toggleResults.map((r) => r.status);
    console.log(`Toggle statuses:`, toggleStatuses);

    // Verify DB consistency after race
    const [dbPostAfterToggles] = await fixture.db
      .select({ voteCount: schema.posts.voteCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));

    const votesInDbAfterToggles = await fixture.db
      .select()
      .from(schema.postVotes)
      .where(eq(schema.postVotes.postId, postId));

    console.log(`After race: DB post.vote_count: ${dbPostAfterToggles.voteCount}, Actual post_votes rows: ${votesInDbAfterToggles.length}`);
    assert.equal(
      dbPostAfterToggles.voteCount,
      votesInDbAfterToggles.length,
      `Trigger inconsistency after race: vote_count (${dbPostAfterToggles.voteCount}) != post_votes count (${votesInDbAfterToggles.length})`
    );

    // =========================================================================
    // Challenge 3: Voting on a DELETED post (Trigger fp_guard_vote_active_post)
    // =========================================================================
    console.log('[Challenge 3] Voting on a soft-deleted post...');
    const [deletedPost] = await fixture.db
      .insert(schema.posts)
      .values({
        workspaceId: ws.workspace.id,
        boardId: ws.board.id,
        authorUserId: owner.user.id,
        title: 'Deleted Post Candidate',
        content: 'This post is marked deleted.',
        deletedAt: new Date(),
      })
      .returning();

    const voteOnDeletedRes = await client.post(`/api/posts/${deletedPost.id}/vote`, {}, users[1].token);
    console.log(`Vote on deleted post response:`, voteOnDeletedRes.status, voteOnDeletedRes.data);
    // Should be rejected (404, 400, or 500 due to trigger exception)
    assert.notEqual(voteOnDeletedRes.status, 200, 'Voting on a deleted post must NOT succeed with 200');

    // =========================================================================
    // Challenge 4: Cross-tenant comment insertion (Trigger fp_guard_comment_workspace)
    // =========================================================================
    console.log('[Challenge 4] Cross-tenant comment insertion via database trigger...');
    const ws2 = await seedWorkspace(fixture.db, {
      name: 'Tenant 2',
      slug: `tenant-2-${Date.now()}`,
      ownerId: owner.user.id,
    });

    let triggerFired = false;
    try {
      // Direct insert with mismatched workspace_id
      await fixture.db.insert(schema.comments).values({
        workspaceId: ws2.workspace.id, // Mismatch!
        postId: postId,                 // Post belongs to ws.workspace.id
        authorUserId: owner.user.id,
        content: 'Illegal cross-tenant comment',
      });
    } catch (err: any) {
      triggerFired = true;
      console.log(`Trigger successfully prevented cross-tenant comment:`, err.message);
    }
    assert.equal(triggerFired, true, 'fp_guard_comment_workspace trigger MUST reject mismatched workspace_id');

    // =========================================================================
    // Challenge 5: Cross-tenant vote insertion (Trigger fp_guard_vote_workspace)
    // =========================================================================
    console.log('[Challenge 5] Cross-tenant vote insertion via database trigger...');
    let voteTriggerFired = false;
    try {
      await fixture.db.insert(schema.postVotes).values({
        workspaceId: ws2.workspace.id, // Mismatch!
        postId: postId,
        userId: owner.user.id,
      });
    } catch (err: any) {
      voteTriggerFired = true;
      console.log(`Trigger successfully prevented cross-tenant vote:`, err.message);
    }
    assert.equal(voteTriggerFired, true, 'fp_guard_vote_workspace trigger MUST reject mismatched workspace_id');

    console.log('--- ALL ADVERSARIAL CHALLENGES COMPLETED SUCCESSFULLY ---');
  } finally {
    await fixture.cleanup();
  }
}

runAdversarialChallenges().catch((err) => {
  console.error('CHALLENGE FAILED WITH ERROR:', err);
  process.exit(1);
});
