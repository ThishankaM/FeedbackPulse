import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bell, Sun, Moon, LogIn, LogOut } from 'lucide-react';
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
}

export function AppHeader({
  searchQuery,
  onSearchChange,
  onOpenAuthModal,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

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

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-18 px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 transition-colors duration-250">
      {/* Search Bar with ⌘K */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('dashboard.searchPlaceholder')}
          className="w-full pl-10 pr-12 py-2 text-sm bg-slate-100/80 dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-slate-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#17171a] border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs pointer-events-none">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <button
          title="Notifications"
          className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0a0a0a] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-black" />
        </button>

        {/* Dark/Light Mode Switcher with Smooth Rotation & Fade */}
        <button
          onClick={toggleTheme}
          title={t('common.theme.toggle')}
          className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0a0a0a] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer overflow-hidden"
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
                  : 'rotate-0 scale-100 opacity-100 text-slate-600'
              )}
            />
          </div>
        </button>

        {/* User Auth Section */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
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
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
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
