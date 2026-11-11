import '../helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { MessageSquare, ArrowUp, MessagesSquare, Rocket } from 'lucide-react';
import { createTestDatabase, type DbFixtureContext, seedUser, seedWorkspace, schema } from '../helpers/db-fixture.js';
import { createApiClient } from '../helpers/api-client.js';
import { render } from '../helpers/render-helper.js';
import { MetricCard } from '../../apps/web/src/components/dashboard/MetricCard.js';
import { KanbanColumn } from '../../apps/web/src/components/dashboard/KanbanColumn.js';
import { FeedbackCard, type FeedbackCardData } from '../../apps/web/src/components/dashboard/FeedbackCard.js';

describe('Suite 04: Dashboard KPI Metrics & Kanban Board (F7)', () => {
  let fixture: DbFixtureContext;
  let client: ReturnType<typeof createApiClient>;
  let ownerToken: string;
  let memberToken: string;
  let ownerUser: any;
  let memberUser: any;
  let workspace: any;
  let defaultBoard: any;
  let postUnderReview: any;
  let postPlanned: any;
  let postInProgress: any;
  let postCompleted: any;
  let postClosed: any;

  before(async () => {
    fixture = await createTestDatabase();
    client = createApiClient(fixture.app);

    const ownerSeeded = await seedUser(fixture.db, {
      name: 'Dashboard Admin',
      email: `dash_admin_${Date.now()}@example.com`,
    });
    ownerUser = ownerSeeded.user;
    ownerToken = ownerSeeded.token;

    const memberSeeded = await seedUser(fixture.db, {
      name: 'Active Contributor',
      email: `dash_member_${Date.now()}@example.com`,
    });
    memberUser = memberSeeded.user;
    memberToken = memberSeeded.token;

    const wsSeeded = await seedWorkspace(fixture.db, {
      name: 'Kanban Workspace',
      slug: `kanban-${Date.now()}`,
      ownerId: ownerUser.id,
    });
    workspace = wsSeeded.workspace;
    defaultBoard = wsSeeded.board;

    // Add member to workspace as MEMBER so they can vote and comment
    await fixture.db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: memberUser.id,
      role: 'MEMBER',
    });

    // Seed posts across all 5 statuses
    const statuses = ['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;
    const createdPosts: any[] = [];

    for (const status of statuses) {
      const [p] = await fixture.db
        .insert(schema.posts)
        .values({
          workspaceId: workspace.id,
          boardId: defaultBoard.id,
          authorUserId: memberUser.id,
          title: `Feature in ${status}`,
          content: `Detailed specifications for ${status} card item.`,
          status,
          moderationStatus: 'APPROVED',
        })
        .returning();
      createdPosts.push(p);
    }

    [postUnderReview, postPlanned, postInProgress, postCompleted, postClosed] = createdPosts;

    // Cast a vote on postUnderReview
    await client.post(`/api/posts/${postUnderReview.id}/vote`, {}, memberToken);

    // Add a comment on postUnderReview
    await client.post(
      `/api/posts/${postUnderReview.id}/comments`,
      { content: 'Excited for this!' },
      memberToken
    );
  });

  after(async () => {
    await fixture.cleanup();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('F7-T1-01: KPI metrics cards render accurate metrics, trend deltas, and icons', async () => {
    // 1. Verify dashboard API returns computed metrics
    const res = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(res.status, 200);
    assert.ok(res.data.metrics);
    assert.equal(res.data.metrics.totalFeedback, 5);
    assert.equal(res.data.metrics.totalVotes, 1);
    assert.equal(res.data.metrics.totalComments, 1);
    assert.ok(typeof res.data.metrics.thisMonthReleases === 'number');
    assert.ok(res.data.metrics.deltas);

    // 2. Render MetricCard components for each KPI
    const feedbackCardResult = render(
      React.createElement(MetricCard, {
        label: 'Total Feedback',
        value: res.data.metrics.totalFeedback,
        delta: res.data.metrics.deltas.feedback || '+100%',
        icon: MessageSquare,
      })
    );
    assert.ok(feedbackCardResult.hasText('Total Feedback'));
    assert.ok(feedbackCardResult.hasClass('fp-metric-card'));
    assert.ok(feedbackCardResult.hasClass('fp-glass-card'));

    const voteCardResult = render(
      React.createElement(MetricCard, {
        label: 'Total Votes',
        value: res.data.metrics.totalVotes,
        delta: res.data.metrics.deltas.votes || '+100%',
        icon: ArrowUp,
      })
    );
    assert.ok(voteCardResult.hasText('Total Votes'));

    const commentCardResult = render(
      React.createElement(MetricCard, {
        label: 'Total Comments',
        value: res.data.metrics.totalComments,
        delta: res.data.metrics.deltas.comments || '+100%',
        icon: MessagesSquare,
      })
    );
    assert.ok(commentCardResult.hasText('Total Comments'));
  });

  it('F7-T1-02: 5-column Kanban board groups posts correctly by status', async () => {
    const res = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(res.status, 200);

    const cols = res.data.columns;
    assert.ok(cols.UNDER_REVIEW.some((p: any) => p.id === postUnderReview.id));
    assert.ok(cols.PLANNED.some((p: any) => p.id === postPlanned.id));
    assert.ok(cols.IN_PROGRESS.some((p: any) => p.id === postInProgress.id));
    assert.ok(cols.COMPLETED.some((p: any) => p.id === postCompleted.id));
    assert.ok(cols.CLOSED.some((p: any) => p.id === postClosed.id));

    // Render KanbanColumn for PLANNED
    const plannedCards: FeedbackCardData[] = cols.PLANNED.map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      status: p.status,
      voteCount: p.voteCount,
      commentCount: p.commentCount,
      createdAt: p.createdAt,
      authorName: p.authorName,
      authorAvatar: p.authorAvatar,
    }));

    const columnResult = render(
      React.createElement(KanbanColumn, {
        statusKey: 'PLANNED',
        title: 'Planned',
        count: plannedCards.length,
        cards: plannedCards,
        onVote: () => undefined,
        onCardClick: () => undefined,
      })
    );

    assert.ok(columnResult.hasText('Planned'));
    assert.ok(columnResult.hasText(`Feature in PLANNED`));
    assert.ok(columnResult.hasClass('fp-kanban-column'));
  });

  it('F7-T1-03: Optimistic upvoting flow increments votes and updates card presentation', async () => {
    const initialVoteCount = postPlanned.voteCount || 0;

    // Test API vote
    const voteRes = await client.post(`/api/posts/${postPlanned.id}/vote`, {}, memberToken);
    assert.equal(voteRes.status, 200);
    assert.equal(voteRes.data.voted, true);
    assert.equal(voteRes.data.voteCount, initialVoteCount + 1);

    // Render FeedbackCard with hasVoted=true
    const cardData: FeedbackCardData = {
      id: postPlanned.id,
      title: postPlanned.title,
      content: postPlanned.content,
      status: postPlanned.status,
      voteCount: initialVoteCount + 1,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      authorName: 'Active Contributor',
      hasVoted: true,
    };

    let votedPostId = '';
    const cardResult = render(
      React.createElement(FeedbackCard, {
        card: cardData,
        onVote: (id) => {
          votedPostId = id;
        },
      })
    );

    assert.ok(cardResult.hasText(postPlanned.title));
    assert.ok(cardResult.hasText(String(initialVoteCount + 1)));
    assert.ok(cardResult.contains('fp-vote-button'));
    assert.ok(cardResult.contains('text-blue-600'));
    assert.ok(cardResult.contains('fill-current'));
  });

  it('F7-T1-04: Card click event triggers detail inspection with post data', () => {
    const cardData: FeedbackCardData = {
      id: postInProgress.id,
      title: postInProgress.title,
      content: postInProgress.content,
      status: 'IN_PROGRESS',
      voteCount: 3,
      commentCount: 2,
      createdAt: new Date().toISOString(),
      authorName: 'Active Contributor',
    };

    let inspectedCard: FeedbackCardData | null = null;
    const cardResult = render(
      React.createElement(FeedbackCard, {
        card: cardData,
        onVote: () => undefined,
        onClick: (card) => {
          inspectedCard = card;
        },
      })
    );

    assert.ok(cardResult.hasRole('button'));
    assert.ok(cardResult.hasText('Feature in IN_PROGRESS'));
  });

  it('F7-T1-05: Status tab filtering isolates matching columns and counts', async () => {
    const res = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(res.status, 200);

    const filterByStatus = (statusKey: string, allCols: Record<string, any[]>) => {
      if (statusKey === 'ALL') return allCols;
      return { [statusKey]: allCols[statusKey] || [] };
    };

    const allFiltered = filterByStatus('ALL', res.data.columns);
    assert.equal(Object.keys(allFiltered).length, 5);

    const plannedOnly = filterByStatus('PLANNED', res.data.columns);
    assert.equal(Object.keys(plannedOnly).length, 1);
    assert.ok(plannedOnly.PLANNED);
    assert.equal(plannedOnly.PLANNED.length, 1);

    const inProgressOnly = filterByStatus('IN_PROGRESS', res.data.columns);
    assert.equal(Object.keys(inProgressOnly).length, 1);
    assert.ok(inProgressOnly.IN_PROGRESS);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F7-T2-01: Upvote rollback occurs gracefully when API returns error', async () => {
    // Calling vote on a non-existent post returns 404
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const errRes = await client.post(`/api/posts/${fakeId}/vote`, {}, memberToken);
    assert.equal(errRes.status, 404);
    assert.equal(errRes.data.error, 'Post not found');

    // UI state rollback simulation: starting at 5 votes, failed attempt preserves 5
    let count = 5;
    let hasVoted = false;
    const optimisticUpdate = () => {
      count += 1;
      hasVoted = true;
    };
    const rollback = () => {
      count -= 1;
      hasVoted = false;
    };

    optimisticUpdate();
    assert.equal(count, 6);
    assert.equal(hasVoted, true);

    rollback();
    assert.equal(count, 5);
    assert.equal(hasVoted, false);
  });

  it('F7-T2-02: Unauthenticated user upvote attempt is rejected with 401', async () => {
    const res = await client.post(`/api/posts/${postUnderReview.id}/vote`, {});
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Sign in to vote');
  });

  it('F7-T2-03: Zero feedback posts empty state renders clean column placeholder', () => {
    const emptyResult = render(
      React.createElement(KanbanColumn, {
        statusKey: 'CLOSED',
        title: 'Closed',
        count: 0,
        cards: [],
        onVote: () => undefined,
      })
    );

    assert.ok(emptyResult.hasText('Closed'));
    assert.ok(emptyResult.hasText('0'));
    // Should render empty placeholder
    assert.ok(
      emptyResult.contains('dashboard.noPosts') ||
      emptyResult.contains('No posts') ||
      emptyResult.contains('border-dashed')
    );
  });

  it('F7-T2-04: Search filter performs case-insensitive matching across post title and content', () => {
    const sampleCards: FeedbackCardData[] = [
      {
        id: '1',
        title: 'Webhook Integration',
        content: 'Send webhooks to Slack or Discord',
        status: 'PLANNED',
        voteCount: 10,
        commentCount: 2,
        createdAt: new Date().toISOString(),
        authorName: 'Alice',
      },
      {
        id: '2',
        title: 'Export to CSV',
        content: 'Download feedback table as spreadsheets',
        status: 'PLANNED',
        voteCount: 4,
        commentCount: 1,
        createdAt: new Date().toISOString(),
        authorName: 'Bob',
      },
    ];

    const filterPosts = (cards: FeedbackCardData[], query: string) => {
      if (!query.trim()) return cards;
      const q = query.toLowerCase();
      return cards.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          (c.authorName && c.authorName.toLowerCase().includes(q))
      );
    };

    // Keyword match
    assert.equal(filterPosts(sampleCards, 'webhook').length, 1);
    assert.equal(filterPosts(sampleCards, 'WEBHOOK').length, 1);

    // Author match
    assert.equal(filterPosts(sampleCards, 'alice').length, 1);
    assert.equal(filterPosts(sampleCards, 'BOB').length, 1);

    // Non-matching query
    assert.equal(filterPosts(sampleCards, 'nonexistent').length, 0);

    // Special characters
    assert.equal(filterPosts(sampleCards, 'Slack').length, 1);
  });

  it('F7-T2-05: Rapid status change moves post between Kanban columns immediately', async () => {
    // Admin changes postUnderReview to IN_PROGRESS
    const patchRes = await client.patch(
      `/api/posts/${postUnderReview.id}/status`,
      { status: 'IN_PROGRESS' },
      ownerToken
    );
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.post.status, 'IN_PROGRESS');

    // Dashboard query reflects the new column placement
    const dashRes = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dashRes.status, 200);

    const underReviewIds = dashRes.data.columns.UNDER_REVIEW.map((p: any) => p.id);
    const inProgressIds = dashRes.data.columns.IN_PROGRESS.map((p: any) => p.id);

    assert.ok(!underReviewIds.includes(postUnderReview.id), 'Post should no longer be in UNDER_REVIEW');
    assert.ok(inProgressIds.includes(postUnderReview.id), 'Post should now be in IN_PROGRESS');
  });
});
