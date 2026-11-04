import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  MessageSquare,
  Layers,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Activity,
  Plus,
  Check,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { animateSidebarWidth, fadeLabels, scalePulse } from '../../lib/motion';

export interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  activeWorkspace: {
    id?: string;
    name: string;
    slug: string;
    primaryColor?: string;
  };
  onSwitchWorkspace?: (slug: string) => void;
  onOpenCreateWorkspace?: () => void;
  onOpenAuthModal?: () => void;
}

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 72;
const SIDEBAR_STORAGE_KEY = 'feedbackpulse-sidebar-collapsed';

export function AppSidebar({
  currentView = 'dashboard',
  onViewChange,
  activeWorkspace,
  onSwitchWorkspace,
  onOpenCreateWorkspace,
  onOpenAuthModal,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { user, memberships } = useAuth();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });
  const asideRef = React.useRef<HTMLElement>(null);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'feedback', label: t('nav.feedbackBoard'), icon: MessageSquare },
    { id: 'roadmap', label: t('nav.roadmap'), icon: Layers },
    { id: 'changelog', label: t('nav.changelog'), icon: FileText },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const currentRole = memberships.find((m) => m.workspaceSlug === activeWorkspace.slug)?.role || 'Member';

  const collectLabels = () =>
    asideRef.current
      ? Array.from(asideRef.current.querySelectorAll<HTMLElement>('.sidebar-label'))
      : [];

  const toggleCollapse = () => {
    const targetCollapsed = !collapsed;
    if (targetCollapsed) {
      fadeLabels(collectLabels(), false, () => setCollapsed(true));
    } else {
      setCollapsed(false);
    }
    animateSidebarWidth(asideRef.current, targetCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, 260);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(targetCollapsed));
  };

  // Fade labels back in when expanding
  React.useEffect(() => {
    if (!collapsed) {
      fadeLabels(collectLabels(), true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const workspaceButton = (
    <button
      onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
      className={cn(
        'flex items-center w-full rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all text-left group cursor-pointer',
        collapsed ? 'justify-center p-1.5' : 'justify-between p-2.5'
      )}
    >
      <div className={cn('flex items-center min-w-0', collapsed ? '' : 'gap-2.5')}>
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs uppercase shrink-0 border border-blue-500/30">
          {activeWorkspace.slug ? activeWorkspace.slug.slice(0, 4) : 'WS'}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="sidebar-label text-xs font-semibold text-white truncate leading-tight">
              {activeWorkspace.name}
            </p>
            <p className="sidebar-label text-[11px] text-slate-400 truncate leading-tight">
              {activeWorkspace.slug}
            </p>
          </div>
        )}
      </div>
      {!collapsed && (
        <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-200 shrink-0 ml-1" />
      )}
    </button>
  );

  const helpButton = (
    <button
      onClick={() => onViewChange('help')}
      aria-label={collapsed ? t('nav.helpSupport') : undefined}
      className={cn(
        'flex items-center w-full rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer',
        collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'
      )}
    >
      <HelpCircle className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="sidebar-label">{t('nav.helpSupport')}</span>}
    </button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        ref={asideRef}
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        className="flex flex-col shrink-0 h-screen sticky top-0 bg-[#0d131f] border-r border-slate-800/80 text-slate-300 select-none z-30 overflow-hidden"
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex items-center h-18 border-b border-slate-800/60',
            collapsed ? 'justify-center px-0' : 'gap-3 px-6'
          )}
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 text-white shrink-0">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="sidebar-label text-base font-bold tracking-tight text-white font-sans">
                {t('nav.brand')}
              </span>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const button = (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center w-full rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3.5 px-3.5 py-2.5',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Icon
                  onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => scalePulse(e.currentTarget)}
                  className={cn('h-4.5 w-4.5 shrink-0', isActive ? 'text-white' : 'text-slate-400')}
                />
                {!collapsed && <span className="sidebar-label">{item.label}</span>}
              </button>
            );

            if (!collapsed) return button;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section: Workspace Switcher, Help & Profile */}
        <div className="p-4 border-t border-slate-800/60 space-y-3">
          {/* Workspace Switcher */}
          <div className="relative">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{workspaceButton}</TooltipTrigger>
                <TooltipContent side="right">
                  {activeWorkspace.name}
                </TooltipContent>
              </Tooltip>
            ) : (
              workspaceButton
            )}

            {/* Workspace Switcher Dropdown */}
            {workspaceMenuOpen && (
              <div
                className={cn(
                  'absolute bottom-full mb-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-50',
                  collapsed ? 'left-0 w-56' : 'left-0 right-0'
                )}
              >
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Workspaces
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {memberships.length > 0 ? (
                    memberships.map((m) => (
                      <button
                        key={m.workspaceId}
                        onClick={() => {
                          onSwitchWorkspace?.(m.workspaceSlug);
                          setWorkspaceMenuOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer',
                          activeWorkspace.slug === m.workspaceSlug
                            ? 'bg-blue-600/20 text-blue-400 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        )}
                      >
                        <span className="truncate">{m.workspaceName}</span>
                        {activeWorkspace.slug === m.workspaceSlug && (
                          <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-2.5 py-1.5 text-xs text-slate-400">
                      {activeWorkspace.name}
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-800 mt-1.5 pt-1">
                  <button
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      onOpenCreateWorkspace?.();
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('nav.createWorkspace')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={toggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className={cn(
              'flex items-center w-full rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer',
              collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && <span className="sidebar-label">{t('nav.collapseSidebar')}</span>}
          </button>

          {/* Help & Support */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{helpButton}</TooltipTrigger>
              <TooltipContent side="right">{t('nav.helpSupport')}</TooltipContent>
            </Tooltip>
          ) : (
            helpButton
          )}

          {/* User Profile / Auth State */}
          {user ? (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-default">
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.name || user.email}
                      fallback={user.name || user.email}
                      size="sm"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user.name || user.email.split('@')[0]} · {currentRole.toLowerCase()}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    fallback={user.name || user.email}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="sidebar-label text-xs font-medium text-white truncate leading-tight">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <p className="sidebar-label text-[10px] text-slate-400 truncate leading-tight capitalize">
                      {currentRole.toLowerCase()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </div>
            )
          ) : collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenAuthModal}
                  aria-label={t('nav.signIn')}
                  className="flex items-center justify-center w-full p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.signIn')}</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span className="sidebar-label">{t('nav.signIn')}</span>
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
