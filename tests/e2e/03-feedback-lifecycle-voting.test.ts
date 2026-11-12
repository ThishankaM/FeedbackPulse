import '../helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase, type DbFixtureContext, seedUser, seedWorkspace, schema } from '../helpers/db-fixture.js';
import { createApiClient } from '../helpers/api-client.js';
import { eq } from 'drizzle-orm';

describe('Suite 03: Feedback Post Lifecycle, Voting & Comments (F8, F9, F10, F15)', () => {
  let fixture: DbFixtureContext;
  let client: ReturnType<typeof createApiClient>;
  let ownerToken: string;
  let memberToken: string;
  let ownerUser: any;
  let memberUser: any;
  let workspace: any;
  let defaultBoard: any;

  before(async () => {
    fixture = await createTestDatabase();
    client = createApiClient(fixture.app);

    const ownerSeeded = await seedUser(fixture.db, {
      name: 'Board Owner',
      email: `owner_${Date.now()}@example.com`,
    });
    ownerUser = ownerSeeded.user;
    ownerToken = ownerSeeded.token;

    const memberSeeded = await seedUser(fixture.db, {
      name: 'Regular Member',
      email: `member_${Date.now()}@example.com`,
    });
    memberUser = memberSeeded.user;
    memberToken = memberSeeded.token;

    const wsSeeded = await seedWorkspace(fixture.db, {
      name: 'Lifecycle Workspace',
      slug: `ws-lifecycle-${Date.now()}`,
      ownerId: ownerUser.id,
    });
    workspace = wsSeeded.workspace;
    defaultBoard = wsSeeded.board;

    // Add member to workspace as MEMBER
    await fixture.db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: memberUser.id,
      role: 'MEMBER',
    });
  });

  after(async () => {
    await fixture.cleanup();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  let testPostId: string;

  it('F10-T1-02: Valid feedback post creation initializes with 0 votes, 0 comments, and status UNDER_REVIEW', async () => {
    const res = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Dark Mode High Contrast',
        content: 'Please support ultra-dark mode contrast for OLED displays.',
      },
      memberToken
    );

    assert.equal(res.status, 201);
    assert.equal(res.data.post.title, 'Dark Mode High Contrast');
    assert.equal(res.data.post.status, 'UNDER_REVIEW');
    assert.equal(res.data.post.voteCount, 0);
    assert.equal(res.data.post.commentCount, 0);
    assert.ok(res.data.post.id);
    testPostId = res.data.post.id;
  });

  it('F15-T1-04: Atomic upvote toggle query increments posts.vote_count via database trigger', async () => {
    const voteRes = await client.post(`/api/posts/${testPostId}/vote`, {}, memberToken);
    assert.equal(voteRes.status, 200);
    assert.equal(voteRes.data.voted, true);
    assert.equal(voteRes.data.voteCount, 1);

    // Verify post record directly from DB to confirm database trigger execution
    const [dbPost] = await fixture.db
      .select({ voteCount: schema.posts.voteCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, testPostId));
    assert.equal(dbPost.voteCount, 1);
  });

  it('F15-T1-05: Second upvote call removes vote and decrements posts.vote_count via trigger', async () => {
    const unvoteRes = await client.post(`/api/posts/${testPostId}/vote`, {}, memberToken);
    assert.equal(unvoteRes.status, 200);
    assert.equal(unvoteRes.data.voted, false);
    assert.equal(unvoteRes.data.voteCount, 0);

    const [dbPost] = await fixture.db
      .select({ voteCount: schema.posts.voteCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, testPostId));
    assert.equal(dbPost.voteCount, 0);
  });

  it('F9-T1-04: Public comment submission increments post.comment_count automatically via trigger', async () => {
    const res = await client.post(
      `/api/posts/${testPostId}/comments`,
      { content: 'Strongly agree with this feature proposal!' },
      memberToken
    );

    assert.equal(res.status, 201);
    assert.equal(res.data.comment.content, 'Strongly agree with this feature proposal!');

    const [dbPost] = await fixture.db
      .select({ commentCount: schema.posts.commentCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, testPostId));
    assert.equal(dbPost.commentCount, 1);
  });

  it('F9-T1-03: Workspace Admin updates status and writes audit log entry', async () => {
    const res = await client.patch(
      `/api/posts/${testPostId}/status`,
      { status: 'PLANNED' },
      ownerToken
    );

    assert.equal(res.status, 200);
    assert.equal(res.data.post.status, 'PLANNED');

    // Confirm post status updated in DB
    const [dbPost] = await fixture.db
      .select({ status: schema.posts.status })
      .from(schema.posts)
      .where(eq(schema.posts.id, testPostId));
    assert.equal(dbPost.status, 'PLANNED');

    // Confirm audit log created
    const logs = await fixture.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.entityId, testPostId));
    assert.ok(logs.length > 0);
    assert.equal(logs[0].action, 'STATUS_CHANGED');
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F10-T2-01: Title validation rejects title shorter than 3 characters with 400', async () => {
    const res = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Hi',
        content: 'Valid content body here.',
      },
      memberToken
    );
    assert.equal(res.status, 400);
  });

  it('F15-T2-04: Duplicate user vote on same post is rejected by partial unique index', async () => {
    // Member casts vote
    await client.post(`/api/posts/${testPostId}/vote`, {}, memberToken);

    // Direct insert of duplicate vote into post_votes should violate partial unique index
    await assert.rejects(
      async () => {
        await fixture.db.insert(schema.postVotes).values({
          workspaceId: workspace.id,
          postId: testPostId,
          userId: memberUser.id,
        });
      },
      (err: any) => {
        return err.message.includes('unique constraint') ||
               err.message.includes('post_votes_post_user_unique_idx') ||
               err.message.includes('duplicate key');
      }
    );

    // Clean up vote toggle
    await client.post(`/api/posts/${testPostId}/vote`, {}, memberToken);
  });

  it('F15-T2-02: Public post and comments never expose internal notes to public callers', async () => {
    // Admin creates internal note
    await client.post(
      `/api/posts/${testPostId}/comments`,
      { content: 'Internal engineering confidential note', isInternal: true },
      ownerToken
    );

    // Public anonymous caller fetches comments
    const publicCommentsRes = await client.get(`/api/posts/${testPostId}/comments?type=comments`);
    assert.equal(publicCommentsRes.status, 200);
    for (const c of publicCommentsRes.data.comments) {
      assert.notEqual(c.isInternal, true, 'Internal comment must never be returned to public caller');
      assert.notEqual(c.content, 'Internal engineering confidential note');
    }

    // Public anonymous caller fetches post details
    const postDetailsRes = await client.get(`/api/posts/${testPostId}`);
    assert.equal(postDetailsRes.status, 200);
    assert.equal(postDetailsRes.data.post.internalCount, 0);
  });

  it('F15-T2-03: Member role cannot update status (403 Forbidden)', async () => {
    const res = await client.patch(
      `/api/posts/${testPostId}/status`,
      { status: 'COMPLETED' },
      memberToken
    );
    assert.equal(res.status, 403);
    assert.equal(res.data.error, 'Only workspace admins can update status');
  });

  it('F15-T2-05: Soft-deleting a comment decrements post comment count automatically via trigger', async () => {
    // Create new comment
    const commentRes = await client.post(
      `/api/posts/${testPostId}/comments`,
      { content: 'Comment to be soft deleted' },
      memberToken
    );
    const commentId = commentRes.data.comment.id;

    // Check count
    const [beforePost] = await fixture.db
      .select({ commentCount: schema.posts.commentCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, testPostId));
    const initialCount = beforePost.commentCount;

    // Soft delete the comment (set deleted_at = now())
    await fixture.db
      .update(schema.comments)
      .set({ deletedAt: new Date() })
      .where(eq(schema.comments.id, commentId));

    // Confirm trigger decremented post commentCount
    const [afterPost] = await fixture.db
      .select({ commentCount: schema.posts.commentCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, testPostId));
    assert.equal(afterPost.commentCount, initialCount - 1);
  });

  it('S2-API-01: Public board endpoints return workspace, boards, filtered/sorted posts, and enforce min 10 char content', async () => {
    const publicInfoRes = await client.get(`/api/b/${workspace.slug}`);
    assert.equal(publicInfoRes.status, 200);
    assert.equal(publicInfoRes.data.workspace.slug, workspace.slug);
    assert.ok(Array.isArray(publicInfoRes.data.boards) && publicInfoRes.data.boards.length >= 1);

    // Reject content < 10 chars on board-scoped create endpoint
    const shortRes = await client.post(
      `/api/boards/${defaultBoard.id}/posts`,
      { title: 'Valid Title', content: 'Too short' },
      memberToken
    );
    assert.equal(shortRes.status, 400);

    // Valid creation on board-scoped create endpoint
    const createRes = await client.post(
      `/api/boards/${defaultBoard.id}/posts`,
      {
        title: 'Board Scoped Markdown Request',
        content: 'Detailed **markdown** description with more than ten characters.',
      },
      memberToken
    );
    assert.equal(createRes.status, 201);
    const createdId = createRes.data.post.id;

    // Member votes on the newly created post
    const voteRes = await client.post(`/api/posts/${createdId}/vote`, {}, memberToken);
    assert.equal(voteRes.status, 200);
    assert.equal(voteRes.data.voted, true);

    // Authenticated board posts fetch hydrates hasVoted=true
    const authedListRes = await client.get(
      `/api/boards/${defaultBoard.id}/posts?sort=top&status=UNDER_REVIEW`,
      memberToken
    );
    assert.equal(authedListRes.status, 200);
    const createdItem = authedListRes.data.posts.find((p: any) => p.id === createdId);
    assert.ok(createdItem);
    assert.equal(createdItem.hasVoted, true);

    // Anonymous board posts fetch hydrates hasVoted=false
    const anonListRes = await client.get(`/api/boards/${defaultBoard.id}/posts?sort=recent`);
    assert.equal(anonListRes.status, 200);
    const anonItem = anonListRes.data.posts.find((p: any) => p.id === createdId);
    assert.ok(anonItem);
    assert.equal(anonItem.hasVoted, false);

    // Dashboard fetch also hydrates hasVoted=true for authenticated member
    const dashRes = await client.get(`/api/workspaces/${workspace.slug}/dashboard`, memberToken);
    assert.equal(dashRes.status, 200);
    const dashItem = dashRes.data.columns.UNDER_REVIEW.find((p: any) => p.id === createdId);
    assert.ok(dashItem);
    assert.equal(dashItem.hasVoted, true);
  });

  it('RBAC-02: Members cannot create posts with manager statuses and non-members cannot comment', async () => {
    // Member trying to create a post with COMPLETED status on board-scoped endpoint -> 403
    const boardStatusRes = await client.post(
      `/api/boards/${defaultBoard.id}/posts`,
      {
        title: 'Status Escalation Attempt',
        content: 'Attempting to mark my own submission completed directly.',
        status: 'COMPLETED',
      },
      memberToken
    );
    assert.equal(boardStatusRes.status, 403);

    // Member trying to create a post with PLANNED status on /api/posts -> 403
    const postStatusRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Status Escalation Attempt Two',
        content: 'Attempting to mark my own submission planned directly.',
        status: 'PLANNED',
      },
      memberToken
    );
    assert.equal(postStatusRes.status, 403);

    // Owner creating a post with PLANNED status -> 201
    const ownerCreateRes = await client.post(
      `/api/boards/${defaultBoard.id}/posts`,
      {
        title: 'Owner Planned Feature',
        content: 'Owners and admins can seed a post directly as planned.',
        status: 'PLANNED',
      },
      ownerToken
    );
    assert.equal(ownerCreateRes.status, 201);
    assert.equal(ownerCreateRes.data.post.status, 'PLANNED');

    // Signed-in non-member trying to post a public comment -> 403
    const outsiderSeeded = await seedUser(fixture.db, {
      name: 'Non Member Commenter',
      email: `outsider_comment_${Date.now()}@example.com`,
    });
    const outsiderCommentRes = await client.post(
      `/api/posts/${testPostId}/comments`,
      { content: 'Comment from a user outside this workspace.' },
      outsiderSeeded.token
    );
    assert.equal(outsiderCommentRes.status, 403);
  });
});
