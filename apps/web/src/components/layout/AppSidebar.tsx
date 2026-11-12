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
import { Sheet, SheetContent } from '../ui/sheet';
import { prefersReducedMotion, scalePulse } from '../../lib/motion';

export interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  canManageWorkspace?: boolean;
  activeWorkspace?: {
    id?: string;
    name: string;
    slug: string;
    primaryColor?: string;
  } | null;
  onSwitchWorkspace?: (slug: string) => void;
  onOpenCreateWorkspace?: () => void;
  onOpenAuthModal?: () => void;
  onOpenNewFeedback?: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 72;
const SIDEBAR_TRANSITION_MS = 180;
const SIDEBAR_STORAGE_KEY = 'feedbackpulse-sidebar-collapsed';

export function AppSidebar({
  currentView = 'dashboard',
  onViewChange,
  canManageWorkspace = false,
  mobileOpen = false,
  onMobileOpenChange,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const asideRef = React.useRef<HTMLElement>(null);
  const resizeTimerRef = React.useRef<number | null>(null);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'feedback', label: t('nav.feedbackBoard'), icon: MessageSquare },
    { id: 'roadmap', label: t('nav.roadmap'), icon: Layers },
    { id: 'changelog', label: t('nav.changelog'), icon: FileText },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
    ...(canManageWorkspace ? [{ id: 'settings', label: t('nav.settings'), icon: Settings }] : []),
  ];

  const stopResizing = React.useCallback(() => {
    if (resizeTimerRef.current !== null) {
      window.clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = null;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('fp-sidebar-resizing');
    }
  }, []);

  React.useEffect(() => stopResizing, [stopResizing]);

  const toggleCollapse = () => {
    const targetCollapsed = !collapsed;
    if (typeof document !== 'undefined' && !prefersReducedMotion()) {
      document.documentElement.classList.add('fp-sidebar-resizing');
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(stopResizing, SIDEBAR_TRANSITION_MS + 40);
    }
    setCollapsed(targetCollapsed);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(targetCollapsed));
    } catch {
      // Graceful fallback for blocked storage
    }
  };

  const helpButton = (
    <button
      type="button"
      onClick={() => onViewChange('help')}
      aria-label={collapsed ? t('nav.helpSupport') : undefined}
      className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-xs font-semibold text-foreground/90 hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer overflow-hidden"
    >
      <HelpCircle className="h-4 w-4 shrink-0" />
      <span
        aria-hidden={collapsed}
        className={cn(
          'sidebar-label truncate whitespace-nowrap font-medium transition-opacity duration-150 motion-reduce:transition-none',
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
      >
        {t('nav.helpSupport')}
      </span>
    </button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      {/* Desktop & Tablet Sidebar */}
      <aside
        ref={asideRef}
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        onTransitionEnd={(e) => {
          if (e.target === asideRef.current && e.propertyName === 'width') {
            stopResizing();
          }
        }}
        className="fp-glass-sidebar glass-panel hidden sm:flex flex-col shrink-0 h-screen sticky top-0 border-r border-border/60 text-foreground select-none z-30 overflow-hidden transition-[width] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 h-18 px-[18px] border-b border-border/60 shrink-0 overflow-hidden">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 shadow-md shadow-primary/20 text-white shrink-0">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div
            aria-hidden={collapsed}
            className={cn(
              'flex flex-col min-w-0 transition-opacity duration-150 motion-reduce:transition-none',
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <span className="sidebar-label text-base font-bold tracking-tight text-foreground font-sans truncate whitespace-nowrap">
              {t('nav.brand')}
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <Tooltip key={item.id} disabled={!collapsed}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onViewChange(item.id)}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn(
                      'fp-sidebar-item flex items-center gap-3.5 px-[15px] py-2.5 w-full rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer overflow-hidden',
                      isActive
                        ? 'fp-sidebar-active bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-foreground/90 hover:text-foreground hover:bg-accent/80'
                    )}
                  >
                    <Icon
                      onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => scalePulse(e.currentTarget)}
                      className={cn(
                        'fp-sidebar-icon h-4.5 w-4.5 shrink-0 transition-transform',
                        isActive ? 'text-primary-foreground' : 'text-foreground/80'
                      )}
                    />
                    <span
                      aria-hidden={collapsed}
                      className={cn(
                        'sidebar-label truncate whitespace-nowrap font-medium transition-opacity duration-150 motion-reduce:transition-none',
                        collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section: Collapse & Help */}
        <div className="p-3 border-t border-border/60 space-y-2 shrink-0">
          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-xs font-semibold text-foreground/90 hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer overflow-hidden"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            <span
              aria-hidden={collapsed}
              className={cn(
                'sidebar-label truncate whitespace-nowrap font-medium transition-opacity duration-150 motion-reduce:transition-none',
                collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              )}
            >
              {t('nav.collapseSidebar')}
            </span>
          </button>

          {/* Help & Support */}
          <Tooltip disabled={!collapsed}>
            <TooltipTrigger asChild>{helpButton}</TooltipTrigger>
            <TooltipContent side="right">{t('nav.helpSupport')}</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile Drawer (<640px) using Sheet Primitive */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 p-0 flex flex-col bg-card/95 backdrop-blur-xl border-r border-border/80 text-foreground overflow-hidden"
        >
          {/* Brand Header */}
          <div className="flex items-center gap-3 h-18 px-6 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 shadow-md shadow-primary/20 text-white shrink-0">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-foreground font-sans truncate">
                {t('nav.brand')}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onViewChange(item.id);
                    onMobileOpenChange?.(false);
                  }}
                  className={cn(
                    'fp-sidebar-item flex items-center w-full rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer overflow-hidden gap-3.5 px-3.5 py-2.5',
                    isActive
                      ? 'fp-sidebar-active bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-foreground/90 hover:text-foreground hover:bg-accent/80'
                  )}
                >
                  <Icon className={cn('fp-sidebar-icon h-4.5 w-4.5 shrink-0', isActive ? 'text-primary-foreground' : 'text-foreground/80')} />
                  <span className="truncate font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-3 border-t border-border/60 space-y-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onViewChange('help');
                onMobileOpenChange?.(false);
              }}
              className="flex items-center w-full rounded-xl text-xs font-semibold text-foreground/90 hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer gap-3 px-3 py-2.5 overflow-hidden"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{t('nav.helpSupport')}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
