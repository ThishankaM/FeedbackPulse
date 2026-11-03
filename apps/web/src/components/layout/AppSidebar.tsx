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
} from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

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

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'feedback', label: t('nav.feedbackBoard'), icon: MessageSquare },
    { id: 'roadmap', label: t('nav.roadmap'), icon: Layers },
    { id: 'changelog', label: t('nav.changelog'), icon: FileText },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const currentRole = memberships.find((m) => m.workspaceSlug === activeWorkspace.slug)?.role || 'Member';

  return (
    <aside className="flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0d131f] border-r border-slate-800/80 text-slate-300 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-18 border-b border-slate-800/60">
        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 text-white">
          <Activity className="h-5 w-5 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white font-sans">
            {t('nav.brand')}
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <Icon className={cn('h-4.5 w-4.5', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Workspace Switcher, Help & Profile */}
      <div className="p-4 border-t border-slate-800/60 space-y-3">
        {/* Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs uppercase shrink-0 border border-blue-500/30">
                {activeWorkspace.slug ? activeWorkspace.slug.slice(0, 4) : 'WS'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {activeWorkspace.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate leading-tight">
                  {activeWorkspace.slug}
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-200 shrink-0 ml-1" />
          </button>

          {/* Workspace Switcher Dropdown */}
          {workspaceMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95">
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

        {/* Help & Support */}
        <button
          onClick={() => onViewChange('help')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
          <span>{t('nav.helpSupport')}</span>
        </button>

        {/* User Profile / Auth State */}
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                src={user.avatarUrl}
                alt={user.name || user.email}
                fallback={user.name || user.email}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate leading-tight">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight capitalize">
                  {currentRole.toLowerCase()}
                </p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            <span>{t('nav.signIn')}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
