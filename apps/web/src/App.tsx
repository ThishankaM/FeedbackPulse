import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewFeedbackModal } from './components/feedback/NewFeedbackModal';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { client } from './lib/api';

export default function App() {
  const { t } = useTranslation();
  const { user, memberships, login, refreshUser } = useAuth();

  // Navigation & View State
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Active Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<{
    id?: string;
    name: string;
    slug: string;
    primaryColor?: string;
  }>({
    name: 'Acme Corp',
    slug: 'acme',
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
  const [newWsColor] = useState('#4F46E5');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSubmittingWs, setIsSubmittingWs] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync active workspace from user's memberships when available
  useEffect(() => {
    if (memberships.length > 0) {
      const match = memberships.find((m) => m.workspaceSlug === activeWorkspace.slug);
      if (match) {
        setActiveWorkspace({
          id: match.workspaceId,
          name: match.workspaceName,
          slug: match.workspaceSlug,
          primaryColor: match.primaryColor || '#4F46E5',
        });
      } else {
        setActiveWorkspace({
          id: memberships[0].workspaceId,
          name: memberships[0].workspaceName,
          slug: memberships[0].workspaceSlug,
          primaryColor: memberships[0].primaryColor || '#4F46E5',
        });
      }
    }
  }, [memberships]);

  // Pre-fill owner details when user is authenticated
  useEffect(() => {
    if (user) {
      setOwnerEmail(user.email);
      if (user.name) setOwnerName(user.name);
    }
  }, [user]);

  // Fetch workspace details & boards
  const loadWorkspace = useCallback(async () => {
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
        setIsWorkspaceModalOpen(false);
        setNewWsName('');
        setNewWsSlug('');
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

  // Submit Authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      if (authMode === 'register') {
        const res = await client.api.auth.register.$post({
          json: {
            email: authEmail,
            password: authPassword,
            name: authName || undefined,
          },
        });

        if (res.ok) {
          const data = await res.json();
          login(data.token, data.user);
          setIsAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
          setAuthName('');
          setRefreshTrigger((prev) => prev + 1);
          await refreshUser();
        } else {
          const err = await res.json();
          setAuthError('error' in err ? (err as any).error : t('auth.registerError'));
        }
      } else {
        const res = await client.api.auth.login.$post({
          json: {
            email: authEmail,
            password: authPassword,
          },
        });

        if (res.ok) {
          const data = await res.json();
          login(data.token, data.user);
          setIsAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
          setRefreshTrigger((prev) => prev + 1);
          await refreshUser();
        } else {
          const err = await res.json();
          setAuthError('error' in err ? (err as any).error : t('auth.loginError'));
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || t('auth.loginError'));
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
      {/* 1. Dark Left Navigation Sidebar */}
      <AppSidebar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        activeWorkspace={activeWorkspace}
        onSwitchWorkspace={(slug) => {
          setActiveWorkspace((prev) => ({ ...prev, slug }));
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
          {currentView === 'dashboard' && (
            <DashboardView
              workspaceSlug={activeWorkspace.slug}
              searchQuery={searchQuery}
              onOpenNewFeedback={() => setIsNewFeedbackModalOpen(true)}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentView !== 'dashboard' && (
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

      {/* 5. Auth Modal (Sign In & Sign Up) */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogHeader>
          <DialogTitle>
            {authMode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </DialogTitle>
          <DialogDescription>
            {authMode === 'login' ? t('auth.loginDesc') : t('auth.registerDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authError && (
            <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              {authError}
            </div>
          )}

          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('auth.nameLabel')}
              </label>
              <Input
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('auth.emailLabel')}
            </label>
            <Input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('auth.passwordLabel')}
            </label>
            <Input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isSubmittingAuth}>
              {isSubmittingAuth
                ? authMode === 'login'
                  ? t('auth.loggingIn')
                  : t('auth.registering')
                : authMode === 'login'
                ? t('auth.loginButton')
                : t('auth.registerButton')}
            </Button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError(null);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {authMode === 'login'
                ? t('auth.dontHaveAccount')
                : t('auth.alreadyHaveAccount')}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
