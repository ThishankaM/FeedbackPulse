import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogIn,
  LogOut,
  ChevronDown,
  Check,
  Plus,
  Menu,
} from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '../ui/dropdown-menu';
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
    logoUrl?: string | null;
  } | null;
  onSwitchWorkspace?: (slug: string) => void;
  onWorkspaceChange?: (workspace: any) => void;
  onOpenCreateWorkspace?: () => void;
  onOpenMobileMenu?: () => void;
}

export function AppHeader({
  searchQuery,
  onSearchChange,
  onOpenAuthModal,
  activeWorkspace,
  onSwitchWorkspace,
  onWorkspaceChange,
  onOpenCreateWorkspace,
  onOpenMobileMenu,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout, memberships } = useAuth();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = React.useState<'workspace' | 'user' | null>(null);

  // Global keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows/Linux) focuses search input
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

  const handleSelectWorkspace = (m: { workspaceSlug: string; workspaceName: string; workspaceId: string }) => {
    setOpenMenu(null);
    onSwitchWorkspace?.(m.workspaceSlug);
    onWorkspaceChange?.(m);
  };

  return (
    <header className="fp-app-header sticky top-0 z-20 flex h-16 min-h-16 items-center justify-between gap-2 bg-transparent px-3 text-foreground backdrop-blur-md transition-colors duration-200 sm:gap-4 sm:px-5">
      {/* Left section: Mobile menu toggle button + desktop spacer */}
      <div className="flex items-center gap-2 min-w-0 md:flex-1">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label={t('nav.openNavigation')}
            className="sm:hidden rounded-xl p-2 text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="hidden min-w-0 md:block" />
      </div>

      {/* Centered ⌘K Search Bar */}
      <div className="relative mx-auto w-full min-w-0 max-w-[428px] flex-1">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('dashboard.searchPlaceholder')}
          className="h-10 w-full rounded-xl border border-border/75 bg-card/78 py-2 pl-10 pr-12 text-sm font-medium text-foreground shadow-xs backdrop-blur-md transition-colors placeholder:text-muted-foreground hover:border-border hover:bg-card/92 focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/25 dark:bg-card/70 dark:hover:bg-card/85 dark:focus:bg-card"
        />
        <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border/60 bg-muted/80 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground sm:flex">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 flex-1 items-center justify-end gap-1.5 sm:gap-3">
        {/* Notifications Bell with Reactive Badge */}
        <button
          type="button"
          title={t('common.notifications')}
          className="fp-icon-button fp-bell-button relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground cursor-pointer"
        >
          <Bell className="fp-bell-icon h-5 w-5 transition-transform" />
          <span className="fp-notification-dot absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-xs animate-pulse">
            3
          </span>
        </button>

        {/* Theme Switcher Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={t('common.theme.toggle')}
          className="fp-icon-button fp-theme-button fp-theme-toggle relative overflow-hidden rounded-xl p-2 text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground cursor-pointer"
        >
          <div className="theme-toggle-icon relative h-5 w-5">
            <Sun
              className={cn(
                'absolute inset-0 h-5 w-5 transition-all duration-300 ease-out transform',
                resolvedTheme === 'dark'
                  ? 'rotate-0 scale-100 opacity-100 text-amber-400'
                  : '-rotate-90 scale-0 opacity-0 text-muted-foreground'
              )}
            />
            <Moon
              className={cn(
                'absolute inset-0 h-5 w-5 transition-all duration-300 ease-out transform',
                resolvedTheme === 'dark'
                  ? 'rotate-90 scale-0 opacity-0 text-muted-foreground'
                  : 'rotate-0 scale-100 opacity-100 text-foreground'
              )}
            />
          </div>
        </button>

        {/* Workspace Switcher Dropdown */}
        {activeWorkspace && (
          <DropdownMenu
            open={openMenu === 'workspace'}
            onOpenChange={(isOpen) => setOpenMenu(isOpen ? 'workspace' : null)}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border/70 hover:bg-card/70 cursor-pointer"
              >
                <div className="fp-workspace-mark flex items-center justify-center h-7 w-7 rounded-lg bg-primary/12 text-primary font-bold text-[11px] uppercase shrink-0 overflow-hidden">
                  {activeWorkspace.logoUrl ? (
                    <img
                      src={activeWorkspace.logoUrl}
                      alt={activeWorkspace.name}
                      className="h-full w-full object-cover"
                    />
                  ) : activeWorkspace.slug ? (
                    activeWorkspace.slug.slice(0, 4).toUpperCase()
                  ) : (
                    t('workspace.initials')
                  )}
                </div>
                <div className="hidden min-w-0 max-w-[110px] sm:block sm:max-w-[150px]">
                  <p className="truncate text-xs font-semibold leading-tight text-foreground">
                    {activeWorkspace.name}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {activeWorkspace.slug}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground',
                    openMenu === 'workspace' && 'rotate-180'
                  )}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 sm:w-64">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t('nav.workspaces')}
              </DropdownMenuLabel>
              <DropdownMenuGroup className="max-h-48 overflow-y-auto space-y-1">
                {memberships && memberships.length > 0 ? (
                  memberships.map((m) => (
                    <DropdownMenuItem
                      key={m.workspaceId}
                      onClick={() => handleSelectWorkspace(m)}
                      className={cn(
                        'flex items-center justify-between text-xs cursor-pointer',
                        activeWorkspace.slug === m.workspaceSlug && 'bg-primary/10 text-primary font-semibold'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/15 text-primary font-bold text-[10px] uppercase shrink-0 overflow-hidden">
                          {m.logoUrl ? (
                            <img
                              src={m.logoUrl}
                              alt={m.workspaceName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            m.workspaceSlug.slice(0, 3).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{m.workspaceName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.workspaceSlug}</p>
                        </div>
                      </div>
                      {activeWorkspace.slug === m.workspaceSlug && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground">
                    {activeWorkspace.name}
                  </div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setOpenMenu(null);
                  onOpenCreateWorkspace?.();
                }}
                className="text-xs font-medium text-primary hover:text-primary cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                <span>{t('nav.createWorkspace')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Auth Section */}
        {user ? (
          <DropdownMenu
            open={openMenu === 'user'}
            onOpenChange={(isOpen) => setOpenMenu(isOpen ? 'user' : null)}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 p-0.5 rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all cursor-pointer"
              >
                <Avatar
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  fallback={user.name || user.email}
                  size="sm"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3.5 py-2.5 border-b border-border/60">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <DropdownMenuItem
                destructive
                onClick={() => {
                  setOpenMenu(null);
                  logout();
                }}
                className="mt-1 text-xs cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>{t('auth.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 rounded-xl shadow-xs"
          >
            <LogIn className="h-4 w-4" />
            <span>{t('nav.signIn')}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
