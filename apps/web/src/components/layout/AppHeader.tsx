import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bell, Sun, Moon, LogIn, LogOut, ChevronDown, Check, Plus } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export interface AppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewFeedback?: () => void;
  onOpenAuthModal?: () => void;
  activeWorkspace?: {
    id?: string;
    name: string;
    slug: string;
    primaryColor?: string;
  };
  onSwitchWorkspace?: (slug: string) => void;
  onOpenCreateWorkspace?: () => void;
}

export function AppHeader({
  searchQuery,
  onSearchChange,
  onOpenAuthModal,
  activeWorkspace,
  onSwitchWorkspace,
  onOpenCreateWorkspace,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout, memberships } = useAuth();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = React.useState(false);
  const userDropdownRef = React.useRef<HTMLDivElement>(null);
  const workspaceMenuRef = React.useRef<HTMLDivElement>(null);

  // Global keyboard shortcut: Cmd+K / Ctrl+K focuses the search input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(target)) {
        setWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-18 px-4 sm:px-8 bg-transparent flex items-center justify-between gap-4 sticky top-0 z-20 text-slate-700 dark:text-slate-300 transition-colors duration-250">
      {/* Left spacer to counterbalance right controls for dead-center alignment */}
      <div className="flex-1 hidden md:block" />

      {/* Search Bar with ⌘K (Centered) */}
      <div className="relative w-full max-w-xs sm:max-w-md mx-auto">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('dashboard.searchPlaceholder')}
          className="w-full pl-10 pr-12 py-2 text-sm bg-white/85 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500/80 transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-md shadow-2xs pointer-events-none">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
        {/* Notifications Bell with Reactive Badge */}
        <button
          title="Notifications"
          className="fp-icon-button fp-bell-button relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Bell className="fp-bell-icon h-5 w-5 transition-transform" />
          <span className="fp-notification-dot absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-[#0d131f]">
            3
          </span>
        </button>

        {/* Dark/Light Mode Switcher with Smooth Rotation & Fade */}
        <button
          onClick={toggleTheme}
          title={t('common.theme.toggle')}
          className="fp-icon-button fp-theme-button relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer overflow-hidden"
        >
          <div className="theme-toggle-icon relative h-5 w-5">
            <Sun
              className={cn(
                'absolute inset-0 h-5 w-5 transition-all duration-300 ease-out transform',
                resolvedTheme === 'dark'
                  ? 'rotate-0 scale-100 opacity-100 text-amber-400'
                  : '-rotate-90 scale-0 opacity-0 text-slate-400'
              )}
            />
            <Moon
              className={cn(
                'absolute inset-0 h-5 w-5 transition-all duration-300 ease-out transform',
                resolvedTheme === 'dark'
                  ? 'rotate-90 scale-0 opacity-0 text-slate-400'
                  : 'rotate-0 scale-100 opacity-100 text-slate-700'
              )}
            />
          </div>
        </button>

        {/* Workspace Switcher Dropdown (to the right of the theme change icon) */}
        {activeWorkspace && (
          <div ref={workspaceMenuRef} className="relative">
            <button
              onClick={() => {
                setWorkspaceMenuOpen(!workspaceMenuOpen);
                setUserDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/85 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 shadow-xs transition-all text-left cursor-pointer group"
            >
              <div className="fp-workspace-mark flex items-center justify-center h-7 w-7 rounded-lg bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[11px] uppercase shrink-0 border border-blue-500/25 dark:border-blue-500/30">
                {activeWorkspace.slug ? activeWorkspace.slug.slice(0, 4) : 'WS'}
              </div>
              <div className="min-w-0 max-w-[110px] sm:max-w-[150px]">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight">
                  {activeWorkspace.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                  {activeWorkspace.slug}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200 shrink-0 transition-transform duration-200',
                  workspaceMenuOpen && 'rotate-180'
                )}
              />
            </button>

            {workspaceMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 rounded-xl bg-white dark:bg-[#0d131f] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Workspaces
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 px-1">
                  {memberships.length > 0 ? (
                    memberships.map((m) => (
                      <button
                        key={m.workspaceId}
                        onClick={() => {
                          onSwitchWorkspace?.(m.workspaceSlug);
                          setWorkspaceMenuOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                          activeWorkspace.slug === m.workspaceSlug
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase shrink-0">
                            {m.workspaceSlug.slice(0, 3)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900 dark:text-white">{m.workspaceName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {m.workspaceSlug}
                            </p>
                          </div>
                        </div>
                        {activeWorkspace.slug === m.workspaceSlug && (
                          <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1.5" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {activeWorkspace.name}
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1.5 pt-1 px-1">
                  <button
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      onOpenCreateWorkspace?.();
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer text-left"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('nav.createWorkspace')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Auth Section */}
        {user ? (
          <div ref={userDropdownRef} className="relative">
            <button
              onClick={() => {
                setUserDropdownOpen(!userDropdownOpen);
                setWorkspaceMenuOpen(false);
              }}
              className="flex items-center gap-2 p-0.5 rounded-full ring-2 ring-transparent hover:ring-blue-500/30 transition-all cursor-pointer"
            >
              <Avatar
                src={user.avatarUrl}
                alt={user.name || user.email}
                fallback={user.name || user.email}
                size="sm"
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#0d131f] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2 w-full px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('auth.logout')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <LogIn className="h-4 w-4" />
            <span>{t('nav.signIn')}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
