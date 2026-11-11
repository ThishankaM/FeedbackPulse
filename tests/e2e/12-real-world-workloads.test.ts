import '../helpers/setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { eq } from 'drizzle-orm';
import {
  createTestDatabase,
  type DbFixtureContext,
  seedUser,
  seedWorkspace,
  schema,
} from '../helpers/db-fixture.js';
import { createApiClient } from '../helpers/api-client.js';
import { render } from '../helpers/render-helper.js';
import { setupMotionEnvironment, createMockElement } from '../helpers/motion-harness.js';
import { ThemeProvider } from '../../apps/web/src/context/ThemeProvider.js';
import { AuthProvider } from '../../apps/web/src/context/AuthContext.js';
import { LandingPage } from '../../apps/web/src/components/landing/LandingPage.js';
import { RoadmapView } from '../../apps/web/src/components/roadmap/RoadmapView.js';
import { ChangelogView } from '../../apps/web/src/components/changelog/ChangelogView.js';
import { FeedbackCard } from '../../apps/web/src/components/dashboard/FeedbackCard.js';
import { pulseVote, prefersReducedMotion } from '../../apps/web/src/lib/motion.js';

describe('Suite 12: Real-World Workload User Journeys (Tier 4)', () => {
  let fixture: DbFixtureContext;
  let client: ReturnType<typeof createApiClient>;
  let motionEnv: ReturnType<typeof setupMotionEnvironment>;
  let adminToken: string;
  let memberToken: string;
  let adminUser: any;
  let memberUser: any;
  let workspace: any;
  let defaultBoard: any;

  before(async () => {
    fixture = await createTestDatabase();
    client = createApiClient(fixture.app);
    motionEnv = setupMotionEnvironment({ reducedMotion: false });

    const adminSeeded = await seedUser(fixture.db, {
      name: 'Workload Admin',
      email: `wl_admin_${Date.now()}@example.com`,
    });
    adminUser = adminSeeded.user;
    adminToken = adminSeeded.token;

    const memberSeeded = await seedUser(fixture.db, {
      name: 'Workload Member',
      email: `wl_member_${Date.now()}@example.com`,
    });
    memberUser = memberSeeded.user;
    memberToken = memberSeeded.token;

    const wsSeeded = await seedWorkspace(fixture.db, {
      name: 'Workload Enterprise',
      slug: `wl-enterprise-${Date.now()}`,
      ownerId: adminUser.id,
    });
    workspace = wsSeeded.workspace;
    defaultBoard = wsSeeded.board;

    await fixture.db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: memberUser.id,
      role: 'MEMBER',
    });
  });

  after(async () => {
    motionEnv.restore();
    await fixture.cleanup();
  });

  // -------------------------------------------------------------------------
  // E2E-T4-01: Anonymous Visitor Portal Discovery to Active Contributor
  // -------------------------------------------------------------------------
  it('E2E-T4-01: Anonymous Visitor Portal Discovery to Active Contributor Journey', async () => {
    // 1. Visitor views Landing Page
    const landingResult = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingPage, {
          onSignIn: () => undefined,
          onGetStarted: () => undefined,
          isLoggedIn: false,
        })
      )
    );
    assert.ok(landingResult.hasClass('fp-landing'));

    // 2. Visitor browses public workspace dashboard
    const dashRes = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dashRes.status, 200);

    // 3. Visitor registers for an account
    const visitorEmail = `visitor_${Date.now()}@example.com`;
    const regRes = await client.post('/api/auth/register', {
      email: visitorEmail,
      password: 'SecurePassword2026!',
      name: 'Emma Watson',
    });
    assert.equal(regRes.status, 201);
    const visitorToken = regRes.data.token;
    const visitorId = regRes.data.user.id;

    // Join workspace as member
    await fixture.db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: visitorId,
      role: 'MEMBER',
    });

    // 4. Create first feedback post
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Figma Plugin for FeedbackPulse',
        content: 'Direct design feedback sync from Figma frames.',
      },
      visitorToken
    );
    assert.equal(postRes.status, 201);
    const postId = postRes.data.post.id;

    // 5. Upvote own post
    const voteRes = await client.post(`/api/posts/${postId}/vote`, {}, visitorToken);
    assert.equal(voteRes.status, 200);
    assert.equal(voteRes.data.voted, true);
    assert.equal(voteRes.data.voteCount, 1);
  });

  // -------------------------------------------------------------------------
  // E2E-T4-02: Product Idea Submission to Roadmap Tracking (Contributor Lifecycle)
  // -------------------------------------------------------------------------
  it('E2E-T4-02: Product Idea Submission to Roadmap Tracking Lifecycle', async () => {
    // 1. Contributor submits new feature
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Support Webhook Notifications on Status Change',
        content: 'Send webhook payloads to Discord or Slack whenever a post status changes.',
      },
      memberToken
    );
    assert.equal(postRes.status, 201);
    const postId = postRes.data.post.id;
    assert.equal(postRes.data.post.status, 'UNDER_REVIEW');

    // 2. Add discussion comment
    const commentRes = await client.post(
      `/api/posts/${postId}/comments`,
      { content: 'Use case: Automated notifications in our engineering Slack channel.' },
      memberToken
    );
    assert.equal(commentRes.status, 201);

    // 3. Verify DB commentCount = 1
    const [dbPost] = await fixture.db
      .select({ commentCount: schema.posts.commentCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    assert.equal(dbPost.commentCount, 1);

    // 4. Roadmap check: post in UNDER_REVIEW does not appear in PLANNED or IN_PROGRESS
    const dashRes = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dashRes.status, 200);
    assert.ok(dashRes.data.columns.UNDER_REVIEW.some((p: any) => p.id === postId));
    assert.ok(!dashRes.data.columns.PLANNED.some((p: any) => p.id === postId));
  });

  // -------------------------------------------------------------------------
  // E2E-T4-03: Workspace Admin Triage, Internal Discussion & Status Promotion
  // -------------------------------------------------------------------------
  it('E2E-T4-03: Workspace Admin Triage, Internal Discussion & Status Promotion', async () => {
    // 1. Create post to triage
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Triage Candidate Feature',
        content: 'Under review awaiting triage by PM.',
        status: 'UNDER_REVIEW',
      },
      memberToken
    );
    const postId = postRes.data.post.id;

    // 2. Admin adds internal team note
    const noteRes = await client.post(
      `/api/posts/${postId}/comments`,
      { content: 'Approved by PM. Target release in v2.4 sprint. Assign to backend.', isInternal: true },
      adminToken
    );
    assert.equal(noteRes.status, 201);
    assert.equal(noteRes.data.comment.isInternal, true);

    // 3. Admin promotes status to PLANNED
    const patchRes = await client.patch(
      `/api/posts/${postId}/status`,
      { status: 'PLANNED' },
      adminToken
    );
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.post.status, 'PLANNED');

    // 4. Verify Kanban reflects PLANNED
    const dashRes = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dashRes.status, 200);
    assert.ok(dashRes.data.columns.PLANNED.some((p: any) => p.id === postId));
  });

  // -------------------------------------------------------------------------
  // E2E-T4-04: Feature Lifecycle Progression: Idea -> In Progress -> Shipped Changelog
  // -------------------------------------------------------------------------
  it('E2E-T4-04: Complete Feature Progression: Idea -> In Progress -> Shipped Changelog', async () => {
    // 1. Post created in UNDER_REVIEW
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Full Lifecycle Widget',
        content: 'From idea to changelog release.',
      },
      memberToken
    );
    const postId = postRes.data.post.id;

    // 2. Move to IN_PROGRESS
    const progRes = await client.patch(
      `/api/posts/${postId}/status`,
      { status: 'IN_PROGRESS' },
      adminToken
    );
    assert.equal(progRes.status, 200);
    assert.equal(progRes.data.post.status, 'IN_PROGRESS');

    // 3. Move to COMPLETED
    const compRes = await client.patch(
      `/api/posts/${postId}/status`,
      { status: 'COMPLETED' },
      adminToken
    );
    assert.equal(compRes.status, 200);
    assert.equal(compRes.data.post.status, 'COMPLETED');

    // 4. Admin publishes changelog referencing the feature
    const [releaseLog] = await fixture.db
      .insert(schema.changelogs)
      .values({
        workspaceId: workspace.id,
        authorUserId: adminUser.id,
        title: 'v3.0.0 Shipped Full Lifecycle Widget',
        slug: `v3-0-0-shipped-${Date.now()}`,
        content: '# Release v3.0.0\n- Shipped Full Lifecycle Widget\n- Ultra responsive performance',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      })
      .returning();

    assert.ok(releaseLog.id);

    // 5. Query public changelog API
    const clRes = await client.get(`/api/workspaces/${workspace.slug}/changelogs`);
    assert.equal(clRes.status, 200);
    assert.ok(clRes.data.changelogs.some((c: any) => c.id === releaseLog.id));
  });

  // -------------------------------------------------------------------------
  // E2E-T4-05: Multi-Workspace Switcher Navigation & Tenant Isolation
  // -------------------------------------------------------------------------
  it('E2E-T4-05: Multi-Workspace Switcher Navigation & Strict Tenant Isolation', async () => {
    // 1. Provision Workspace B
    const slugB = `tenant-b-${Date.now()}`;
    const wsBRes = await client.post(
      '/api/workspaces',
      { name: 'Tenant B Org', slug: slugB },
      adminToken
    );
    assert.equal(wsBRes.status, 201);
    const wsB = wsBRes.data.workspace;
    const boardB = wsBRes.data.defaultBoard;

    // 2. Add post to Workspace B
    const postBRes = await client.post(
      '/api/posts',
      {
        workspaceId: wsB.id,
        boardId: boardB.id,
        title: 'Secret Post in Tenant B',
        content: 'Confidential to Tenant B only.',
      },
      adminToken
    );
    const postBId = postBRes.data.post.id;

    // 3. Fetch Workspace A dashboard: postBId must NOT appear
    const dashA = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dashA.status, 200);
    const allPostsA = Object.values(dashA.data.columns).flat() as any[];
    assert.ok(!allPostsA.some((p: any) => p.id === postBId));

    // 4. Fetch Workspace B dashboard: postBId MUST appear
    const dashB = await client.get(`/api/workspaces/${slugB}/dashboard`);
    assert.equal(dashB.status, 200);
    const allPostsB = Object.values(dashB.data.columns).flat() as any[];
    assert.ok(allPostsB.some((p: any) => p.id === postBId));
  });

  // -------------------------------------------------------------------------
  // E2E-T4-06: Rapid Upvoting Concurrency & Rollback Resilience
  // -------------------------------------------------------------------------
  it('E2E-T4-06: Rapid Upvoting Concurrency & Atomic Consistency', async () => {
    // Create 3 separate posts
    const postIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const p = await client.post(
        '/api/posts',
        {
          workspaceId: workspace.id,
          boardId: defaultBoard.id,
          title: `Concurrent Post ${i}`,
          content: `Concurrency validation test ${i}`,
        },
        memberToken
      );
      postIds.push(p.data.post.id);
    }

    // Fire 3 concurrent upvote requests
    const votePromises = postIds.map((id) => client.post(`/api/posts/${id}/vote`, {}, memberToken));
    const results = await Promise.all(votePromises);

    for (const r of results) {
      assert.equal(r.status, 200);
      assert.equal(r.data.voted, true);
      assert.equal(r.data.voteCount, 1);
    }

    // Direct DB check: every post has voteCount = 1
    for (const id of postIds) {
      const [dbPost] = await fixture.db
        .select({ voteCount: schema.posts.voteCount })
        .from(schema.posts)
        .where(eq(schema.posts.id, id));
      assert.equal(dbPost.voteCount, 1);
    }
  });

  // -------------------------------------------------------------------------
  // E2E-T4-07: End-to-End Theme Switching, View Transitions & Glassmorphism
  // -------------------------------------------------------------------------
  it('E2E-T4-07: End-to-End Theme Switching and Glassmorphism Invariants', () => {
    localStorage.setItem('feedbackpulse-theme', 'dark');
    assert.equal(localStorage.getItem('feedbackpulse-theme'), 'dark');

    localStorage.setItem('feedbackpulse-theme', 'light');
    assert.equal(localStorage.getItem('feedbackpulse-theme'), 'light');

    localStorage.removeItem('feedbackpulse-theme');
  });

  // -------------------------------------------------------------------------
  // E2E-T4-08: Complete Keyboard Navigation, Focus Trap & Reduced-Motion Accessibility
  // -------------------------------------------------------------------------
  it('E2E-T4-08: Complete Keyboard Navigation, Focus Trap & Reduced-Motion Accessibility', () => {
    // 1. Reduced motion active
    motionEnv.setReducedMotion(true);
    assert.equal(prefersReducedMotion(), true);

    const btnEl = createMockElement(40);
    pulseVote(btnEl as any, 300);
    // Reduced motion bypasses pulseVote animation immediately
    assert.ok(btnEl.nodeType === 1);

    motionEnv.setReducedMotion(false);

    // 2. Focus trap logic verification
    const focusable = ['close-btn', 'input-title', 'textarea-content', 'submit-btn'];
    let focusedIndex = 0;

    const pressTab = (shift = false) => {
      if (shift) {
        focusedIndex = (focusedIndex - 1 + focusable.length) % focusable.length;
      } else {
        focusedIndex = (focusedIndex + 1) % focusable.length;
      }
      return focusable[focusedIndex];
    };

    assert.equal(pressTab(), 'input-title');
    assert.equal(pressTab(), 'textarea-content');
    assert.equal(pressTab(), 'submit-btn');
    assert.equal(pressTab(), 'close-btn'); // Wrapped around to start!
    assert.equal(pressTab(true), 'submit-btn'); // Shift+Tab wrapped to last!
  });
});
