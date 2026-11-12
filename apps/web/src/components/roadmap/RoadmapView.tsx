import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { animate } from 'animejs';
import {
  Smartphone,
  Share2,
  Database,
  BarChart3,
  Bell,
  Code2,
  Moon,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MoreVertical,
  ArrowUp,
  Search,
  Sparkles,
  Plus,
  Check,
  Activity,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal';
import { useAuth } from '../../context/AuthContext';
import { client } from '../../lib/api';
import { canManageActiveWorkspace } from '../../lib/workspace-access';
import type { FeedbackCardData } from '../dashboard/FeedbackCard';
import { cn } from '../../lib/utils';
import { staggerCards, pulseVote, prefersReducedMotion } from '../../lib/motion';

export interface RoadmapViewProps {
  workspaceSlug: string;
  searchQuery?: string;
  onOpenNewFeedback?: () => void;
  onOpenAuthModal?: () => void;
  refreshTrigger?: number;
}

interface RoadmapItem {
  id: string;
  title: string;
  content: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  voteCount: number;
  commentCount: number;
  hasVoted?: boolean;
  category: string;
  iconType: string;
  createdAt?: string;
}

const DEFAULT_ROADMAP_ITEMS: RoadmapItem[] = [];

export function RoadmapView({
  workspaceSlug,
  searchQuery = '',
  onOpenNewFeedback,
  onOpenAuthModal,
  refreshTrigger = 0,
}: RoadmapViewProps) {
  const { t } = useTranslation();
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const canManageWorkspace = canManageActiveWorkspace(memberships, workspaceSlug);
  const [filterText, setFilterText] = React.useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = React.useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setFilterText(searchQuery);
  }

  const [items, setItems] = React.useState<RoadmapItem[]>(DEFAULT_ROADMAP_ITEMS);
  const [subscribeModalOpen, setSubscribeModalOpen] = React.useState(false);
  const [subscribeEmail, setSubscribeEmail] = React.useState('');
  const [subscribedSuccess, setSubscribedSuccess] = React.useState(false);

  // Selected item for drawer
  const [selectedPost, setSelectedPost] = React.useState<FeedbackCardData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const heroSvgRef = React.useRef<SVGSVGElement>(null);
  const columnsContainerRef = React.useRef<HTMLDivElement>(null);

  // Fetch real workspace posts if available
  React.useEffect(() => {
    let isCancelled = false;
    async function loadRoadmapData() {
      if (!workspaceSlug) return;
      try {
        const res = await client.api.workspaces[':slug'].dashboard.$get({
          param: { slug: workspaceSlug },
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && data.columns) {
            const mapped: RoadmapItem[] = [];
            const colKeys: Array<'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'> = [
              'PLANNED',
              'IN_PROGRESS',
              'COMPLETED',
            ];
            colKeys.forEach((key) => {
              const list = (data.columns as Record<string, unknown[]>)[key];
              if (Array.isArray(list)) {
                list.forEach((p: any) => {
                  mapped.push({
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    status: key,
                    voteCount: p.voteCount || 0,
                    commentCount: p.commentCount || 0,
                    hasVoted: Boolean(p.hasVoted),
                    category: t('roadmap.defaultCategory'),
                    iconType:
                      key === 'COMPLETED' ? 'shield' : key === 'IN_PROGRESS' ? 'chart' : 'mobile',
                    createdAt: p.createdAt,
                  });
                });
              }
            });

            if (mapped.length > 0) {
              setItems(mapped);
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadRoadmapData();
    return () => {
      isCancelled = true;
    };
  }, [workspaceSlug, refreshTrigger, t]);

  // Animate cards on filter change and on load with Anime.js
  React.useEffect(() => {
    if (columnsContainerRef.current) {
      const cards = columnsContainerRef.current.querySelectorAll<HTMLElement>('.fp-roadmap-card');
      if (cards.length > 0) {
        staggerCards(cards, undefined, 340);
      }
    }
  }, [filterText, items]);

  // Continuous subtle dash animation for the roadmap winding trail
  React.useEffect(() => {
    if (heroSvgRef.current && !prefersReducedMotion()) {
      const dashed = heroSvgRef.current.querySelector('#roadmap-dash-trail');
      if (dashed) {
        animate(dashed, {
          strokeDashoffset: [24, 0],
          duration: 2200,
          loop: true,
          ease: 'linear',
        });
      }
    }
  }, []);

  const handleVote = (e: React.MouseEvent, item: RoadmapItem) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: t('feedback.signInToVote'),
        description: t('feedback.signInToVoteDesc'),
        variant: 'default',
      });
      onOpenAuthModal?.();
      return;
    }

    pulseVote(e.currentTarget as HTMLElement, 260);
    const wasVoted = Boolean(item.hasVoted);
    const prevCount = item.voteCount;
    const optimisticCount = wasVoted ? Math.max(0, prevCount - 1) : prevCount + 1;

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, hasVoted: !wasVoted, voteCount: optimisticCount } : i
      )
    );

    // Call real API if UUID format
    if (item.id.includes('-') && item.id.length > 20) {
      client.api.posts[':id'].vote
        .$post({ param: { id: item.id } })
        .then(async (res) => {
          if (!res.ok) throw new Error('Vote failed');
          const data = await res.json();
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, hasVoted: data.voted, voteCount: data.voteCount } : i
            )
          );
        })
        .catch(() => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, hasVoted: wasVoted, voteCount: prevCount } : i
            )
          );
          toast({
            title: t('feedback.voteError'),
            description: t('feedback.voteErrorDesc'),
            variant: 'destructive',
          });
        });
    }
  };

  const handleCardClick = (item: RoadmapItem) => {
    setSelectedPost({
      id: item.id,
      title: item.title,
      content: item.content,
      status: item.status,
      voteCount: item.voteCount,
      hasVoted: item.hasVoted,
      commentCount: item.commentCount,
      authorName: t('roadmap.teamAuthor'),
      authorAvatar: null,
      createdAt: item.createdAt || '2026-11-10T00:00:00.000Z',
    });
    setIsDetailOpen(true);
  };

  const handleStatusChange = (postId: string, newStatus: string) => {
    const isRoadmapStatus =
      newStatus === 'PLANNED' || newStatus === 'IN_PROGRESS' || newStatus === 'COMPLETED';
    setItems((prev) =>
      isRoadmapStatus
        ? prev.map((item) => (item.id === postId ? { ...item, status: newStatus } : item))
        : prev.filter((item) => item.id !== postId)
    );
    setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, status: newStatus } : prev));
  };

  const handleCommentAdded = (postId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, commentCount: item.commentCount + 1 } : item
      )
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId ? { ...prev, commentCount: prev.commentCount + 1 } : prev
    );
  };

  const filteredItems = React.useMemo(() => {
    if (!filterText.trim()) return items;
    const q = filterText.toLowerCase();
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, filterText]);

  const plannedItems = filteredItems.filter((i) => i.status === 'PLANNED');
  const inProgressItems = filteredItems.filter((i) => i.status === 'IN_PROGRESS');
  const completedItems = filteredItems.filter((i) => i.status === 'COMPLETED');

  const getItemIcon = (type: string, status: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'slack':
        return <Share2 className="h-4 w-4" />;
      case 'export':
        return <Database className="h-4 w-4" />;
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'bell':
        return <Bell className="h-4 w-4" />;
      case 'api':
        return <Code2 className="h-4 w-4" />;
      case 'moon':
        return <Moon className="h-4 w-4" />;
      case 'lightning':
        return <Zap className="h-4 w-4" />;
      case 'shield':
      default:
        return status === 'COMPLETED' ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] flex-1 space-y-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      {/* Hero Section with Winding SVG Roadmap Track */}
      <div className="glass-panel relative overflow-hidden rounded-3xl p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/8 blur-2xl" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Left Hero Text, Search Filter & Actions */}
          <div className="lg:col-span-6 space-y-3 z-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('roadmap.title')}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t('roadmap.subtitle')}
            </p>

            {/* Search Filter Input */}
            <div className="pt-2 flex items-center gap-2.5 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder={t('roadmap.searchPlaceholder')}
                  className="glass-input h-10 rounded-xl pl-10 text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>
              {filterText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterText('')}
                  className="rounded-xl text-xs hover:bg-accent"
                >
                  {t('common.clear')}
                </Button>
              )}
            </div>

            {/* Hero Actions: Subscribe & Submit Idea */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <Button
                onClick={() => setSubscribeModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>{t('roadmap.subscribe')}</span>
              </Button>
              {onOpenNewFeedback && (
                <Button
                  onClick={onOpenNewFeedback}
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-full text-xs font-semibold border-border/80 bg-card/60 backdrop-blur-md hover:bg-accent cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('roadmap.submitIdea')}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Right Hero SVG Winding Roadmap Track Illustration */}
          <div className="lg:col-span-6 flex justify-center items-center relative py-2">
            <div className="relative w-full max-w-lg h-44 sm:h-48 flex items-center justify-center">
              <svg
                ref={heroSvgRef}
                viewBox="0 0 480 180"
                className="w-full h-full drop-shadow-xs overflow-visible"
              >
                <defs>
                  <linearGradient id="roadmap-path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="45%" stopColor="#6366f1" />
                    <stop offset="90%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {/* Glow Backing Road */}
                <path
                  d="M 30 135 C 110 145, 120 45, 200 65 C 270 80, 280 130, 360 85 C 400 60, 420 50, 445 45"
                  fill="none"
                  stroke="url(#roadmap-path-gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.22"
                />

                {/* Main Road Stroke */}
                <path
                  d="M 30 135 C 110 145, 120 45, 200 65 C 270 80, 280 130, 360 85 C 400 60, 420 50, 445 45"
                  fill="none"
                  stroke="url(#roadmap-path-gradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {/* Animated Inner Dash Line */}
                <path
                  id="roadmap-dash-trail"
                  d="M 30 135 C 110 145, 120 45, 200 65 C 270 80, 280 130, 360 85 C 400 60, 420 50, 445 45"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />

                {/* Node 1: Planned */}
                <g transform="translate(95, 110)">
                  <circle cx="0" cy="0" r="14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
                  <circle cx="0" cy="0" r="5" fill="#64748b" />
                  <rect x="-28" y="18" width="56" height="20" rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="0" y="32" textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">
                    {t('roadmap.svgPlanned')}
                  </text>
                </g>

                {/* Node 2: In Progress (Pulse) */}
                <g transform="translate(245, 82)">
                  <circle cx="0" cy="0" r="16" fill="#eff6ff" stroke="#6366f1" strokeWidth="3.5" />
                  <circle cx="0" cy="0" r="6" fill="#4f46e5" />
                  <rect x="-35" y="20" width="70" height="20" rx="10" fill="#ffffff" stroke="#a5b4fc" strokeWidth="1" />
                  <text x="0" y="34" textAnchor="middle" fontSize="9" fontWeight="700" fill="#4338ca">
                    {t('roadmap.svgInProgress')}
                  </text>
                </g>

                {/* Node 3: Completed (Check) */}
                <g transform="translate(365, 82)">
                  <circle cx="0" cy="0" r="15" fill="#ecfdf5" stroke="#10b981" strokeWidth="3" />
                  <path d="M -4 0 L -1 3 L 5 -3" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="-34" y="-32" width="68" height="20" rx="10" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1" />
                  <text x="0" y="-18" textAnchor="middle" fontSize="9" fontWeight="700" fill="#047857">
                    {t('roadmap.svgCompleted')}
                  </text>
                </g>

                {/* Summit Flag */}
                <g transform="translate(445, 45)">
                  <ellipse cx="0" cy="6" rx="8" ry="3" fill="#cbd5e1" />
                  <line x1="0" y1="6" x2="0" y2="-32" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="0" cy="-33" r="2.5" fill="#f59e0b" />
                  <path d="M 0 -32 Q 12 -38, 22 -30 Q 12 -20, 0 -18 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
                  <text x="7" y="-22" fontSize="7" fontWeight="900" fill="#78350f">{t('roadmap.svgQuarter')}</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Roadmap Columns Grid */}
      <div ref={columnsContainerRef} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* COLUMN 1: PLANNED */}
        <div className="glass-panel flex flex-col rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('roadmap.planned')}</h3>
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs font-bold text-muted-foreground bg-muted/60">
                {plannedItems.length}
              </Badge>
            </div>
            <button
              aria-label={t('roadmap.columnOptions')}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {plannedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-10 px-4 text-center">
                <Clock className="h-7 w-7 text-muted-foreground/70 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">{t('roadmap.emptyPlannedTitle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('roadmap.emptyPlannedDesc')}</p>
              </div>
            ) : (
              plannedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="fp-roadmap-card glass-card group rounded-xl p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground shadow-2xs">
                        {getItemIcon(item.iconType, item.status)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.content}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleVote(e, item)}
                      className={cn(
                        'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-all cursor-pointer',
                        item.hasVoted
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/80 text-muted-foreground hover:border-primary hover:text-primary'
                      )}
                    >
                      <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                      <span>{item.voteCount}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/80 text-center">
            <button className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer">
              <span>{t('roadmap.viewAll')}</span>
            </button>
          </div>
        </div>

        {/* COLUMN 2: IN PROGRESS */}
        <div className="glass-panel flex flex-col rounded-2xl p-4 shadow-sm ring-1 ring-primary/20">
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('roadmap.inProgress')}</h3>
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs font-bold text-primary bg-primary/10 border-primary/30">
                {inProgressItems.length}
              </Badge>
            </div>
            <button
              aria-label={t('roadmap.columnOptions')}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {inProgressItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-10 px-4 text-center">
                <Activity className="h-7 w-7 text-primary/70 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">{t('roadmap.emptyInProgressTitle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('roadmap.emptyInProgressDesc')}</p>
              </div>
            ) : (
              inProgressItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="fp-roadmap-card glass-card group rounded-xl p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border-primary/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs border border-primary/20">
                        {getItemIcon(item.iconType, item.status)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.content}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleVote(e, item)}
                      className={cn(
                        'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-all cursor-pointer',
                        item.hasVoted
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                      )}
                    >
                      <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                      <span>{item.voteCount}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/80 text-center">
            <button className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer">
              <span>{t('roadmap.viewAll')}</span>
            </button>
          </div>
        </div>

        {/* COLUMN 3: COMPLETED */}
        <div className="glass-panel flex flex-col rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('roadmap.completed')}</h3>
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                {completedItems.length}
              </Badge>
            </div>
            <button
              aria-label={t('roadmap.columnOptions')}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {completedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-10 px-4 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500/70 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">{t('roadmap.emptyCompletedTitle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('roadmap.emptyCompletedDesc')}</p>
              </div>
            ) : (
              completedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="fp-roadmap-card glass-card group rounded-xl p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border-emerald-500/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs border border-emerald-500/20">
                        {getItemIcon(item.iconType, item.status)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.content}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                      <span>{item.voteCount}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/80 text-center">
            <button className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer">
              <span>{t('roadmap.viewAll')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subscribe Modal Dialog using pure React 19 Dialog primitive */}
      <Dialog open={subscribeModalOpen} onOpenChange={setSubscribeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('roadmap.subscribeModalTitle')}</DialogTitle>
            <DialogDescription>
              {t('roadmap.subscribeModalDesc')}
            </DialogDescription>
          </DialogHeader>

          {subscribedSuccess ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t('roadmap.subscribeSuccess')}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubscribedSuccess(true);
                setTimeout(() => {
                  setSubscribeModalOpen(false);
                  setSubscribedSuccess(false);
                  setSubscribeEmail('');
                }, 1800);
              }}
              className="space-y-4"
            >
              <Input
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder={t('common.emailPlaceholder')}
                required
                className="glass-input h-10 rounded-xl"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSubscribeModalOpen(false)}
                  className="rounded-xl text-xs hover:bg-accent"
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4">
                  {t('roadmap.subscribe')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Modal Portal for Card Clicks */}
      <FeedbackDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onExitComplete={() => setSelectedPost(null)}
        post={selectedPost}
        onVote={(postId) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === postId
                ? { ...i, hasVoted: !i.hasVoted, voteCount: i.hasVoted ? i.voteCount - 1 : i.voteCount + 1 }
                : i
            )
          );
        }}
        onStatusChange={handleStatusChange}
        onCommentAdded={handleCommentAdded}
        onOpenAuthModal={onOpenAuthModal}
        canManage={canManageWorkspace}
      />
    </div>
  );
}
