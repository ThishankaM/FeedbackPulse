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
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { animateSidebarWidth, fadeLabels, scalePulse } from '../../lib/motion';

export interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  activeWorkspace?: {
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
}: AppSidebarProps) {
  const { t } = useTranslation();
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
        className="fp-glass-sidebar flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800/80 text-slate-300 select-none z-30 overflow-hidden"
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
                  'fp-sidebar-item flex items-center w-full rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3.5 px-3.5 py-2.5',
                  isActive
                    ? 'fp-sidebar-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Icon
                  onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => scalePulse(e.currentTarget)}
                  className={cn('fp-sidebar-icon h-4.5 w-4.5 shrink-0', isActive ? 'text-white' : 'text-slate-400')}
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

        {/* Bottom Section: Collapse & Help */}
        <div className="p-4 border-t border-slate-800/60 space-y-3">
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
        </div>
      </aside>
    </TooltipProvider>
  );
}
