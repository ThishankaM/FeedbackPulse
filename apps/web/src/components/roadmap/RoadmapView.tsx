import * as React from 'react';
import { animate, stagger } from 'animejs';
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
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal';
import { client } from '../../lib/api';
import type { FeedbackCardData } from '../dashboard/FeedbackCard';
import { cn } from '../../lib/utils';

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
  hasVoted?: boolean;
  category: string;
  iconType: string;
}

// Removed hardcoded roadmap items; items will be loaded from API.
const DEFAULT_ROADMAP_ITEMS: RoadmapItem[] = [];

export function RoadmapView({
  workspaceSlug,
  searchQuery = '',
  onOpenNewFeedback,
  onOpenAuthModal,
  refreshTrigger = 0,
}: RoadmapViewProps) {
  const [filterText, setFilterText] = React.useState(searchQuery);
  const [items, setItems] = React.useState<RoadmapItem[]>(DEFAULT_ROADMAP_ITEMS);
  const [subscribeModalOpen, setSubscribeModalOpen] = React.useState(false);
  const [subscribeEmail, setSubscribeEmail] = React.useState('');
  const [subscribedSuccess, setSubscribedSuccess] = React.useState(false);

  // Selected item for drawer
  const [selectedPost, setSelectedPost] = React.useState<FeedbackCardData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const heroSvgRef = React.useRef<SVGSVGElement>(null);
  const columnsContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync prop searchQuery
  React.useEffect(() => {
    if (searchQuery) setFilterText(searchQuery);
  }, [searchQuery]);

  // Fetch real workspace posts if available
  React.useEffect(() => {
    async function loadRoadmapData() {
      if (!workspaceSlug) return;
      try {
        const res = await client.api.workspaces[':slug'].dashboard.$get({
          param: { slug: workspaceSlug },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.columns) {
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
                    hasVoted: false,
                    category: 'Roadmap',
                    iconType:
                      key === 'COMPLETED' ? 'shield' : key === 'IN_PROGRESS' ? 'chart' : 'mobile',
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
        // Fallback to default showcase items
      }
    }
    loadRoadmapData();
  }, [workspaceSlug, refreshTrigger]);

  // Animate cards on filter change and on load with Anime.js
  React.useEffect(() => {
    if (columnsContainerRef.current) {
      const cards = columnsContainerRef.current.querySelectorAll('.fp-roadmap-card');
      if (cards.length > 0) {
        animate(Array.from(cards), {
          translateY: [16, 0],
          opacity: [0, 1],
          duration: 380,
          delay: stagger(30),
          ease: 'outCubic',
        });
      }
    }
  }, [filterText]);

  // Continuous subtle dash animation for the roadmap winding trail
  React.useEffect(() => {
    if (heroSvgRef.current) {
      const dashed = heroSvgRef.current.querySelector('#roadmap-dash-trail');
      if (dashed) {
        animate(dashed, {
          strokeDashoffset: [24, 0],
          duration: 2000,
          loop: true,
          ease: 'linear',
        });
      }
    }
  }, []);

  const handleVote = (e: React.MouseEvent, item: RoadmapItem) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === item.id) {
          const nextVoted = !i.hasVoted;
          return {
            ...i,
            hasVoted: nextVoted,
            voteCount: nextVoted ? i.voteCount + 1 : Math.max(0, i.voteCount - 1),
          };
        }
        return i;
      })
    );

    // Call real API if UUID format
    if (item.id.includes('-') && item.id.length > 20) {
      client.api.posts[':id'].vote
        .$post({ param: { id: item.id } })
        .catch(() => {});
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
      commentCount: 4,
      authorName: 'FeedbackPulse Team',
      authorAvatar: null,
      createdAt: new Date().toISOString(),
    });
    setIsDetailOpen(true);
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
        return <Smartphone className="h-5 w-5" />;
      case 'slack':
        return <Share2 className="h-5 w-5" />;
      case 'export':
        return <Database className="h-5 w-5" />;
      case 'chart':
        return <BarChart3 className="h-5 w-5" />;
      case 'bell':
        return <Bell className="h-5 w-5" />;
      case 'api':
        return <Code2 className="h-5 w-5" />;
      case 'moon':
        return <Moon className="h-5 w-5" />;
      case 'lightning':
        return <Zap className="h-5 w-5" />;
      case 'shield':
      default:
        return status === 'COMPLETED' ? (
          <ShieldCheck className="h-5 w-5" />
        ) : (
          <Sparkles className="h-5 w-5" />
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] flex-1 space-y-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      {/* Top Actions: Subscribe & Submit Idea */}
      <div className="flex items-center justify-end gap-2.5">
        <Button
          onClick={() => setSubscribeModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Subscribe</span>
        </Button>
        {onOpenNewFeedback && (
          <Button
            onClick={onOpenNewFeedback}
            variant="outline"
            className="flex items-center gap-1.5 rounded-full text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Submit Idea</span>
          </Button>
        )}
      </div>

      {/* Hero Section with Winding SVG Roadmap Track */}
          <div className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-6 shadow-sm dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-indigo-400/10 blur-2xl" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              {/* Left Hero Text & Search Filter */}
              <div className="lg:col-span-6 space-y-3 z-10">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Product Roadmap
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Our development roadmap and planned features. Upvote existing items or submit new suggestions to guide our quarterly milestones.
                </p>

                {/* Search Filter Input */}
                <div className="pt-2 flex items-center gap-2.5 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Search roadmap features, analytics, slack..."
                      className="h-10 rounded-xl border-slate-200 bg-white/90 pl-10 text-xs dark:border-slate-800 dark:bg-slate-900/90"
                    />
                  </div>
                  {filterText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterText('')}
                      className="rounded-xl text-xs"
                    >
                      Clear
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
                        <stop offset="45%" stopColor="#3b82f6" />
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
                        PLANNED
                      </text>
                    </g>

                    {/* Node 2: In Progress (Pulse) */}
                    <g transform="translate(245, 82)">
                      <circle cx="0" cy="0" r="16" fill="#eff6ff" stroke="#3b82f6" strokeWidth="3.5" />
                      <circle cx="0" cy="0" r="6" fill="#2563eb" />
                      <rect x="-35" y="20" width="70" height="20" rx="10" fill="#ffffff" stroke="#93c5fd" strokeWidth="1" />
                      <text x="0" y="34" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1d4ed8">
                        IN PROGRESS
                      </text>
                    </g>

                    {/* Node 3: Completed (Check) */}
                    <g transform="translate(365, 82)">
                      <circle cx="0" cy="0" r="15" fill="#ecfdf5" stroke="#10b981" strokeWidth="3" />
                      <path d="M -4 0 L -1 3 L 5 -3" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="-34" y="-32" width="68" height="20" rx="10" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1" />
                      <text x="0" y="-18" textAnchor="middle" fontSize="9" fontWeight="700" fill="#047857">
                        COMPLETED
                      </text>
                    </g>

                    {/* Summit Flag */}
                    <g transform="translate(445, 45)">
                      <ellipse cx="0" cy="6" rx="8" ry="3" fill="#cbd5e1" />
                      <line x1="0" y1="6" x2="0" y2="-32" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="0" cy="-33" r="2.5" fill="#f59e0b" />
                      <path d="M 0 -32 Q 12 -38, 22 -30 Q 12 -20, 0 -18 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
                      <text x="7" y="-22" fontSize="7" fontWeight="900" fill="#78350f">Q4</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Roadmap Columns Grid */}
          <div ref={columnsContainerRef} className="grid grid-cols-1 gap-6 md:grid-cols-3">
            
            {/* COLUMN 1: PLANNED */}
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Planned</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {plannedItems.length}
                  </span>
                </div>
                <button
                  aria-label="Column options"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {plannedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className="fp-roadmap-card group rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400/60 dark:border-slate-800 dark:bg-slate-850 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs">
                          {getItemIcon(item.iconType, item.status)}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.content}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleVote(e, item)}
                        className={cn(
                          'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-all cursor-pointer',
                          item.hasVoted
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300'
                        )}
                      >
                        <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                        <span>{item.voteCount}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <button className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  <span>View all →</span>
                </button>
              </div>
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div className="flex flex-col rounded-2xl border border-blue-200/80 bg-white p-4 shadow-sm ring-1 ring-blue-500/10 dark:border-blue-900/60 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-300 dark:border-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">In Progress</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
                    {inProgressItems.length}
                  </span>
                </div>
                <button
                  aria-label="Column options"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {inProgressItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className="fp-roadmap-card group rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400/60 dark:border-slate-800 dark:bg-slate-850 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 shadow-xs border border-blue-100 dark:border-blue-900/40">
                          {getItemIcon(item.iconType, item.status)}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.content}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleVote(e, item)}
                        className={cn(
                          'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-all cursor-pointer',
                          item.hasVoted
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                        )}
                      >
                        <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                        <span>{item.voteCount}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <button className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  <span>View all →</span>
                </button>
              </div>
            </div>

            {/* COLUMN 3: COMPLETED */}
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Completed</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                    {completedItems.length}
                  </span>
                </div>
                <button
                  aria-label="Column options"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className="fp-roadmap-card group rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-400/60 dark:border-slate-800 dark:bg-slate-850 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 shadow-xs border border-emerald-100 dark:border-emerald-900/40">
                          {getItemIcon(item.iconType, item.status)}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>{item.voteCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <button className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  <span>View all →</span>
                </button>
              </div>
            </div>

          </div>

      {/* Subscribe Modal Dialog */}
      <Dialog open={subscribeModalOpen} onOpenChange={setSubscribeModalOpen}>
        <DialogHeader>
          <DialogTitle>Subscribe to Roadmap Updates</DialogTitle>
          <DialogDescription>
            Get email digests whenever feature milestones advance from planned to shipped.
          </DialogDescription>
        </DialogHeader>

        {subscribedSuccess ? (
          <div className="rounded-xl bg-emerald-50 p-4 text-center text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            🎉 You have successfully subscribed to roadmap updates!
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
              placeholder="you@company.com"
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSubscribeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Subscribe
              </Button>
            </div>
          </form>
        )}
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
        onOpenAuthModal={onOpenAuthModal}
      />
    </div>
  );
}
