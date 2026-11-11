import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Briefcase, Plus } from 'lucide-react';
import { useAuth, type User } from './context/AuthContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { DashboardView } from './components/dashboard/DashboardView';
import { FeedbackBoardView } from './components/feedback/FeedbackBoardView';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { ChangelogView } from './components/changelog/ChangelogView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { NewFeedbackModal } from './components/feedback/NewFeedbackModal';
import { LandingPage } from './components/landing/LandingPage';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { client } from './lib/api';
import './components/dashboard/dashboard.css';

const AuthModal = lazy(() => import('./components/auth/AuthModal'));

interface ParsedRoute {
  view: string;
  slug: string;
  postId: string | null;
}

function parseAppRoute(pathname: string): ParsedRoute {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'b' && parts[1]) {
    const slug = parts[1];
    if (parts[2] === 'p' && parts[3]) {
      return { view: 'feedback', slug, postId: parts[3] };
    }
    if (parts[2] === 'roadmap') {
      return { view: 'roadmap', slug, postId: null };
    }
    if (parts[2] === 'changelog') {
      return { view: 'changelog', slug, postId: null };
    }
    if (parts[2] === 'analytics') {
      return { view: 'analytics', slug, postId: null };
    }
    if (parts[2] === 'settings') {
      return { view: 'settings', slug, postId: null };
    }
    return { view: 'feedback', slug, postId: null };
  }
  if (parts[0] === 'dashboard' && parts[1]) {
    return { view: 'dashboard', slug: parts[1], postId: null };
  }
  if (parts.length === 1 && !['login', 'register', 'dashboard', 'b'].includes(parts[0])) {
    return { view: 'dashboard', slug: parts[0], postId: null };
  }
  if (pathname === '/' && typeof window !== 'undefined' && !localStorage.getItem('feedbackpulse_token')) {
    return { view: 'landing', slug: '', postId: null };
  }
  return { view: 'dashboard', slug: '', postId: null };
}

function buildAppUrl(view: string, slug: string, postId?: string | null): string {
  if (!slug) return '/';
  if (view === 'feedback') {
    return postId ? `/b/${slug}/p/${postId}` : `/b/${slug}`;
  }
  if (view === 'roadmap') return `/b/${slug}/roadmap`;
  if (view === 'changelog') return `/b/${slug}/changelog`;
  return `/dashboard/${slug}`;
}

export default function App() {
  const { t } = useTranslation();
  const { user, memberships, login, refreshUser } = useAuth();

  // Navigation & View State ('landing' for marketing homepage, 'dashboard' or 'feedback' for app)
  const initialRoute = typeof window !== 'undefined'
    ? parseAppRoute(window.location.pathname)
    : { view: 'dashboard', slug: '', postId: null };

  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [deepLinkPostId, setDeepLinkPostId] = useState<string | null>(initialRoute.postId);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Active Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<{
    id?: string;
    name: string;
    slug: string;
    primaryColor?: string;
  }>({
    name: '',
    slug: '',
  });

  // Available Boards for New Feedback Modal
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);

  // Modal & Drawer States
  const [isNewFeedbackModalOpen, setIsNewFeedbackModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Workspace Creation Form State
  const [newWsName, setNewWsName] = useState('');
  const [newWsSlug, setNewWsSlug] = useState('');
  const [newWsColor, setNewWsColor] = useState('#4F46E5');
  const [newWsLogoUrl, setNewWsLogoUrl] = useState('');
  const [isSubmittingWs, setIsSubmittingWs] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // History API: popstate event listener for browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const parsed = parseAppRoute(window.location.pathname);
      if (e.state && typeof e.state.view === 'string') {
        setCurrentView(e.state.view);
      } else {
        setCurrentView(parsed.view);
      }
      setDeepLinkPostId(parsed.postId);

      if (parsed.slug && parsed.slug !== activeWorkspace.slug) {
        setActiveWorkspace((prev) => ({ ...prev, slug: parsed.slug }));
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeWorkspace.slug]);

  // View Navigation helper that syncs browser history
  const handleViewChange = (view: string) => {
    setCurrentView(view);
    if (view !== 'feedback') {
      setDeepLinkPostId(null);
    }
    if (typeof window !== 'undefined') {
      const targetUrl = activeWorkspace.slug
        ? buildAppUrl(view, activeWorkspace.slug)
        : window.location.pathname;
      window.history.pushState({ view, slug: activeWorkspace.slug }, '', targetUrl);
    }
  };

  // Sync deep-link post URL (/b/:slug/p/:postId) when opening/closing post drawer
  const handlePostIdChange = useCallback(
    (postId: string | null) => {
      setDeepLinkPostId(postId);
      if (typeof window !== 'undefined' && activeWorkspace.slug) {
        const targetUrl = buildAppUrl('feedback', activeWorkspace.slug, postId);
        if (window.location.pathname !== targetUrl) {
          window.history.pushState(
            { view: 'feedback', slug: activeWorkspace.slug, postId },
            '',
            targetUrl
          );
        }
      }
    },
    [activeWorkspace.slug]
  );

  // Workspace Switch helper that syncs browser history
  const handleSwitchWorkspace = (slug: string) => {
    setActiveWorkspace((prev) => ({ ...prev, slug }));
    setDeepLinkPostId(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: currentView, slug }, '', buildAppUrl(currentView, slug));
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  // Initial load: resolve an explicit URL or the current user’s membership
  useEffect(() => {
    async function initWorkspace() {
      const { slug: urlSlug } = parseAppRoute(window.location.pathname);

      if (urlSlug) {
        try {
          const res = await client.api.workspaces[':slug'].$get({
            param: { slug: urlSlug },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.workspace) {
              setActiveWorkspace({
                id: data.workspace.id,
                name: data.workspace.name,
                slug: data.workspace.slug,
                primaryColor: data.workspace.primaryColor || '#4F46E5',
              });
              return;
            }
          }
        } catch {
          // Fall through to memberships check
        }
      }

      // 1. If user has memberships, use first membership
      if (memberships.length > 0) {
        const first = memberships[0];
        setActiveWorkspace({
          id: first.workspaceId,
          name: first.workspaceName,
          slug: first.workspaceSlug,
          primaryColor: first.primaryColor || '#4F46E5',
        });
        window.history.replaceState(
          { view: currentView, slug: first.workspaceSlug },
          '',
          buildAppUrl(currentView, first.workspaceSlug, deepLinkPostId)
        );
        return;
      }
    }

    if (currentView !== 'landing' && !activeWorkspace.slug) {
      initWorkspace();
    }
  }, [currentView, memberships, activeWorkspace.slug, deepLinkPostId]);

  // Fetch workspace details & boards
  const loadWorkspace = useCallback(async () => {
    if (!activeWorkspace.slug) return;

    try {
      const res = await client.api.workspaces[':slug'].dashboard.$get({
        param: { slug: activeWorkspace.slug },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setActiveWorkspace({
            id: data.workspace.id,
            name: data.workspace.name,
            slug: data.workspace.slug,
            primaryColor: data.workspace.primaryColor,
          });
        }
        if (data.boards && data.boards.length > 0) {
          setBoards(data.boards.map((b: any) => ({ id: b.id, name: b.name })));
        } else {
          setBoards([]);
        }
      } else if (res.status === 404) {
        setActiveWorkspace({ name: '', slug: '' });
      }
    } catch {
      // Fallback gracefully
    }
  }, [activeWorkspace.slug]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace, refreshTrigger]);

  // Auto-generate slug when workspace name is typed
  const handleWsNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewWsName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setNewWsSlug(generated);
  };

  const handleOpenAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthenticated = async (newToken: string, newUser: User) => {
    login(newToken, newUser);
    setIsAuthModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
    await refreshUser();
    setCurrentView('dashboard');
  };

  const handleOpenWorkspaceModal = () => {
    setWsError(null);
    if (!user) {
      handleOpenAuthModal('register');
      return;
    }
    setIsWorkspaceModalOpen(true);
  };

  // Submit Workspace Creation
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWsError(null);
    const input = z.object({
      name: z.string().trim().min(2).max(255),
      slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
      primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/),
      logoUrl: z.string().url().optional(),
    }).safeParse({ name: newWsName, slug: newWsSlug, primaryColor: newWsColor, logoUrl: newWsLogoUrl.trim() || undefined });
    if (!input.success) {
      setWsError(t('workspace.validationError'));
      return;
    }
    setIsSubmittingWs(true);
    try {
      const res = await client.api.workspaces.$post({ json: input.data });

      if (res.ok) {
        const data = await res.json();
        setActiveWorkspace({
          id: data.workspace.id,
          name: data.workspace.name,
          slug: data.workspace.slug,
          primaryColor: data.workspace.primaryColor,
        });
        if (data.defaultBoard) {
          setBoards([{ id: data.defaultBoard.id, name: data.defaultBoard.name }]);
        }
        // Update URL to match user journey (/dashboard/:slug)
        window.history.pushState({ view: 'dashboard', slug: data.workspace.slug }, '', `/dashboard/${data.workspace.slug}`);
        setCurrentView('dashboard');
        setIsWorkspaceModalOpen(false);
        setNewWsName('');
        setNewWsSlug('');
        setNewWsLogoUrl('');
        setRefreshTrigger((prev) => prev + 1);
        await refreshUser();
      } else {
        const err = await res.json();
        setWsError('error' in err ? (err as any).error : t('workspace.createError'));
      }
    } catch (err: any) {
      setWsError(err?.message || t('workspace.createError'));
    } finally {
      setIsSubmittingWs(false);
    }
  };

  return (
    <>
      {currentView === 'landing' ? (
        <LandingPage
          onSignIn={() => handleOpenAuthModal('login')}
          onGetStarted={() => {
            if (user) {
              handleOpenWorkspaceModal();
            } else {
              handleOpenAuthModal('register');
            }
          }}
          onGoToDashboard={() => setCurrentView('dashboard')}
          isLoggedIn={Boolean(user)}
        />
      ) : (
        <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased font-sans transition-colors duration-200">
          {/* 1. Modern Glassmorphic Navigation Sidebar */}
          <AppSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            activeWorkspace={activeWorkspace}
            onSwitchWorkspace={handleSwitchWorkspace}
            onOpenCreateWorkspace={handleOpenWorkspaceModal}
            onOpenAuthModal={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
            mobileOpen={mobileMenuOpen}
            onMobileOpenChange={setMobileMenuOpen}
          />

          {/* 2. Main Content Canvas */}
          <div className="flex flex-col flex-1 h-screen overflow-y-auto fp-dashboard-view">
            <AppHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
              onOpenAuthModal={() => {
                setAuthMode('login');
                setIsAuthModalOpen(true);
              }}
              activeWorkspace={activeWorkspace}
              onSwitchWorkspace={handleSwitchWorkspace}
              onOpenCreateWorkspace={handleOpenWorkspaceModal}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />

            <main className="flex-1 pb-16">
              {/* If no workspace exists in the database yet, show clean initial onboarding */}
              {!activeWorkspace.slug ? (
                <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-8 max-w-md mx-auto">
                  <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-5 ring-8 ring-primary/5">
                    <Briefcase className="h-8 w-8 stroke-[2]" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {t('workspace.emptyTitle')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {t('workspace.emptyDescription')}
                  </p>
                  <Button
                    onClick={handleOpenWorkspaceModal}
                    className="mt-6 font-semibold rounded-xl px-5 py-2.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('workspace.modalTitle')}
                  </Button>
                </div>
              ) : currentView === 'dashboard' ? (
                <DashboardView
                  workspaceSlug={activeWorkspace.slug}
                  searchQuery={searchQuery}
                  onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
                  onOpenAuthModal={() => {
                    setAuthMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  refreshTrigger={refreshTrigger}
                />
              ) : currentView === 'feedback' ? (
                <FeedbackBoardView
                  workspaceSlug={activeWorkspace.slug}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
                  onOpenAuthModal={() => handleOpenAuthModal('login')}
                  initialPostId={deepLinkPostId}
                  onPostIdChange={handlePostIdChange}
                  refreshTrigger={refreshTrigger}
                />
              ) : currentView === 'roadmap' ? (
                <RoadmapView
                  workspaceSlug={activeWorkspace.slug}
                  searchQuery={searchQuery}
                  onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
                  onOpenAuthModal={() => {
                    setAuthMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  refreshTrigger={refreshTrigger}
                />
              ) : currentView === 'changelog' ? (
                <ChangelogView
                  workspaceSlug={activeWorkspace.slug}
                  searchQuery={searchQuery}
                  onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
                  onOpenAuthModal={() => {
                    setAuthMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  onViewChange={handleViewChange}
                  refreshTrigger={refreshTrigger}
                />
              ) : currentView === 'analytics' ? (
                <AnalyticsView
                  workspaceSlug={activeWorkspace.slug}
                />
              ) : currentView === 'settings' ? (
                <SettingsView
                  workspaceSlug={activeWorkspace.slug}
                  onWorkspaceUpdated={(newSlug) => {
                    setActiveWorkspace((prev) => ({ ...prev, slug: newSlug }));
                    window.history.replaceState(null, '', `/b/${newSlug}/settings`);
                    setRefreshTrigger((prev) => prev + 1);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <span className="text-xl font-bold">✨</span>
                  </div>
                  <h2 className="text-xl font-bold capitalize">{currentView}</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {t('workspace.comingSoon')}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setCurrentView('dashboard')}
                  >
                    {t('workspace.returnToDashboard')}
                  </Button>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* 3. New Feedback Modal */}
      {activeWorkspace.id && (
        <NewFeedbackModal
          open={isNewFeedbackModalOpen}
          onOpenChange={setIsNewFeedbackModalOpen}
          workspaceId={activeWorkspace.id}
          boards={boards}
          onFeedbackCreated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* 4. Workspace Creation Modal */}
      <Dialog open={isWorkspaceModalOpen} onOpenChange={setIsWorkspaceModalOpen}>
        <DialogHeader>
          <DialogTitle>{t('workspace.modalTitle')}</DialogTitle>
          <DialogDescription>{t('workspace.modalDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          {wsError && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              {wsError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t('workspace.nameLabel')}
            </label>
            <Input
              value={newWsName}
              onChange={handleWsNameChange}
              placeholder={t('workspace.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t('workspace.slugLabel')}
            </label>
            <Input
              value={newWsSlug}
              onChange={(e) => setNewWsSlug(e.target.value)}
              placeholder={t('workspace.slugPlaceholder')}
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">{t('workspace.slugHelp')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t('workspace.colorLabel')}
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {['#4F46E5', '#2563EB', '#0D9488', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewWsColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-6 w-6 rounded-full transition-all cursor-pointer ${
                      newWsColor.toLowerCase() === color.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-xs'
                        : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={newWsColor}
                  onChange={(e) => setNewWsColor(e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                  title={t('workspace.chooseColor')}
                />
                <span className="ml-2 font-mono text-xs text-muted-foreground uppercase">
                  {newWsColor}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t('workspace.logoUrlLabel')}
            </label>
            <Input
              type="url"
              value={newWsLogoUrl}
              onChange={(e) => setNewWsLogoUrl(e.target.value)}
              placeholder={t('workspace.logoUrlPlaceholder')}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsWorkspaceModalOpen(false)}
              disabled={isSubmittingWs}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmittingWs || !newWsName || !newWsSlug}>
              {isSubmittingWs ? t('workspace.submitting') : t('workspace.submitButton')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 5. Lazy-loaded Auth Modal (Sign In & Sign Up) */}
      <Suspense fallback={null}>
        {isAuthModalOpen && (
          <AuthModal
            open={isAuthModalOpen}
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthenticated={handleAuthenticated}
          />
        )}
      </Suspense>
    </>
  );
}
