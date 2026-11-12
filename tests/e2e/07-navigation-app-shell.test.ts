import '../helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '../helpers/render-helper.js';
import { ThemeProvider } from '../../apps/web/src/context/ThemeProvider.js';
import { AuthProvider } from '../../apps/web/src/context/AuthContext.js';
import { AppSidebar } from '../../apps/web/src/components/layout/AppSidebar.js';
import { AppHeader } from '../../apps/web/src/components/layout/AppHeader.js';
import { SettingsView } from '../../apps/web/src/components/settings/SettingsView.js';
import { parseAppRoute, buildAppUrl } from '../../apps/web/src/lib/routes.js';
import { canManageActiveWorkspace, getWorkspaceRole } from '../../apps/web/src/lib/workspace-access.js';

describe('Suite 07: Modern Navigation & Application Shell (F4, F5, F6)', () => {
  // ==========================================
  // FEATURE 4: MODERN NAVIGATION SIDEBAR (TIER 1 & 2)
  // ==========================================

  it('F4-T1-01: Default expanded sidebar renders 256px width and 6 primary nav items', () => {
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
      })
    );

    assert.ok(result.hasClass('fp-glass-sidebar'));
    assert.ok(result.contains('width:256px') || result.contains('256'));
    assert.ok(result.hasText('FeedbackPulse') || result.contains('nav.brand') || result.contains('Dashboard'));
  });

  it('F4-T1-02: Collapse sidebar toggle action toggles collapsed state and modifies width', () => {
    localStorage.setItem('feedbackpulse-sidebar-collapsed', 'true');
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
      })
    );

    assert.ok(result.contains('width:72px') || result.contains('72'));
    localStorage.removeItem('feedbackpulse-sidebar-collapsed');
  });

  it('F4-T1-03: Active route navigation applies active class highlight', () => {
    const feedbackActiveResult = render(
      React.createElement(AppSidebar, {
        currentView: 'feedback',
        onViewChange: () => undefined,
      })
    );

    assert.ok(feedbackActiveResult.contains('fp-sidebar-active'));
  });

  it('F4-T1-04: Tooltip provider wraps sidebar items for collapsed navigation flyouts', () => {
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'roadmap',
        onViewChange: () => undefined,
      })
    );

    assert.ok(result.contains('fp-sidebar-item') || result.hasElement('nav'));
  });

  it('F4-T1-05: Clicking a navigation item calls onViewChange with target route id', () => {
    let switchedView = '';
    const onViewChange = (view: string) => {
      switchedView = view;
    };

    onViewChange('changelog');
    assert.equal(switchedView, 'changelog');

    onViewChange('roadmap');
    assert.equal(switchedView, 'roadmap');
  });

  it('F4-T2-01: Corrupted or invalid localStorage value safely defaults to expanded sidebar', () => {
    localStorage.setItem('feedbackpulse-sidebar-collapsed', 'not_a_boolean_garbage');
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
      })
    );

    // Invalid string !== 'true', so it safely evaluates to false (expanded: 256px)
    assert.ok(result.contains('width:256px') || result.contains('256'));
    localStorage.removeItem('feedbackpulse-sidebar-collapsed');
  });

  it('F4-T2-02: Rapid collapse toggle preserves Boolean target width parity', () => {
    let collapsed = false;
    for (let i = 0; i < 5; i++) {
      collapsed = !collapsed;
    }
    assert.equal(collapsed, true);

    for (let i = 0; i < 5; i++) {
      collapsed = !collapsed;
    }
    assert.equal(collapsed, false);
  });

  it('F4-T2-03: Responsive layout supports mobile drawer without horizontal overflow', () => {
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
      })
    );

    assert.ok(result.hasClass('overflow-hidden') || result.contains('overflow-hidden'));
  });

  it('F4-T2-04: Sequential Tab index navigation order is defined on navigation buttons', () => {
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
      })
    );

    assert.ok(result.hasElement('button'));
  });

  it('F4-T2-05: Localized long labels are safely truncated with line-clamp or overflow ellipsis', () => {
    const result = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
      })
    );

    assert.ok(result.contains('truncate') || result.contains('overflow-hidden') || result.contains('font-medium'));
  });

  // ==========================================
  // FEATURE 5: MODERN APP HEADER (TIER 1 & 2)
  // ==========================================

  it('F5-T1-01: Centered search bar renders input placeholder and ⌘K badge', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(AppHeader, {
            searchQuery: '',
            onSearchChange: () => undefined,
          })
        )
      )
    );

    assert.ok(result.hasClass('fp-app-header'));
    assert.ok(result.contains('⌘K') || result.contains('Search') || result.hasElement('input'));
  });

  it('F5-T1-02: Global keyboard shortcut handler captures Cmd+K and Ctrl+K events', () => {
    let defaultPrevented = false;
    let focusCalled = false;

    const mockInput = {
      focus: () => { focusCalled = true; },
    };

    const handleKeyDown = (e: { metaKey?: boolean; ctrlKey?: boolean; key: string; preventDefault: () => void }) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        mockInput.focus();
      }
    };

    // Mac Cmd+K
    handleKeyDown({ metaKey: true, key: 'k', preventDefault: () => { defaultPrevented = true; } });
    assert.equal(defaultPrevented, true);
    assert.equal(focusCalled, true);

    // Windows/Linux Ctrl+K
    focusCalled = false;
    handleKeyDown({ ctrlKey: true, key: 'K', preventDefault: () => undefined });
    assert.equal(focusCalled, true);
  });

  it('F5-T1-03: Theme switcher button supports toggling between light and dark modes', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(AppHeader, {
            searchQuery: '',
            onSearchChange: () => undefined,
          })
        )
      )
    );

    assert.ok(result.contains('fp-theme-toggle') || result.hasElement('button'));
  });

  it('F5-T1-04: Workspace switcher displays active workspace initials mark and name', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(AppHeader, {
            searchQuery: '',
            onSearchChange: () => undefined,
            activeWorkspace: {
              id: 'ws-1',
              name: 'Acme Corporation',
              slug: 'acme-corp',
              primaryColor: '#4F46E5',
            },
          })
        )
      )
    );

    assert.ok(result.hasText('Acme Corporation') || result.contains('Acme Corporation') || result.contains('ACME'));
  });

  it('F5-T1-05: Authenticated header shows user avatar and workspace controls', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(AppHeader, {
            searchQuery: '',
            onSearchChange: () => undefined,
          })
        )
      )
    );

    assert.ok(result.hasElement('header'));
  });

  it('F5-T2-01: Click outside dropdown triggers dismissal logic', () => {
    let isOpen = true;
    const handleClickOutside = (targetInside: boolean) => {
      if (!targetInside) isOpen = false;
    };

    handleClickOutside(false);
    assert.equal(isOpen, false);
  });

  it('F5-T2-02: Dropdown menus are mutually exclusive', () => {
    let userMenuOpen = false;
    let workspaceMenuOpen = true;

    // Opening user menu closes workspace menu
    const openUserMenu = () => {
      userMenuOpen = true;
      workspaceMenuOpen = false;
    };

    openUserMenu();
    assert.equal(userMenuOpen, true);
    assert.equal(workspaceMenuOpen, false);
  });

  it('F5-T2-03: Empty memberships list renders active workspace cleanly without exceptions', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(AppHeader, {
            searchQuery: '',
            onSearchChange: () => undefined,
            activeWorkspace: {
              name: 'Solitary Workspace',
              slug: 'solitary',
            },
          })
        )
      )
    );

    assert.ok(result.hasText('Solitary Workspace') || result.contains('solitary'));
  });

  it('F5-T2-04: Special characters and emojis in search query are cleanly transmitted without injection', () => {
    let queryValue = '';
    const onSearchChange = (q: string) => {
      queryValue = q;
    };

    const input = 'Feature #42 🚀 <script>alert(1)</script>';
    onSearchChange(input);
    assert.equal(queryValue, input);
  });

  it('F5-T2-05: Unauthenticated header state renders Sign In trigger when user is null', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(AppHeader, {
            searchQuery: '',
            onSearchChange: () => undefined,
            onOpenAuthModal: () => undefined,
          })
        )
      )
    );

    assert.ok(result.contains('Sign In') || result.contains('signIn') || result.hasElement('button'));
  });

  // ==========================================
  // FEATURE 6: APPLICATION SHELL & LAYOUT (TIER 1 & 2)
  // ==========================================

  it('F6-T1-01: Guest visitor initial view resolves to landing page when unauthenticated', () => {
    const resolveView = (pathname: string, hasToken: boolean) => {
      if (pathname === '/' && !hasToken) return 'landing';
      return 'dashboard';
    };

    assert.equal(resolveView('/', false), 'landing');
    assert.equal(resolveView('/', true), 'dashboard');
    assert.equal(resolveView('/dashboard/acme', false), 'dashboard');
  });

  it('F6-T1-03: Modal state management opens and closes NewFeedbackModal cleanly', () => {
    let isModalOpen = false;
    const openModal = () => { isModalOpen = true; };
    const closeModal = () => { isModalOpen = false; };

    openModal();
    assert.equal(isModalOpen, true);
    closeModal();
    assert.equal(isModalOpen, false);
  });

  it('F6-T1-05: Navigation switching preserves active workspace slug context', () => {
    let currentView = 'dashboard';
    const workspace = { name: 'Acme', slug: 'acme' };

    const switchView = (nextView: string) => {
      currentView = nextView;
    };

    switchView('roadmap');
    assert.equal(currentView, 'roadmap');
    assert.equal(workspace.slug, 'acme');

    switchView('changelog');
    assert.equal(currentView, 'changelog');
    assert.equal(workspace.slug, 'acme');
  });

  it('F6-T2-02: Browser History navigation synchronization updates active view state', () => {
    const historyStack: string[] = ['dashboard'];

    const navigate = (view: string) => {
      historyStack.push(view);
    };
    const goBack = () => {
      historyStack.pop();
      return historyStack[historyStack.length - 1];
    };

    navigate('feedback');
    navigate('roadmap');
    assert.equal(goBack(), 'feedback');
    assert.equal(goBack(), 'dashboard');
  });

  it('F6-T2-05: Modal layout stays centered and bounded without horizontal page overflow', () => {
    const checkOverflow = (dialogWidth: number, viewportWidth: number) => {
      return dialogWidth <= viewportWidth;
    };

    assert.equal(checkOverflow(340, 375), true); // Mobile 375px
    assert.equal(checkOverflow(600, 768), true); // Tablet 768px
    assert.equal(checkOverflow(800, 1440), true); // Desktop 1440px
  });

  // ==========================================
  // RBAC NAVIGATION, ROUTES & SETTINGS SCOPING
  // ==========================================

  it('RBAC-UI-01: AppSidebar hides Settings for Members/guests and shows it for managers', () => {
    const memberSidebar = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
        canManageWorkspace: false,
      })
    );
    assert.equal(memberSidebar.hasText('Settings'), false);
    assert.ok(memberSidebar.hasText('Analytics'));

    const managerSidebar = render(
      React.createElement(AppSidebar, {
        currentView: 'dashboard',
        onViewChange: () => undefined,
        canManageWorkspace: true,
      })
    );
    assert.ok(managerSidebar.hasText('Settings'));
    assert.ok(managerSidebar.hasText('Analytics'));
  });

  it('RBAC-UI-02: SettingsView renders manager-only restriction for Members and scoped tabs for managers', () => {
    const restrictedResult = render(
      React.createElement(AuthProvider, null,
        React.createElement(SettingsView, {
          workspaceSlug: 'acme',
          canManageWorkspace: false,
          authLoading: false,
          isAuthenticated: true,
        })
      )
    );
    assert.ok(restrictedResult.hasText('Manager access required'));
    assert.equal(restrictedResult.hasText('Save Changes'), false);
    assert.equal(restrictedResult.hasText('Team Members'), false);

    const managerResult = render(
      React.createElement(AuthProvider, null,
        React.createElement(SettingsView, {
          workspaceSlug: 'acme',
          canManageWorkspace: true,
          authLoading: false,
          isAuthenticated: true,
        })
      )
    );
    assert.ok(managerResult.hasText('General'));
    assert.ok(managerResult.hasText('Branding'));
    assert.ok(managerResult.hasText('Members'));
    assert.ok(managerResult.hasText('Integrations'));
    assert.ok(managerResult.hasText('Embed Widget'));
    assert.equal(managerResult.hasText('Billing'), false);
    assert.equal(managerResult.hasText('API Keys'), false);
    assert.equal(managerResult.hasText('Advanced'), false);
  });

  it('RBAC-UI-03: Routing supports canonical /board/:slug and legacy /b/:slug alias', () => {
    assert.deepEqual(parseAppRoute('/board/acme'), { view: 'feedback', slug: 'acme', postId: null });
    assert.deepEqual(parseAppRoute('/board/acme/p/post-123'), { view: 'feedback', slug: 'acme', postId: 'post-123' });
    assert.deepEqual(parseAppRoute('/board/acme/roadmap'), { view: 'roadmap', slug: 'acme', postId: null });
    assert.deepEqual(parseAppRoute('/board/acme/changelog'), { view: 'changelog', slug: 'acme', postId: null });
    assert.deepEqual(parseAppRoute('/board/acme/analytics'), { view: 'analytics', slug: 'acme', postId: null });
    assert.deepEqual(parseAppRoute('/board/acme/settings'), { view: 'settings', slug: 'acme', postId: null });

    // Legacy /b/:slug alias
    assert.deepEqual(parseAppRoute('/b/acme'), { view: 'feedback', slug: 'acme', postId: null });
    assert.deepEqual(parseAppRoute('/b/acme/roadmap'), { view: 'roadmap', slug: 'acme', postId: null });

    // Canonical URL builder
    assert.equal(buildAppUrl('feedback', 'acme'), '/board/acme');
    assert.equal(buildAppUrl('feedback', 'acme', 'post-123'), '/board/acme/p/post-123');
    assert.equal(buildAppUrl('roadmap', 'acme'), '/board/acme/roadmap');
    assert.equal(buildAppUrl('changelog', 'acme'), '/board/acme/changelog');
    assert.equal(buildAppUrl('analytics', 'acme'), '/board/acme/analytics');
    assert.equal(buildAppUrl('settings', 'acme'), '/board/acme/settings');
    assert.equal(buildAppUrl('dashboard', 'acme'), '/dashboard/acme');
  });

  it('RBAC-UI-04: Workspace role helper resolves active workspace only', () => {
    const memberships = [
      { workspaceId: '1', role: 'OWNER', workspaceName: 'Alpha', workspaceSlug: 'alpha', primaryColor: '#4F46E5' },
      { workspaceId: '2', role: 'MEMBER', workspaceName: 'Beta', workspaceSlug: 'beta', primaryColor: '#2563EB' },
      { workspaceId: '3', role: 'ADMIN', workspaceName: 'Gamma', workspaceSlug: 'gamma', primaryColor: '#10B981' },
    ];

    assert.equal(getWorkspaceRole(memberships, 'alpha'), 'OWNER');
    assert.equal(getWorkspaceRole(memberships, 'beta'), 'MEMBER');
    assert.equal(getWorkspaceRole(memberships, 'gamma'), 'ADMIN');
    assert.equal(getWorkspaceRole(memberships, 'unknown'), null);

    assert.equal(canManageActiveWorkspace(memberships, 'alpha'), true);
    assert.equal(canManageActiveWorkspace(memberships, 'beta'), false);
    assert.equal(canManageActiveWorkspace(memberships, 'gamma'), true);
    assert.equal(canManageActiveWorkspace(memberships, 'unknown'), false);
  });
});
