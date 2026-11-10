import * as React from 'react';
import { animate, stagger } from 'animejs';
import {
  Bell,
  Sparkles,
  Rocket,
  Search,
  Share2,
  Check,
  ThumbsUp,
  PartyPopper,
  ChevronRight,
  SlidersHorizontal,
  X,
  Maximize2,
  Activity,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { cn } from '../../lib/utils';
import { client } from '../../lib/api';

export interface ChangelogViewProps {
  workspaceSlug?: string;
  searchQuery?: string;
  onOpenNewFeedback?: () => void;
  onOpenAuthModal?: () => void;
  onViewChange?: (view: string) => void;
  refreshTrigger?: number;
}

export type ChangelogCategory = 'all' | 'new' | 'improvement' | 'release';

export interface ChangelogItem {
  id: string;
  version?: string;
  date: string;
  isoDate: string;
  tag: 'New' | 'Improvement' | 'Release' | 'Fix';
  tagVariant: 'purple' | 'info' | 'default' | 'success';
  title: string;
  summary: string;
  descriptionHtml?: string;
  highlights?: string[];
  hasPreview?: boolean;
  previewType?: 'roadmap' | 'dashboard' | 'custom';
  reactions: {
    like: number;
    rocket: number;
    party: number;
  };
  userReactions: {
    like?: boolean;
    rocket?: boolean;
    party?: boolean;
  };
}

// Removed hardcoded changelog items; items will be loaded from DB.
const DEFAULT_CHANGELOG_ITEMS: ChangelogItem[] = [];

export function ChangelogView({
  workspaceSlug,
  searchQuery = '',
  onViewChange,
  refreshTrigger = 0,
}: ChangelogViewProps) {
  const [items, setItems] = React.useState<ChangelogItem[]>(DEFAULT_CHANGELOG_ITEMS);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeCategory, setActiveCategory] = React.useState<ChangelogCategory>('all');
  const [localSearch, setLocalSearch] = React.useState(searchQuery);
  const [subscribeModalOpen, setSubscribeModalOpen] = React.useState(false);
  const [subscribeEmail, setSubscribeEmail] = React.useState('');
  const [subscribedSuccess, setSubscribedSuccess] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = React.useState<ChangelogItem | null>(null);

  const timelineContainerRef = React.useRef<HTMLDivElement>(null);
  const activeDotRef = React.useRef<HTMLDivElement>(null);

  const [prevSearchQuery, setPrevSearchQuery] = React.useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setLocalSearch(searchQuery);
  }

  // Load real changelog items from database via API
  React.useEffect(() => {
    let isCancelled = false;

    async function fetchChangelogs() {
      if (!workspaceSlug) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await (client.api.workspaces[':slug'] as any).changelogs.$get({
          param: { slug: workspaceSlug },
        });

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && Array.isArray(data.changelogs)) {
            const mapped: ChangelogItem[] = data.changelogs.map((raw: any) => {
              const pubDate = raw.publishedAt ? new Date(raw.publishedAt) : new Date(raw.createdAt);
              const formattedDate = pubDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              // Detect version prefix (e.g., "v1.0" or "v1.1.0")
              const vMatch = raw.title.match(/v\d+(\.\d+)*/i);
              const version = vMatch ? vMatch[0] : undefined;

              // Tag determination based on title & content
              let tag: 'New' | 'Improvement' | 'Release' | 'Fix' = 'New';
              let tagVariant: 'purple' | 'info' | 'default' | 'success' = 'purple';
              const lower = (raw.title + ' ' + (raw.content || '')).toLowerCase();
              if (lower.includes('release') || lower.includes('launch') || lower.includes('v1.0')) {
                tag = 'Release';
                tagVariant = 'default';
              } else if (lower.includes('improv') || lower.includes('perf') || lower.includes('faster')) {
                tag = 'Improvement';
                tagVariant = 'info';
              } else if (lower.includes('fix') || lower.includes('patch') || lower.includes('bug')) {
                tag = 'Fix';
                tagVariant = 'success';
              }

              // Extract summary & highlights list from markdown text
              const lines = (raw.content || '')
                .split('\n')
                .map((l: string) => l.trim())
                .filter(Boolean);
              const highlights: string[] = [];
              let summary = '';
              for (const line of lines) {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  highlights.push(line.replace(/^[-*]\s+/, ''));
                } else if (!summary && !line.startsWith('#')) {
                  summary = line;
                }
              }
              if (!summary) summary = raw.title;

              const hasPreview =
                lower.includes('roadmap') || lower.includes('redesign') || lower.includes('preview');

              return {
                id: raw.id,
                version,
                date: formattedDate,
                isoDate: pubDate.toISOString(),
                tag,
                tagVariant,
                title: raw.title,
                summary,
                highlights: highlights.length > 0 ? highlights : undefined,
                hasPreview,
                previewType: 'roadmap',
                authorName: raw.authorName,
                authorAvatar: raw.authorAvatar,
                status: raw.status,
                reactions: {
                  like: 0,
                  rocket: 0,
                  party: 0,
                },
                userReactions: {},
              };
            });

            setItems(mapped);
          }
        } else {
          if (!isCancelled) setItems([]);
        }
      } catch (err) {
        console.error('Failed to load changelogs from DB:', err);
        if (!isCancelled) setItems([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchChangelogs();
    return () => {
      isCancelled = true;
    };
  }, [workspaceSlug, refreshTrigger]);

  // Anime.js Stagger entrance animation on mount and filter changes
  React.useEffect(() => {
    if (timelineContainerRef.current) {
      const entries = timelineContainerRef.current.querySelectorAll('.fp-changelog-entry');
      if (entries.length > 0) {
        animate(Array.from(entries), {
          translateY: [20, 0],
          opacity: [0, 1],
          duration: 400,
          delay: stagger(60),
          ease: 'outCubic',
        });
      }
    }
  }, [activeCategory, localSearch]);

  // Anime.js continuous subtle glow & pulse on the active release dot
  React.useEffect(() => {
    if (activeDotRef.current) {
      const pulseRing = activeDotRef.current.querySelector('.fp-pulse-ring');
      if (pulseRing) {
        animate(pulseRing, {
          scale: [1, 1.4, 1],
          opacity: [0.8, 0.15, 0.8],
          duration: 2200,
          loop: true,
          ease: 'inOutQuad',
        });
      }
    }
  }, []);

  // Filtered items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (activeCategory === 'new' && item.tag !== 'New') return false;
      if (activeCategory === 'improvement' && item.tag !== 'Improvement') return false;
      if (activeCategory === 'release' && item.tag !== 'Release') return false;

      // Text search
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchVersion = item.version?.toLowerCase().includes(q);
        const matchHighlights = item.highlights?.some((h) => h.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchVersion && !matchHighlights) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeCategory, localSearch]);

  // Handle reaction clicks with gentle Anime.js bounce
  const handleReaction = (
    e: React.MouseEvent,
    itemId: string,
    type: 'like' | 'rocket' | 'party'
  ) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    animate(btn, {
      scale: [1, 1.3, 1],
      duration: 260,
      ease: 'outBack',
    });

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentActive = Boolean(item.userReactions[type]);
        const delta = currentActive ? -1 : 1;
        return {
          ...item,
          reactions: {
            ...item.reactions,
            [type]: Math.max(0, item.reactions[type] + delta),
          },
          userReactions: {
            ...item.userReactions,
            [type]: !currentActive,
          },
        };
      })
    );
  };

  // Copy link to changelog entry
  const handleCopyLink = (itemId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${itemId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      {/* Top Actions: Subscribe Button */}
      <div className="flex items-center justify-end gap-2.5 mb-6">
        <Button
          onClick={() => setSubscribeModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Subscribe</span>
        </Button>
      </div>

      {/* 2. Hero Section with Soft Ambient Mesh Waves */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        {/* Abstract Smooth Blue Wave in Top Right (Exact match to screenshot aesthetic) */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 overflow-hidden opacity-90">
          <svg
            viewBox="0 0 600 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute -right-10 -top-10 h-[120%] w-[120%]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.04" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path
              d="M 200 0 C 350 40, 320 220, 600 130 L 600 0 Z"
              fill="url(#waveGrad1)"
            />
            <path
              d="M 280 0 C 380 90, 420 260, 600 210 L 600 0 Z"
              fill="url(#waveGrad2)"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Changelog
          </h1>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 sm:text-base">
            See what&apos;s new in our product.
          </p>

          {/* Search & Tag Filter Bar */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search releases, features, fixes..."
                className="h-9 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-xs transition-colors dark:border-slate-800 dark:bg-slate-950/60"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'new', label: 'New' },
                  { id: 'improvement', label: 'Improvements' },
                  { id: 'release', label: 'Releases' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveCategory(chip.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                    activeCategory === chip.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Timeline Feed */}
      <div ref={timelineContainerRef} className="relative max-w-4xl space-y-12 pb-16">
        {/* Continuous Vertical Timeline Line on the Left */}
        <div className="absolute left-[13px] top-4 bottom-6 w-0.5 bg-gradient-to-b from-blue-500 via-slate-200 to-slate-200 dark:via-slate-800 dark:to-slate-800" />

        {isLoading ? (
          <div className="space-y-10 pl-10">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-6 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="ml-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
            {items.length === 0 ? (
              <>
                <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No changelog releases yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When new product milestones, improvements, or fixes are published to the database, they will appear here.
                </p>
              </>
            ) : (
              <>
                <SlidersHorizontal className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No matching releases found
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search query or clear the filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveCategory('all');
                    setLocalSearch('');
                  }}
                  className="mt-4 rounded-xl text-xs"
                >
                  Reset filters
                </Button>
              </>
            )}
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isFirst = index === 0;

            return (
              <div
                key={item.id}
                id={item.id}
                className="fp-changelog-entry relative flex items-start gap-6 group"
              >
                {/* Timeline Dot Node */}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center">
                  {isFirst ? (
                    <div
                      ref={activeDotRef}
                      className="relative flex h-7 w-7 items-center justify-center"
                    >
                      {/* Outer Pulse Halo */}
                      <span className="fp-pulse-ring absolute h-6 w-6 rounded-full bg-blue-500/30" />
                      {/* Active Outer Ring */}
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-600 bg-white dark:bg-slate-900 shadow-xs">
                        {/* Concentric Inner Filled Blue Dot */}
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-xs group-hover:border-blue-500 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 group-hover:bg-blue-500 transition-colors" />
                    </div>
                  )}
                </div>

                {/* Entry Body */}
                <div className="flex-1 space-y-3 pt-0.5">
                  {/* Metadata Row: Date & Tag Pill */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Pill (with version prefix if available) */}
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.version && (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.version}
                        </span>
                      )}
                      <span>{item.date}</span>
                    </div>

                    {/* Tag Badge */}
                    <Badge
                      variant={item.tagVariant}
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs"
                    >
                      {item.tag}
                    </Badge>

                    {/* Share / Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(item.id)}
                      title="Copy link to this release"
                      className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {item.title}
                  </h2>

                  {/* Summary / Description */}
                  <p className="text-sm font-normal leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.summary}
                  </p>

                  {/* Highlights Bullet List (if available) */}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {item.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Preview Mockup Card (as in screenshot) */}
                  {item.hasPreview && (
                    <div className="pt-2">
                      <div
                        onClick={() => setSelectedPreview(item)}
                        className="group/mockup relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#0b101b] via-[#0f172a] to-[#0a0f1d] p-4 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500/40 cursor-pointer max-w-xl"
                      >
                        {/* Ambient Card Glow */}
                        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl transition-all duration-300 group-hover/mockup:bg-blue-500/30" />
                        <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl" />

                        {/* Top Browser / Window Header */}
                        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-red-500/80" />
                            <div className="h-2 w-2 rounded-full bg-yellow-500/80" />
                            <div className="h-2 w-2 rounded-full bg-green-500/80" />
                            <span className="ml-2 text-[10px] font-medium text-slate-400">
                              FeedbackPulse • Roadmap Preview
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-blue-400">
                            <Maximize2 className="h-3 w-3" />
                            <span>Preview</span>
                          </div>
                        </div>

                        {/* Kanban Preview Columns Mockup */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs">
                          {/* Column 1: Planned */}
                          <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xs">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-300">PLANNED</span>
                              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] text-slate-400">
                                4
                              </span>
                            </div>
                            <div className="rounded-lg bg-slate-900/80 p-1.5 border border-white/5 space-y-1">
                              <div className="h-1.5 w-3/4 rounded-full bg-slate-400/80" />
                              <div className="h-1 w-1/2 rounded-full bg-slate-600" />
                            </div>
                          </div>

                          {/* Column 2: In Progress */}
                          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 backdrop-blur-xs">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-blue-300">IN PROGRESS</span>
                              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[9px] text-blue-300">
                                2
                              </span>
                            </div>
                            <div className="rounded-lg bg-slate-900/80 p-1.5 border border-blue-500/20 space-y-1">
                              <div className="h-1.5 w-4/5 rounded-full bg-blue-400" />
                              <div className="h-1 w-2/3 rounded-full bg-blue-600/70" />
                            </div>
                          </div>

                          {/* Column 3: Completed */}
                          <div className="hidden sm:block rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 backdrop-blur-xs">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-300">COMPLETED</span>
                              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-300">
                                8
                              </span>
                            </div>
                            <div className="rounded-lg bg-slate-900/80 p-1.5 border border-emerald-500/20 space-y-1">
                              <div className="h-1.5 w-3/4 rounded-full bg-emerald-400" />
                              <div className="h-1 w-1/2 rounded-full bg-emerald-600/70" />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Hint */}
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                          <span className="flex items-center gap-1 text-blue-400">
                            <Sparkles className="h-3 w-3" />
                            Modern roadmap trail &amp; voting
                          </span>
                          <span className="group-hover/mockup:translate-x-0.5 transition-transform flex items-center gap-0.5 text-slate-300">
                            Click to explore <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reaction Buttons Bar */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={(e) => handleReaction(e, item.id, 'like')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                        item.userReactions.like
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850'
                      )}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>{item.reactions.like}</span>
                    </button>

                    <button
                      onClick={(e) => handleReaction(e, item.id, 'rocket')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                        item.userReactions.rocket
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850'
                      )}
                    >
                      <Rocket className="h-3 w-3" />
                      <span>{item.reactions.rocket}</span>
                    </button>

                    <button
                      onClick={(e) => handleReaction(e, item.id, 'party')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                        item.userReactions.party
                          ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850'
                      )}
                    >
                      <PartyPopper className="h-3 w-3" />
                      <span>{item.reactions.party}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Subscribe Dialog Modal */}
      <Dialog open={subscribeModalOpen} onOpenChange={setSubscribeModalOpen}>
        <DialogHeader>
          <DialogTitle>Subscribe to FeedbackPulse Changelog</DialogTitle>
          <DialogDescription>
            Get instant notifications and monthly digests whenever we ship new features,
            improvements, and performance updates.
          </DialogDescription>
        </DialogHeader>

        {subscribedSuccess ? (
          <div className="rounded-xl bg-emerald-50 p-4 text-center text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            🎉 You have successfully subscribed to product changelog updates!
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <Input
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-10 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSubscribeModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Subscribe
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* 5. Roadmap Preview Full View Modal */}
      <Dialog
        open={Boolean(selectedPreview)}
        onOpenChange={(open) => !open && setSelectedPreview(null)}
      >
        <DialogHeader>
          <DialogTitle>{selectedPreview?.title}</DialogTitle>
          <DialogDescription>{selectedPreview?.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b101b] p-6 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="font-bold text-sm">FeedbackPulse Roadmap</span>
              </div>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                Interactive View
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              The redesigned public roadmap empowers your users to follow development in real-time,
              upvote key features, and subscribe to milestones with zero friction.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPreview(null);
                  onViewChange?.('roadmap');
                }}
                className="rounded-xl text-xs border-slate-700 text-white hover:bg-white/10"
              >
                Open Full Roadmap View →
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
