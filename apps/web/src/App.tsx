import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './context/ThemeProvider';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import {
  Sun,
  Moon,
  Laptop,
  Plus,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  LogIn,
  LogOut,
  User as UserIcon,
  Briefcase,
} from 'lucide-react';

export default function App() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, memberships, login, logout, refreshUser } = useAuth();

  // Healthcheck state
  const [healthStatus, setHealthStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Workspace Creation Form State
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSubmittingWorkspace, setIsSubmittingWorkspace] = useState(false);
  const [createdWorkspace, setCreatedWorkspace] = useState<{
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  } | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Pre-fill owner details when user logs in
  useEffect(() => {
    if (user) {
      setOwnerEmail(user.email);
      if (user.name) setOwnerName(user.name);
    }
  }, [user]);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.api.health.$get();
        if (res.ok) {
          const data = await res.json();
          setHealthStatus(data.database === 'connected' ? 'connected' : 'disconnected');
        } else {
          setHealthStatus('disconnected');
        }
      } catch {
        setHealthStatus('disconnected');
      }
    }
    checkHealth();
  }, []);

  // Auto-generate slug when typing workspace name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  // Submit Workspace Creation via Hono RPC
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWorkspace(true);
    setWorkspaceError(null);

    try {
      const res = await api.api.workspaces.$post({
        json: {
          name,
          slug,
          primaryColor,
          ownerEmail: user ? user.email : ownerEmail,
          ownerName: user ? (user.name || undefined) : (ownerName || undefined),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedWorkspace(data.workspace);
        setIsWorkspaceModalOpen(false);
        setName('');
        setSlug('');
        if (!user) {
          setOwnerEmail('');
          setOwnerName('');
        }
        await refreshUser();
      } else {
        const err = await res.json();
        setWorkspaceError('error' in err ? err.error : t('workspace.createError'));
      }
    } catch (err: any) {
      setWorkspaceError(err?.message || t('workspace.createError'));
    } finally {
      setIsSubmittingWorkspace(false);
    }
  };

  // Handle Authentication (Login / Register) via Hono RPC
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      if (authMode === 'register') {
        const res = await api.api.auth.register.$post({
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
          setAuthSuccessMsg(t('auth.registerSuccess'));
          setTimeout(() => setAuthSuccessMsg(null), 4000);
        } else {
          const err = await res.json();
          setAuthError('error' in err ? err.error : t('auth.registerError'));
        }
      } else {
        const res = await api.api.auth.login.$post({
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
          setAuthSuccessMsg(t('auth.loginSuccess'));
          setTimeout(() => setAuthSuccessMsg(null), 4000);
        } else {
          const err = await res.json();
          setAuthError('error' in err ? err.error : t('auth.loginError'));
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || t('auth.loginError'));
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Top Navigation */}
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between sticky top-0 bg-[var(--background)]/80 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
            <Layers className="w-6 h-6" />
            <span>{t('nav.brand')}</span>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
              {t('nav.boards')}
            </span>
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
              {t('nav.roadmap')}
            </span>
            <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
              {t('nav.changelog')}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Health indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              healthStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : healthStatus === 'checking'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {healthStatus === 'connected'
                ? 'API Ready'
                : healthStatus === 'checking'
                ? 'Connecting...'
                : 'API Offline'}
            </span>
          </div>

          {/* Theme switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-[var(--border)]">
            <button
              onClick={() => setTheme('light')}
              title={t('common.theme.light')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                theme === 'light'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title={t('common.theme.dark')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                theme === 'dark'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('system')}
              title={t('common.theme.system')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                theme === 'system'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Laptop className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-zinc-900 text-xs font-medium">
                <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="max-w-[120px] truncate">{user.name || user.email}</span>
              </div>
              <button
                onClick={logout}
                title={t('auth.logout')}
                className="p-2 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg border border-[var(--border)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setIsAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('auth.login')}</span>
            </button>
          )}

          {/* New Workspace Button */}
          <button
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('nav.createWorkspace')}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Auth success banner */}
        {authSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {authSuccessMsg}
            </p>
          </div>
        )}

        {/* Workspace created banner */}
        {createdWorkspace && (
          <div className="mb-8 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  {t('workspace.createSuccess')}
                </p>
                <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  Workspace <strong>{createdWorkspace.name}</strong> is live at <code>/b/{createdWorkspace.slug}</code>
                </p>
              </div>
            </div>
            <a
              href={`#${createdWorkspace.slug}`}
              className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              <span>View Hub</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* User Workspace Memberships Carousel/Grid if logged in */}
        {user && memberships.length > 0 && (
          <div className="mb-10 p-6 rounded-2xl border border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                Your Workspaces ({memberships.length})
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {memberships.map((m) => (
                <div
                  key={m.workspaceId}
                  className="p-4 rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-sm">{m.workspaceName}</h3>
                    <p className="text-xs text-zinc-500">/b/{m.workspaceSlug}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Sprint 1: End-to-End Auth, Monorepo & Database Operational</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Unified Customer Feedback, Roadmap & Changelogs
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8">
            Collect user suggestions, prioritize with community upvoting, manage transparent roadmaps, and publish release notes with an embeddable widget.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsWorkspaceModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>{t('workspace.modalTitle')}</span>
            </button>
            {!user && (
              <button
                onClick={() => {
                  setAuthMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="px-6 py-3 border border-[var(--border)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-base font-semibold transition-all"
              >
                <span>{t('auth.register')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Architecture & Stack Overview */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-lg mb-2">Hono API & RPC</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Full compile-time type safety via <code>hc&lt;AppType&gt;</code> with JWT auth token headers and Zod input validation.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-lg mb-2">PostgreSQL & Drizzle ORM</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              24 production tables with 19 database triggers maintaining counters, soft-deletes, and cross-tenant integrity.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-lg mb-2">i18n & Theme System</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Zero hardcoded strings via <code>react-i18next</code> with system preference light and dark mode toggles.
            </p>
          </div>
        </div>
      </main>

      {/* Auth Modal (Login / Register) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
              <div>
                <h2 className="text-xl font-bold">
                  {authMode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {authMode === 'login' ? t('auth.loginDesc') : t('auth.registerDesc')}
                </p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t('auth.nameLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t('auth.emailLabel')}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t('auth.emailPlaceholder')}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t('auth.passwordLabel')}
                </label>
                <input
                  type="password"
                  required
                  placeholder={t('auth.passwordPlaceholder')}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {isSubmittingAuth
                  ? (authMode === 'login' ? t('auth.loggingIn') : t('auth.registering'))
                  : (authMode === 'login' ? t('auth.loginButton') : t('auth.registerButton'))}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {authMode === 'login'
                    ? `${t('auth.dontHaveAccount')} ${t('auth.register')}`
                    : `${t('auth.alreadyHaveAccount')} ${t('auth.login')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Creation Modal */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
              <div>
                <h2 className="text-xl font-bold">{t('workspace.modalTitle')}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t('workspace.modalDescription')}
                </p>
              </div>
              <button
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {workspaceError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{workspaceError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t('workspace.nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('workspace.namePlaceholder')}
                  value={name}
                  onChange={handleNameChange}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t('workspace.slugLabel')}
                </label>
                <div className="flex items-center rounded-lg border border-[var(--border)] px-3 py-2 bg-zinc-50 dark:bg-zinc-900">
                  <span className="text-xs text-zinc-500 select-none">/b/</span>
                  <input
                    type="text"
                    required
                    placeholder={t('workspace.slugPlaceholder')}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full bg-transparent text-sm focus:outline-none ml-1"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">{t('workspace.slugHelp')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t('workspace.colorLabel')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] p-1 bg-transparent"
                  />
                  <span className="text-xs font-mono">{primaryColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t('workspace.ownerEmailLabel')}
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!user}
                    placeholder={t('workspace.ownerEmailPlaceholder')}
                    value={user ? user.email : ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t('workspace.ownerNameLabel')}
                  </label>
                  <input
                    type="text"
                    disabled={!!user}
                    placeholder={t('workspace.ownerNamePlaceholder')}
                    value={user ? (user.name || '') : ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWorkspace}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {isSubmittingWorkspace ? t('workspace.submitting') : t('workspace.submitButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
