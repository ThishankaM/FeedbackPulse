import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ArrowUp,
  MessageSquare,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { animate, stagger } from 'animejs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal';
import { cn } from '../../lib/utils';
import { client } from '../../lib/api';
import type { FeedbackCardData } from '../dashboard/FeedbackCard';
import '../dashboard/dashboard.css';

export interface FeedbackBoardViewProps {
  workspaceSlug: string;
  searchQuery: string;
  onOpenNewFeedback: () => void;
  refreshTrigger: number;
}

export function FeedbackBoardView({
  workspaceSlug,
  searchQuery: initialSearchQuery = '',
  onOpenNewFeedback,
  refreshTrigger,
}: FeedbackBoardViewProps) {
  const { t } = useTranslation();
  const [internalQuery, setInternalQuery] = React.useState(initialSearchQuery);
  const [activeFilter, setActiveFilter] = React.useState<'trending' | 'top' | 'newest' | 'planned'>('trending');
  const [posts, setPosts] = React.useState<FeedbackCardData[]>([]);
  const [selectedPost, setSelectedPost] = React.useState<FeedbackCardData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const heroMascotRef = React.useRef<HTMLDivElement>(null);
  const cardsGridRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // 1. Anime.js float effect on the hero 3D mascot
  React.useEffect(() => {
    if (!heroMascotRef.current) return;
    try {
      const anim = animate(heroMascotRef.current, {
        translateY: [-6, 6],
        rotate: [-1, 2],
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
        duration: 3200,
      });
      return () => {
        anim?.pause?.();
      };
    } catch {
      // Fallback gracefully
    }
  }, []);

  // 2. Fetch feedback posts for this workspace via the dashboard API endpoint
  const loadPosts = React.useCallback(async () => {
    if (!workspaceSlug) return;
    try {
      const res = await client.api.workspaces[':slug'].dashboard.$get({
        param: { slug: workspaceSlug },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.columns) {
          const allPosts: FeedbackCardData[] = [];
          Object.keys(data.columns).forEach((statusKey) => {
            const list = (data.columns as Record<string, unknown[]>)[statusKey];
            if (Array.isArray(list)) {
              list.forEach((item: any) => {
                allPosts.push({
                  id: item.id,
                  boardId: item.boardId,
                  title: item.title,
                  content: item.content,
                  status: item.status,
                  voteCount: item.voteCount || 0,
                  commentCount: item.commentCount || 0,
                  createdAt: item.createdAt,
                  authorName: item.authorName || null,
                  authorAvatar: item.authorAvatar || null,
                  hasVoted: false,
                });
              });
            }
          });
          setPosts(allPosts);
        }
      }
    } catch {
      // Fallback gracefully
    }
  }, [workspaceSlug]);

  React.useEffect(() => {
    loadPosts();
  }, [loadPosts, refreshTrigger]);

  // 3. Stagger cards animation on load
  React.useEffect(() => {
    if (cardsGridRef.current) {
      const elements = cardsGridRef.current.querySelectorAll('.fp-top-card');
      if (elements.length > 0) {
        try {
          animate(Array.from(elements), {
            translateY: [18, 0],
            opacity: [0, 1],
            delay: stagger(90),
            duration: 500,
            ease: 'outCubic',
          });
        } catch {
          // Graceful fallback
        }
      }
    }
  }, [posts]);

  // Micro-interaction when upvoting
  const handleVote = async (postId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      const btn = e.currentTarget as HTMLElement;
      try {
        animate(btn, {
          scale: [1, 1.3, 1],
          duration: 350,
          ease: 'outBack',
        });
      } catch {
        // ignore
      }
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic state toggle
    const currentlyVoted = post.hasVoted ?? false;
    const voteDelta = currentlyVoted ? -1 : 1;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, hasVoted: !currentlyVoted, voteCount: Math.max(0, (p.voteCount || 0) + voteDelta) }
          : p
      )
    );

    try {
      await client.api.posts[':id'].vote.$post({
        param: { id: postId },
      });
    } catch {
      // Revert if API fails
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, hasVoted: currentlyVoted, voteCount: (p.voteCount || 0) - voteDelta }
            : p
        )
      );
    }
  };

  // Top 3 featured items
  const topFeaturedPosts = React.useMemo(() => {
    return [...posts].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)).slice(0, 3);
  }, [posts]);

  // Feed items filtered by search query & filter tabs
  const filteredFeed = React.useMemo(() => {
    let result = posts.filter((post) => {
      if (activeFilter === 'planned' && post.status !== 'PLANNED') return false;
      if (internalQuery) {
        const query = internalQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query)
        );
      }
      return true;
    });

    if (activeFilter === 'top') {
      result.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    } else if (activeFilter === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // Trending (weighted votes + comments)
      result.sort(
        (a, b) =>
          (b.voteCount || 0) + (b.commentCount || 0) * 2 -
          ((a.voteCount || 0) + (a.commentCount || 0) * 2)
      );
    }

    return result;
  }, [posts, activeFilter, internalQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="warning">{t('dashboard.tabs.inProgress', 'In Progress')}</Badge>;
      case 'PLANNED':
        return <Badge variant="info">{t('dashboard.tabs.planned', 'Planned')}</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">{t('dashboard.tabs.completed', 'Completed')}</Badge>;
      case 'UNDER_REVIEW':
      default:
        return <Badge variant="secondary">{t('dashboard.tabs.underReview', 'Under Review')}</Badge>;
    }
  };

  return (
    <div className="flex-1 px-6 lg:px-8 py-7 space-y-7 w-full max-w-[1920px] mx-auto select-none">
      {/* HERO BANNER: Theme-dependent glassmorphic hero */}
      <div className="relative rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/10 fp-glass-card overflow-hidden shadow-sm dark:shadow-2xl w-full bg-gradient-to-br from-indigo-50/70 via-white/80 to-slate-100/70 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-indigo-950/40">
        {/* Subtle ambient light */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Feedback Board</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Share Your Feedback
            </h1>
            
            <p className="text-slate-600 dark:text-slate-300/85 text-sm sm:text-base leading-relaxed font-normal">
              Help us build a better product together. Vote on features, request improvements, or propose new ideas.
            </p>

            {/* Glassmorphic Search / Submit Bar */}
            <div className="pt-2 max-w-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onOpenNewFeedback();
                }}
                className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/15 backdrop-blur-xl p-1.5 rounded-2xl flex flex-col sm:flex-row items-center gap-2 shadow-sm dark:shadow-2xl focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
              >
                <div className="flex items-center w-full px-3 gap-2.5">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={internalQuery}
                    onChange={(e) => setInternalQuery(e.target.value)}
                    placeholder="Search feedback, users..."
                    className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none py-1.5"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full sm:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Submit Feedback</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>

          {/* 3D Mascot Floating Widget */}
          <div
            ref={heroMascotRef}
            onClick={onOpenNewFeedback}
            className="relative flex-shrink-0 cursor-pointer group"
            title="Click to suggest an idea"
          >
            <div className="w-36 h-36 sm:w-44 sm:h-44 relative flex items-center justify-center">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 rotate-6 shadow-xl dark:shadow-2xl flex items-center justify-center border-2 border-white/40 dark:border-white/25 relative group-hover:rotate-12 transition-transform duration-300">
                <svg className="w-14 h-14 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div className="absolute -bottom-3 left-6 w-6 h-6 bg-indigo-600 rotate-45 border-b border-r border-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP FEEDBACK HIGHLIGHT ROW: Theme Adaptive */}
      <section className="space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Top Feedback
            </h2>
            <Badge variant="purple" className="text-[10px]">
              Featured
            </Badge>
          </div>
          <button
            onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors group cursor-pointer"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div ref={cardsGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {topFeaturedPosts.length > 0 ? (
            topFeaturedPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => {
                  setSelectedPost(post);
                  setIsDetailOpen(true);
                }}
                className="fp-top-card fp-glass-card rounded-2xl p-5 flex flex-col justify-between group cursor-pointer border border-slate-200/80 dark:border-white/10 hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={(e) => handleVote(post.id, e)}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border',
                      post.hasVoted
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border-indigo-200 dark:bg-indigo-500/10 dark:hover:bg-indigo-600 dark:hover:text-white dark:text-indigo-400 dark:border-indigo-500/20'
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="mt-1.5">{getStatusBadge(post.status)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-5 pt-3.5 border-t border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {post.voteCount || 0}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post.commentCount || 0} Comments
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 fp-glass-card rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No feedback posts yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* FEED TOOLBAR & FULL FEED LIST: Theme Adaptive */}
      <section ref={listRef} className="space-y-4 pt-2 w-full">
        {/* Controls Bar */}
        <div className="fp-glass-card rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/80 dark:border-white/10 w-full">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={activeFilter === 'trending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('trending')}
              className={cn(
                'h-8 text-xs font-semibold rounded-xl cursor-pointer',
                activeFilter === 'trending' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              Trending
            </Button>
            <Button
              variant={activeFilter === 'top' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('top')}
              className={cn(
                'h-8 text-xs font-semibold rounded-xl cursor-pointer',
                activeFilter === 'top' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Top Voted
            </Button>
            <Button
              variant={activeFilter === 'newest' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('newest')}
              className={cn(
                'h-8 text-xs font-semibold rounded-xl cursor-pointer',
                activeFilter === 'newest' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Newest
            </Button>
            <Button
              variant={activeFilter === 'planned' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('planned')}
              className={cn(
                'h-8 text-xs font-semibold rounded-xl cursor-pointer',
                activeFilter === 'planned' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Planned
            </Button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenNewFeedback}
              className="h-8 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer bg-white/70 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Feedback</span>
            </Button>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-3 w-full">
          {filteredFeed.map((post) => (
            <div
              key={post.id}
              onClick={() => {
                setSelectedPost(post);
                setIsDetailOpen(true);
              }}
              className="fp-glass-card rounded-2xl p-4 sm:p-5 flex items-start gap-4 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all cursor-pointer group w-full"
            >
              {/* Vote button */}
              <button
                onClick={(e) => handleVote(post.id, e)}
                className={cn(
                  'flex flex-col items-center justify-center w-12 py-2 rounded-xl border shrink-0 transition-all cursor-pointer',
                  post.hasVoted
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-white hover:bg-indigo-50 border-slate-200 text-slate-700 hover:text-indigo-600 dark:bg-slate-900/80 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400'
                )}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-xs font-bold mt-0.5">{post.voteCount || 0}</span>
              </button>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {post.title}
                  </h4>
                  {getStatusBadge(post.status)}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {post.content}
                </p>

                <div className="flex items-center gap-3.5 mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post.commentCount || 0} Comments
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEEDBACK DETAIL MODAL */}
      <FeedbackDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onExitComplete={() => setSelectedPost(null)}
        post={selectedPost}
        onVote={(postId) => handleVote(postId)}
      />
    </div>
  );
}
