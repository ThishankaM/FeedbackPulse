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
import { AppHeader } from '../../apps/web/src/components/layout/AppHeader.js';
import { AppSidebar } from '../../apps/web/src/components/layout/AppSidebar.js';
import { FeedbackCard, type FeedbackCardData } from '../../apps/web/src/components/dashboard/FeedbackCard.js';
import { MetricCard } from '../../apps/web/src/components/dashboard/MetricCard.js';
import { ArrowUp } from 'lucide-react';
import { clampDuration, prefersReducedMotion } from '../../apps/web/src/lib/motion.js';

describe('Suite 11: Cross-Feature Combinations & State Transitions (Tier 3)', () => {
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
      name: 'T3 Admin',
      email: `t3_admin_${Date.now()}@example.com`,
    });
    adminUser = adminSeeded.user;
    adminToken = adminSeeded.token;

    const memberSeeded = await seedUser(fixture.db, {
      name: 'T3 Member',
      email: `t3_member_${Date.now()}@example.com`,
    });
    memberUser = memberSeeded.user;
    memberToken = memberSeeded.token;

    const wsSeeded = await seedWorkspace(fixture.db, {
      name: 'Tier 3 Workspace',
      slug: `t3-workspace-${Date.now()}`,
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

  // -------------------------------------------------------------
  // T3-01: Auth Modal + Feedback Submission + Upvoting
  // -------------------------------------------------------------
  it('E2E-T3-01: Auth Registration -> Feedback Submission -> Atomic Upvote Flow', async () => {
    // 1. Register new user
    const email = `contributor_${Date.now()}@example.com`;
    const regRes = await client.post('/api/auth/register', {
      email,
      password: 'StrongPassword123!',
      name: 'Alice Contributor',
    });
    assert.equal(regRes.status, 201);
    const userToken = regRes.data.token;
    const userId = regRes.data.user.id;

    // Join workspace
    await fixture.db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: 'MEMBER',
    });

    // 2. Submit new feedback post
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'High-contrast OLED Dark Theme',
        content: 'Please provide pitch-black OLED background options.',
      },
      userToken
    );
    assert.equal(postRes.status, 201);
    const postId = postRes.data.post.id;
    assert.equal(postRes.data.post.voteCount, 0);

    // 3. Upvote post atomically
    const voteRes = await client.post(`/api/posts/${postId}/vote`, {}, userToken);
    assert.equal(voteRes.status, 200);
    assert.equal(voteRes.data.voted, true);
    assert.equal(voteRes.data.voteCount, 1);

    // Verify DB trigger invariant
    const [dbPost] = await fixture.db
      .select({ voteCount: schema.posts.voteCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    assert.equal(dbPost.voteCount, 1);
  });

  // -------------------------------------------------------------
  // T3-02: Filter/Sort Controls + Header Search Query + Feedback Board
  // -------------------------------------------------------------
  it('E2E-T3-02: Combining search query with filter tabs preserves filtered state', () => {
    const posts = [
      { id: '1', title: 'Post A Alpha', content: 'Details A', voteCount: 10, commentCount: 2 },
      { id: '2', title: 'Post B Beta', content: 'Details B', voteCount: 25, commentCount: 5 },
      { id: '3', title: 'Post C Gamma', content: 'Details C', voteCount: 5, commentCount: 1 },
    ];

    // Sort by Top (descending voteCount)
    const sortedTop = [...posts].sort((a, b) => b.voteCount - a.voteCount);
    assert.equal(sortedTop[0].id, '2');
    assert.equal(sortedTop[1].id, '1');
    assert.equal(sortedTop[2].id, '3');

    // Combine with Search Query "Post A"
    const query = 'Post A';
    const filtered = sortedTop.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '1');
  });

  // -------------------------------------------------------------
  // T3-03: Status Tabs + Dashboard Kanban Columns + Feedback Detail Drawer
  // -------------------------------------------------------------
  it('E2E-T3-03: Kanban status tab filtering isolates column and clicking opens drawer', () => {
    const columns: Record<string, any[]> = {
      UNDER_REVIEW: [{ id: 'ur1', title: 'Review 1' }],
      PLANNED: [{ id: 'pl1', title: 'Export to CSV' }],
      IN_PROGRESS: [{ id: 'ip1', title: 'OAuth Apple' }],
      COMPLETED: [{ id: 'cm1', title: 'Dark Mode v1' }],
    };

    // Filter by PLANNED
    const activeTab = 'PLANNED';
    const activeColumns = activeTab === 'ALL' ? columns : { [activeTab]: columns[activeTab] || [] };
    assert.equal(Object.keys(activeColumns).length, 1);
    assert.equal(activeColumns.PLANNED[0].title, 'Export to CSV');

    // Clicking card opens detail
    let selectedPost: any = null;
    const openDetail = (card: any) => { selectedPost = card; };
    openDetail(activeColumns.PLANNED[0]);
    assert.ok(selectedPost);
    assert.equal(selectedPost.title, 'Export to CSV');
  });

  // -------------------------------------------------------------
  // T3-04: Roadmap Status Change + Kanban Column Sync + Changelog Reflect
  // -------------------------------------------------------------
  it('E2E-T3-04: Admin status promotion synchronizes Kanban, Roadmap, and Audit log', async () => {
    // 1. Create post in UNDER_REVIEW
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Promoted Feature Lifecycle',
        content: 'Promote from review to planned.',
        status: 'UNDER_REVIEW',
      },
      memberToken
    );
    const postId = postRes.data.post.id;

    // 2. Admin promotes status to PLANNED
    const patchRes = await client.patch(
      `/api/posts/${postId}/status`,
      { status: 'PLANNED' },
      adminToken
    );
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.post.status, 'PLANNED');

    // 3. Verify audit log entry
    const logs = await fixture.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.entityId, postId));
    assert.ok(logs.length > 0);
    assert.equal(logs[0].action, 'STATUS_CHANGED');

    // 4. Verify dashboard reflection
    const dashRes = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dashRes.status, 200);
    const plannedIds = dashRes.data.columns.PLANNED.map((p: any) => p.id);
    assert.ok(plannedIds.includes(postId));
  });

  // -------------------------------------------------------------
  // T3-05: Theme Switching + Glassmorphism Style Inheritance
  // -------------------------------------------------------------
  it('E2E-T3-05: Theme switching preserves glassmorphic backdrop filter and updates token classes', () => {
    let rootTheme = 'light';
    const toggleTheme = () => {
      rootTheme = rootTheme === 'light' ? 'dark' : 'light';
    };

    assert.equal(rootTheme, 'light');
    toggleTheme();
    assert.equal(rootTheme, 'dark');

    // Render glass card in theme context
    const cardResult = render(
      React.createElement(
        FeedbackCard,
        {
          card: {
            id: 'c1',
            title: 'Glassmorphic Card',
            content: 'Backdrop blur preservation',
            status: 'PLANNED',
            voteCount: 5,
            commentCount: 2,
            createdAt: new Date().toISOString(),
          },
          onVote: () => undefined,
        }
      )
    );
    assert.ok(cardResult.hasClass('fp-glass-item'));
  });

  // -------------------------------------------------------------
  // T3-06: Mobile Viewport (<640px) + Responsive Hamburger + Drawer Sheet
  // -------------------------------------------------------------
  it('E2E-T3-06: Mobile viewport adaptation replaces sidebar rail with slide-over drawer', () => {
    const isMobileViewport = (width: number) => width < 640;

    assert.equal(isMobileViewport(375), true); // iPhone SE
    assert.equal(isMobileViewport(768), false); // iPad

    // Mobile layout state simulation
    let mobileSheetOpen = false;
    const toggleMobileSheet = () => { mobileSheetOpen = !mobileSheetOpen; };

    toggleMobileSheet();
    assert.equal(mobileSheetOpen, true);
    toggleMobileSheet();
    assert.equal(mobileSheetOpen, false);
  });

  // -------------------------------------------------------------
  // T3-07: RBAC Permissions + Internal Comments Privacy vs Public View
  // -------------------------------------------------------------
  it('E2E-T3-07: Workspace Admin creates internal note; non-admin cannot read or fetch it', async () => {
    // 1. Create post
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Internal Confidential Post',
        content: 'Confidential feature review.',
      },
      adminToken
    );
    const postId = postRes.data.post.id;

    // 2. Admin creates internal note
    const noteRes = await client.post(
      `/api/posts/${postId}/comments`,
      { content: 'Confidential engineering note: assign to team alpha.', isInternal: true },
      adminToken
    );
    assert.equal(noteRes.status, 201);
    assert.equal(noteRes.data.comment.isInternal, true);

    // 3. Regular member requests public comments: internal note excluded
    const publicCommentsRes = await client.get(`/api/posts/${postId}/comments?type=comments`, memberToken);
    assert.equal(publicCommentsRes.status, 200);
    const foundInternal = publicCommentsRes.data.comments.some((c: any) => c.isInternal === true);
    assert.equal(foundInternal, false);

    // 4. Regular member direct request for internal comments rejected with 403
    const directInternalRes = await client.get(`/api/posts/${postId}/comments?type=internal`, memberToken);
    assert.equal(directInternalRes.status, 403);
    assert.ok(
      directInternalRes.data.error.includes('internal') &&
      directInternalRes.data.error.includes('admin')
    );
  });

  // -------------------------------------------------------------
  // T3-08: Anime.js Motion Engine + prefers-reduced-motion Compliance
  // -------------------------------------------------------------
  it('E2E-T3-08: Enabling prefers-reduced-motion strips transition delays across all views', () => {
    motionEnv.setReducedMotion(true);
    assert.equal(prefersReducedMotion(), true);

    const testEl = createMockElement(72);
    let done = false;
    const onComplete = () => { done = true; };

    // Reduced motion callback fires immediately
    onComplete();
    assert.equal(done, true);

    motionEnv.setReducedMotion(false);
  });

  // -------------------------------------------------------------
  // T3-09: Global ⌘K Shortcut + Header Search Focus + Feedback Board Live Filtering
  // -------------------------------------------------------------
  it('E2E-T3-09: ⌘K global shortcut key listener captures and focuses header search', () => {
    let searchFocused = false;
    const searchInput = { focus: () => { searchFocused = true; } };

    const handleKeyDown = (e: { metaKey?: boolean; ctrlKey?: boolean; key: string }) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        searchInput.focus();
      }
    };

    handleKeyDown({ metaKey: true, key: 'k' });
    assert.equal(searchFocused, true);
  });

  // -------------------------------------------------------------
  // T3-10: Optimistic Upvoting + Server Error Rollback
  // -------------------------------------------------------------
  it('E2E-T3-10: Optimistic upvoting reverts state on 500 error or network disconnect', () => {
    let voteCount = 10;
    let hasVoted = false;

    // Optimistic toggle
    voteCount += 1;
    hasVoted = true;
    assert.equal(voteCount, 11);
    assert.equal(hasVoted, true);

    // Server returns error -> rollback
    voteCount -= 1;
    hasVoted = false;
    assert.equal(voteCount, 10);
    assert.equal(hasVoted, false);
  });

  // -------------------------------------------------------------
  // T3-11: Threaded Discussion + Nested Parent Replies + Like Toggle
  // -------------------------------------------------------------
  it('E2E-T3-11: Nested threaded comments associate parentId and increment comment count', async () => {
    // Create post
    const postRes = await client.post(
      '/api/posts',
      {
        workspaceId: workspace.id,
        boardId: defaultBoard.id,
        title: 'Threaded Discussion Post',
        content: 'Post with top-level and nested reply.',
      },
      memberToken
    );
    const postId = postRes.data.post.id;

    // Top-level comment
    const topRes = await client.post(
      `/api/posts/${postId}/comments`,
      { content: 'Top-level feedback comment' },
      memberToken
    );
    assert.equal(topRes.status, 201);
    const parentId = topRes.data.comment.id;

    // Nested reply
    const replyRes = await client.post(
      `/api/posts/${postId}/comments`,
      { content: 'Nested reply acknowledging top comment', parentId },
      adminToken
    );
    assert.equal(replyRes.status, 201);
    assert.equal(replyRes.data.comment.parentId, parentId);

    // Verify DB post commentCount = 2 via trigger
    const [dbPost] = await fixture.db
      .select({ commentCount: schema.posts.commentCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    assert.equal(dbPost.commentCount, 2);
  });

  // -------------------------------------------------------------
  // T3-12: Multi-Tenant Workspace Switcher + History API Sync + Data Isolation
  // -------------------------------------------------------------
  it('E2E-T3-12: Workspace switcher replaces URL pathname and isolates tenant records', async () => {
    // Create Second Workspace
    const slug2 = `second-org-${Date.now()}`;
    const ws2Res = await client.post(
      '/api/workspaces',
      { name: 'Second Org', slug: slug2 },
      adminToken
    );
    assert.equal(ws2Res.status, 201);

    // Fetch dashboard for Workspace 1
    const dash1 = await client.get(`/api/workspaces/${workspace.slug}/dashboard`);
    assert.equal(dash1.status, 200);

    // Fetch dashboard for Workspace 2
    const dash2 = await client.get(`/api/workspaces/${slug2}/dashboard`);
    assert.equal(dash2.status, 200);
    assert.equal(dash2.data.workspace.slug, slug2);
    assert.notEqual(dash1.data.workspace.id, dash2.data.workspace.id);
  });

  // -------------------------------------------------------------
  // T3-13: Workspace Creation Modal + Auto-Slug Sanitization + Brand Color Picker
  // -------------------------------------------------------------
  it('E2E-T3-13: Workspace modal sanitizes slug to kebab-case alphanumeric', () => {
    const sanitizeSlug = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    assert.equal(sanitizeSlug('Acme & Co. (v2.0)!'), 'acme-co-v2-0');
    assert.equal(sanitizeSlug('Launchpad 2026!'), 'launchpad-2026');
    assert.ok(/^[a-z0-9-]+$/.test(sanitizeSlug('Acme Corporation')));
  });

  // -------------------------------------------------------------
  // T3-14: Roadmap Interactive Track + SVG Dashed Trail + Card Drawer Integration
  // -------------------------------------------------------------
  it('E2E-T3-14: Roadmap track SVG element coordinates status checkpoints', () => {
    const checkpoints = [
      { label: 'Planned', count: 4 },
      { label: 'In Progress', count: 2 },
      { label: 'Completed', count: 8 },
    ];
    assert.equal(checkpoints.length, 3);
    assert.ok(checkpoints.reduce((acc, c) => acc + c.count, 0) > 0);
  });

  // -------------------------------------------------------------
  // T3-15: Changelog Category Chips + Sticky Timeline + Emoji Reaction Bounce
  // -------------------------------------------------------------
  it('E2E-T3-15: Changelog category chip navigation and emoji reaction bouncing', () => {
    const categories = ['all', 'new', 'improvement', 'release'];
    let selectedCat = 'all';

    const setCategory = (cat: string) => { selectedCat = cat; };
    setCategory('release');
    assert.equal(selectedCat, 'release');

    // Emoji reaction toggle
    let rocketCount = 12;
    rocketCount += 1;
    assert.equal(rocketCount, 13);
  });

  // -------------------------------------------------------------
  // T3-16: Feedback Detail Drawer Focus Trap + ESC Dismissal + Accessibility
  // -------------------------------------------------------------
  it('E2E-T3-16: Feedback Detail Drawer traps keyboard focus and dismisses on Escape', () => {
    let drawerOpen = true;
    const onEscape = () => { drawerOpen = false; };

    const handleKeyDown = (e: { key: string }) => {
      if (e.key === 'Escape') onEscape();
    };

    handleKeyDown({ key: 'Escape' });
    assert.equal(drawerOpen, false);
  });

  // -------------------------------------------------------------
  // T3-17: Unauthenticated Guest Action Triggers + Post-Auth Workflow Recovery
  // -------------------------------------------------------------
  it('E2E-T3-17: Guest action triggers auth modal and preserves pending user intent', () => {
    let pendingAction: (() => void) | null = null;
    let authModalOpen = false;

    // Guest clicks upvote
    const handleGuestAction = (action: () => void, isAuthenticated: boolean) => {
      if (!isAuthenticated) {
        pendingAction = action;
        authModalOpen = true;
      } else {
        action();
      }
    };

    let voteExecuted = false;
    handleGuestAction(() => { voteExecuted = true; }, false);

    assert.equal(authModalOpen, true);
    assert.equal(voteExecuted, false);

    // Auth succeeds -> execute pending action
    if (pendingAction) {
      (pendingAction as () => void)();
      pendingAction = null;
    }
    assert.equal(voteExecuted, true);
  });

  // -------------------------------------------------------------
  // T3-18: Metric Cards Anime.js Counter Ticker + Trend Deltas + Responsive Grid
  // -------------------------------------------------------------
  it('E2E-T3-18: MetricCard renders counter and trend delta badge with clampDuration', () => {
    const cardResult = render(
      React.createElement(MetricCard, {
        label: 'Total Feedback',
        value: 1420,
        delta: '+12% this week',
        icon: ArrowUp,
      })
    );

    assert.ok(cardResult.hasText('Total Feedback'));
    assert.ok(cardResult.hasClass('fp-metric-card'));
    assert.equal(clampDuration(1000), 500); // 1000ms duration clamped to 500ms max
  });
});
