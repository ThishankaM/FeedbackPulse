import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Plus } from 'lucide-react';
import { useAuth, type User } from './context/AuthContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewFeedbackModal } from './components/feedback/NewFeedbackModal';
import { LandingPage } from './components/landing/LandingPage';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { client } from './lib/api';

const AuthModal = lazy(() => import('./components/auth/AuthModal'));

export default function App() {
  const { t } = useTranslation();
  const { user, memberships, login, refreshUser } = useAuth();

  // Navigation & View State ('landing' for marketing homepage, 'dashboard' for app)
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/' && !localStorage.getItem('feedbackpulse_token')) {
        return 'landing';
      }
    }
    return 'dashboard';
  });
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

  // Modal States
  const [isNewFeedbackModalOpen, setIsNewFeedbackModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Workspace Creation Form State
  const [newWsName, setNewWsName] = useState('');
  const [newWsSlug, setNewWsSlug] = useState('');
  const [newWsColor, setNewWsColor] = useState('#4F46E5');
  const [newWsLogoUrl, setNewWsLogoUrl] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSubmittingWs, setIsSubmittingWs] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Initial load: discover any available workspaces in the database or parse from URL path
  useEffect(() => {
    async function initWorkspace() {
      // 0. Check if URL contains /dashboard/:slug or /:slug
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      let urlSlug = '';
      if (pathParts[0] === 'dashboard' && pathParts[1]) {
        urlSlug = pathParts[1];
      } else if (pathParts.length === 1 && !['login', 'register', 'dashboard'].includes(pathParts[0])) {
        urlSlug = pathParts[0];
      }

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
        window.history.replaceState(null, '', `/dashboard/${first.workspaceSlug}`);
        return;
      }

      // 2. Otherwise query database for any existing workspace
      try {
        const res = await client.api.workspaces.$get();
        if (res.ok) {
          const data = await res.json();
          if (data.workspaces && data.workspaces.length > 0) {
            const first = data.workspaces[0];
            setActiveWorkspace({
              id: first.id,
              name: first.name,
              slug: first.slug,
              primaryColor: first.primaryColor || '#4F46E5',
            });
            window.history.replaceState(null, '', `/dashboard/${first.slug}`);
          }
        }
      } catch {
        // Fresh database without workspaces
      }
    }

    if (currentView !== 'landing' && !activeWorkspace.slug) {
      initWorkspace();
    }
  }, [currentView, memberships, activeWorkspace.slug]);

  // Pre-fill owner details when user is authenticated
  useEffect(() => {
    if (user) {
      setOwnerEmail(user.email);
      if (user.name) setOwnerName(user.name);
    }
  }, [user]);

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
    setIsWorkspaceModalOpen(true);
  };

  // Submit Workspace Creation
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWs(true);
    setWsError(null);

    try {
      const res = await client.api.workspaces.$post({
        json: {
          name: newWsName,
          slug: newWsSlug,
          primaryColor: newWsColor,
          logoUrl: newWsLogoUrl.trim() || undefined,
          ownerEmail: user ? user.email : (ownerEmail || `${newWsSlug}-owner@feedbackpulse.dev`),
          ownerName: user ? (user.name || undefined) : (ownerName || undefined),
        },
      });

      if (res.ok) {
        const data = await res.json();
        // If unauthenticated creator, immediately log in with issued token
        if (data.token && data.owner) {
          login(data.token, data.owner);
        }
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
        window.history.pushState(null, '', `/dashboard/${data.workspace.slug}`);
        setCurrentView('dashboard');
        setIsWorkspaceModalOpen(false);
        setNewWsName('');
        setNewWsSlug('');
        setNewWsLogoUrl('');
        setOwnerEmail('');
        setOwnerName('');
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
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
      {/* 1. Dark Left Navigation Sidebar */}
      <AppSidebar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        activeWorkspace={activeWorkspace}
        onSwitchWorkspace={(slug) => {
          setActiveWorkspace((prev) => ({ ...prev, slug }));
          window.history.pushState(null, '', `/dashboard/${slug}`);
          setRefreshTrigger((prev) => prev + 1);
        }}
        onOpenCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenAuthModal={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex flex-col flex-1 h-screen overflow-y-auto">
        <AppHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
          onOpenAuthModal={() => {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
        />

        <main className="flex-1 pb-16">
          {/* If no workspace exists in the database yet, show clean initial onboarding */}
          {!activeWorkspace.slug ? (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-8 max-w-md mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 ring-8 ring-blue-500/5">
                <Briefcase className="h-8 w-8 stroke-[2]" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                No workspace found
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Your database is clean with zero test data. Create your first workspace to start collecting customer feedback and managing your public roadmap.
              </p>
              <Button
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm cursor-pointer"
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
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">✨</span>
              </div>
              <h2 className="text-xl font-bold capitalize">{currentView}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                This section is part of the FeedbackPulse roadmap and will be loaded dynamically.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setCurrentView('dashboard')}
              >
                Return to Dashboard
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
            <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              {wsError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('workspace.slugLabel')}
            </label>
            <Input
              value={newWsSlug}
              onChange={(e) => setNewWsSlug(e.target.value)}
              placeholder={t('workspace.slugPlaceholder')}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">{t('workspace.slugHelp')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-xs'
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
                  className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent p-0.5"
                  title="Choose custom color"
                />
                <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">
                  {newWsColor}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('workspace.logoUrlLabel')}
            </label>
            <Input
              type="url"
              value={newWsLogoUrl}
              onChange={(e) => setNewWsLogoUrl(e.target.value)}
              placeholder={t('workspace.logoUrlPlaceholder')}
            />
          </div>

          {!user && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('workspace.ownerEmailLabel')}
              </label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder={t('workspace.ownerEmailPlaceholder')}
              />
            </div>
          )}

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
