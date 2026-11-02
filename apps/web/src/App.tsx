import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './context/ThemeProvider';
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
} from 'lucide-react';

export default function App() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Healthcheck state
  const [healthStatus, setHealthStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Workspace Creation Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdWorkspace, setCreatedWorkspace] = useState<{
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Submit via Hono RPC
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.api.workspaces.$post({
        json: {
          name,
          slug,
          primaryColor,
          ownerEmail,
          ownerName: ownerName || undefined,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedWorkspace(data.workspace);
        setIsModalOpen(false);
        // Reset form
        setName('');
        setSlug('');
        setOwnerEmail('');
        setOwnerName('');
      } else {
        const err = await res.json();
        setErrorMessage('error' in err ? err.error : t('workspace.createError'));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t('workspace.createError'));
    } finally {
      setIsSubmitting(false);
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

          {/* New Workspace Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('nav.createWorkspace')}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Banner if newly created */}
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

        {/* Hero Section */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>FeedbackPulse SaaS Engine — Sprint 1 Initialized</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Unified Customer Feedback, Roadmap & Changelogs
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8">
            Collect user suggestions, prioritize with community upvoting, manage transparent roadmaps, and publish release notes with an embeddable widget.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>{t('workspace.modalTitle')}</span>
            </button>
          </div>
        </div>

        {/* Architecture & Stack Overview */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-lg mb-2">Hono API & RPC</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Fully type-safe client-server communication using <code>hc&lt;AppType&gt;</code> without manual DTOs or code-gen.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-lg mb-2">PostgreSQL & Drizzle ORM</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Versioned SQL migrations, cascade foreign keys, and strict <code>snake_case</code> database schema.
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

      {/* Workspace Creation Modal */}
      {isModalOpen && (
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
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
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
                    placeholder={t('workspace.ownerEmailPlaceholder')}
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t('workspace.ownerNameLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('workspace.ownerNamePlaceholder')}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? t('workspace.submitting') : t('workspace.submitButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
