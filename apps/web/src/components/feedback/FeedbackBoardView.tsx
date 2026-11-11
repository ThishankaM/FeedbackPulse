import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ArrowUp,
  MessageSquare,
  Plus,
  ArrowRight,
  TrendingUp,
  Lightbulb,
  LoaderCircle,
} from 'lucide-react';
import { animate, stagger } from 'animejs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { client } from '../../lib/api';
import type { FeedbackCardData } from '../dashboard/FeedbackCard';
import '../dashboard/dashboard.css';

export interface FeedbackBoardViewProps {
  workspaceSlug: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onOpenNewFeedback: () => void;
  onOpenAuthModal?: () => void;
  initialPostId?: string | null;
  onPostIdChange?: (postId: string | null) => void;
  refreshTrigger: number;
}

type FeedSort = 'trending' | 'top' | 'recent';
type StatusFilter = 'ALL' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS';

export function FeedbackBoardView({
  workspaceSlug,
  searchQuery,
  onSearchQueryChange,
  onOpenNewFeedback,
  onOpenAuthModal,
  initialPostId = null,
  onPostIdChange,
  refreshTrigger,
}: FeedbackBoardViewProps) {
  const { t, i18n } = useTranslation();
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const [activeSort, setActiveSort] = React.useState<FeedSort>('trending');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [posts, setPosts] = React.useState<FeedbackCardData[]>([]);
  const [selectedPost, setSelectedPost] = React.useState<FeedbackCardData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasLoadError, setHasLoadError] = React.useState(false);

  const heroMascotRef = React.useRef<HTMLDivElement>(null);
  const cardsGridRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const canManageWorkspace = React.useMemo(() => {
    const membership = memberships.find((m) => m.workspaceSlug === workspaceSlug);
    return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  }, [memberships, workspaceSlug]);

  React.useEffect(() => {
    if (!heroMascotRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = animate(heroMascotRef.current, {
      translateY: [-5, 5],
      rotate: [-1, 1],
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      duration: 3200,
    });
    return () => {
      animation.pause();
    };
  }, []);

  const loadPosts = React.useCallback(async () => {
    if (!workspaceSlug) {
      queueMicrotask(() => {
        setPosts([]);
        setIsLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      setIsLoading(true);
      setHasLoadError(false);
    });
    try {
      const response = await client.api.workspaces[':slug'].dashboard.$get({
        param: { slug: workspaceSlug },
      });
      if (!response.ok) throw new Error('Could not load feedback');
      const data = await response.json();
      const allPosts = Object.values(data.columns || {}).flatMap((items: unknown) =>
        Array.isArray(items)
          ? items.map((item: Record<string, unknown>): FeedbackCardData => ({
              id: String(item.id),
              boardId: typeof item.boardId === 'string' ? item.boardId : undefined,
              title: String(item.title || ''),
              content: String(item.content || ''),
              status: String(item.status || 'UNDER_REVIEW'),
              voteCount: Number(item.voteCount || 0),
              commentCount: Number(item.commentCount || 0),
              createdAt: String(item.createdAt || ''),
              authorName: typeof item.authorName === 'string' ? item.authorName : null,
              authorAvatar: typeof item.authorAvatar === 'string' ? item.authorAvatar : null,
              hasVoted: Boolean(item.hasVoted),
            }))
          : []
      );
      setPosts(allPosts);
    } catch {
      setHasLoadError(true);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  React.useEffect(() => {
    loadPosts();
  }, [loadPosts, refreshTrigger]);

  // Open deep-linked post (/b/:slug/p/:postId) automatically
  React.useEffect(() => {
    if (!initialPostId) return;
    const existing = posts.find((item) => item.id === initialPostId);
    if (existing) {
      setSelectedPost(existing);
      setIsDetailOpen(true);
      return;
    }
    if (isLoading) return;

    let cancelled = false;
    client.api.posts[':id']
      .$get({ param: { id: initialPostId } })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.post && !cancelled) {
          setSelectedPost({
            id: data.post.id,
            boardId: data.post.boardId,
            title: data.post.title,
            content: data.post.content,
            status: data.post.status,
            voteCount: data.post.voteCount || 0,
            commentCount: data.post.commentCount || 0,
            createdAt: data.post.createdAt,
            authorName: data.post.authorName || null,
            authorAvatar: data.post.authorAvatar || null,
            hasVoted: Boolean(data.post.hasVoted),
          });
          setIsDetailOpen(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialPostId, posts, isLoading]);

  React.useEffect(() => {
    const elements = cardsGridRef.current?.querySelectorAll('.fp-top-card');
    if (!elements?.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animate(Array.from(elements), {
      translateY: [14, 0],
      opacity: [0, 1],
      delay: stagger(75),
      duration: 420,
      ease: 'outCubic',
    });
  }, [posts]);

  const openPostDetail = (post: FeedbackCardData) => {
    setSelectedPost(post);
    setIsDetailOpen(true);
    onPostIdChange?.(post.id);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      onPostIdChange?.(null);
    }
  };

  const handleVote = async (postId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!user) {
      toast({
        title: t('feedback.signInToVote'),
        description: t('feedback.signInToVoteDesc'),
        variant: 'default',
      });
      onOpenAuthModal?.();
      return;
    }

    if (
      event?.currentTarget instanceof HTMLElement &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      animate(event.currentTarget, { scale: [1, 1.2, 1], duration: 280, ease: 'outBack' });
    }

    const post = posts.find((item) => item.id === postId) || (selectedPost?.id === postId ? selectedPost : null);
    if (!post) return;

    const wasVoted = Boolean(post.hasVoted);
    const prevCount = post.voteCount;
    const optimisticCount = Math.max(0, prevCount + (wasVoted ? -1 : 1));

    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? { ...item, hasVoted: !wasVoted, voteCount: optimisticCount }
          : item
      )
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId
        ? { ...prev, hasVoted: !wasVoted, voteCount: optimisticCount }
        : prev
    );

    try {
      const response = await client.api.posts[':id'].vote.$post({ param: { id: postId } });
      if (!response.ok) {
        if (response.status === 401) {
          onOpenAuthModal?.();
        }
        throw new Error('Vote failed');
      }
      const result = await response.json();
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? { ...item, hasVoted: result.voted, voteCount: result.voteCount }
            : item
        )
      );
      setSelectedPost((prev) =>
        prev && prev.id === postId
          ? { ...prev, hasVoted: result.voted, voteCount: result.voteCount }
          : prev
      );
    } catch {
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? { ...item, hasVoted: wasVoted, voteCount: prevCount }
            : item
        )
      );
      setSelectedPost((prev) =>
        prev && prev.id === postId
          ? { ...prev, hasVoted: wasVoted, voteCount: prevCount }
          : prev
      );
      toast({
        title: t('feedback.voteError'),
        description: t('feedback.voteErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = (postId: string, newStatus: string) => {
    setPosts((current) =>
      current.map((item) => (item.id === postId ? { ...item, status: newStatus } : item))
    );
    setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, status: newStatus } : prev));
  };

  const handleCommentAdded = (postId: string) => {
    setPosts((current) =>
      current.map((item) =>
        item.id === postId ? { ...item, commentCount: item.commentCount + 1 } : item
      )
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId ? { ...prev, commentCount: prev.commentCount + 1 } : prev
    );
  };

  const topFeaturedPosts = React.useMemo(
    () => [...posts].sort((a, b) => b.voteCount - a.voteCount).slice(0, 3),
    [posts]
  );

  const filteredFeed = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase(i18n.resolvedLanguage);
    const result = posts.filter((post) => {
      if (statusFilter !== 'ALL' && post.status !== statusFilter) return false;
      return (
        !normalizedQuery ||
        `${post.title} ${post.content} ${post.authorName || ''}`
          .toLocaleLowerCase(i18n.resolvedLanguage)
          .includes(normalizedQuery)
      );
    });
    if (activeSort === 'top') return result.sort((a, b) => b.voteCount - a.voteCount);
    if (activeSort === 'recent') {
      return result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return result.sort(
      (a, b) => b.voteCount + b.commentCount * 2 - (a.voteCount + a.commentCount * 2)
    );
  }, [posts, activeSort, statusFilter, searchQuery, i18n.resolvedLanguage]);

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      IN_PROGRESS: t('feedback.status.inProgress'),
      PLANNED: t('feedback.status.planned'),
      COMPLETED: t('feedback.status.completed'),
      CLOSED: t('feedback.status.closed'),
      UNDER_REVIEW: t('feedback.status.underReview'),
    };
    const variants: Record<string, 'warning' | 'info' | 'success' | 'secondary'> = {
      IN_PROGRESS: 'warning',
      PLANNED: 'info',
      COMPLETED: 'success',
      CLOSED: 'secondary',
      UNDER_REVIEW: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || labels.UNDER_REVIEW}</Badge>;
  };

  const formatNumber = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value);

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'ALL', label: t('feedback.statusFilterAll') },
    { id: 'UNDER_REVIEW', label: t('feedback.status.underReview') },
    { id: 'PLANNED', label: t('feedback.status.planned') },
    { id: 'IN_PROGRESS', label: t('feedback.status.inProgress') },
  ];

  const sortOptions: { id: FeedSort; label: string; icon?: React.ElementType }[] = [
    { id: 'trending', label: t('feedback.filter.trending'), icon: TrendingUp },
    { id: 'top', label: t('feedback.filter.top') },
    { id: 'recent', label: t('feedback.filter.recent') },
  ];

  return (
    <main className="fp-feedback-view mx-auto w-full max-w-[1600px] flex-1 space-y-8 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="fp-feedback-hero relative isolate overflow-hidden rounded-[1.75rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/60 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-3xl">
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              {t('feedback.boardTitle')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {t('feedback.boardDescription')}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onOpenNewFeedback();
              }}
              className="mt-6 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-lg shadow-indigo-950/5 backdrop-blur-xl focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-950/60 sm:flex-row"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder={t('feedback.searchPlaceholder')}
                  aria-label={t('feedback.searchPlaceholder')}
                  className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </label>
              <Button
                type="submit"
                className="h-10 shrink-0 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"
              >
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
                {t('feedback.submitFeedback')}
              </Button>
            </form>
          </div>
          <div
            ref={heroMascotRef}
            className="hidden h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/20 md:flex lg:mr-8"
            aria-hidden="true"
          >
            <Lightbulb className="h-16 w-16 stroke-[1.4]" />
          </div>
        </div>
      </section>

      <section aria-labelledby="featured-feedback-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
              {t('feedback.featuredEyebrow')}
            </p>
            <h2
              id="featured-feedback-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              {t('feedback.featuredTitle')}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="gap-1 text-indigo-700 dark:text-indigo-300"
          >
            {t('feedback.viewAll')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
            {[0, 1, 2].map((item) => (
              <Card
                key={item}
                className="h-36 animate-pulse border-slate-200/70 bg-white/60 dark:border-white/10 dark:bg-white/5"
              />
            ))}
          </div>
        ) : topFeaturedPosts.length ? (
          <div ref={cardsGridRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topFeaturedPosts.map((post) => (
              <Card
                key={post.id}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPostDetail(post);
                  }
                }}
                onClick={() => openPostDetail(post)}
                className="fp-top-card group cursor-pointer rounded-2xl border-slate-200/70 bg-white/75 p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/40"
              >
                <div className="flex items-start gap-3">
                  <Button
                    aria-label={t('feedback.upvote')}
                    aria-pressed={Boolean(post.hasVoted)}
                    size="icon"
                    variant={post.hasVoted ? 'default' : 'secondary'}
                    onClick={(event) => handleVote(post.id, event)}
                    className={cn(
                      'h-10 w-10 shrink-0 rounded-xl',
                      post.hasVoted && 'bg-indigo-600 text-white hover:bg-indigo-700'
                    )}
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                      {post.title}
                    </h3>
                    <div className="mt-2">{getStatusBadge(post.status)}</div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                    <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 text-indigo-600" />
                    {formatNumber(post.voteCount)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                    {t('feedback.commentsCount', { count: post.commentCount })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex min-h-36 flex-col items-center justify-center rounded-2xl border-dashed bg-white/60 p-8 text-center dark:bg-white/[0.03]">
            <Lightbulb aria-hidden="true" className="mb-3 h-8 w-8 text-indigo-400" />
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {hasLoadError ? t('feedback.loadError') : t('feedback.emptyTitle')}
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {hasLoadError ? t('feedback.loadErrorDescription') : t('feedback.emptyDescription')}
            </p>
            {hasLoadError && (
              <Button variant="outline" size="sm" onClick={loadPosts} className="mt-4">
                {t('common.retry')}
              </Button>
            )}
          </Card>
        )}
      </section>

      <section ref={listRef} aria-labelledby="feedback-feed-heading" className="space-y-4 scroll-mt-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Tabs */}
            <div
              className="flex min-w-0 gap-1 overflow-x-auto pb-1 sm:pb-0"
              role="group"
              aria-label={t('feedback.statusFilterLabel')}
            >
              {statusTabs.map(({ id, label }) => (
                <Button
                  key={id}
                  variant={statusFilter === id ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={statusFilter === id}
                  onClick={() => setStatusFilter(id)}
                  className={cn(
                    'h-9 shrink-0 rounded-xl px-3',
                    statusFilter === id && 'bg-indigo-600 text-white hover:bg-indigo-700'
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="hidden h-5 w-px bg-border/80 sm:block" aria-hidden="true" />

            {/* Sort Controls */}
            <div
              className="flex min-w-0 gap-1 overflow-x-auto pb-1 sm:pb-0"
              role="group"
              aria-label={t('feedback.sortLabel')}
            >
              {sortOptions.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeSort === id ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={activeSort === id}
                  onClick={() => setActiveSort(id)}
                  className="h-9 shrink-0 rounded-xl px-3"
                >
                  {Icon && <Icon aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />}
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <div
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              {isLoading && <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
              {t('feedback.postsCount', { count: filteredFeed.length })}
            </div>
            <Button variant="outline" size="sm" onClick={onOpenNewFeedback} className="h-9 shrink-0 gap-1.5 rounded-xl">
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>{t('feedback.newFeedback')}</span>
            </Button>
          </div>
        </div>

        <h2 id="feedback-feed-heading" className="sr-only">
          {t('feedback.feedTitle')}
        </h2>
        {hasLoadError ? (
          <Card className="rounded-2xl p-7 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('feedback.loadError')}</p>
            <Button variant="outline" onClick={loadPosts} className="mt-3">
              {t('common.retry')}
            </Button>
          </Card>
        ) : isLoading ? (
          <div className="space-y-3" aria-label={t('common.loading')}>
            {[0, 1, 2].map((item) => (
              <Card
                key={item}
                className="h-28 animate-pulse border-slate-200/70 bg-white/60 dark:border-white/10 dark:bg-white/5"
              />
            ))}
          </div>
        ) : filteredFeed.length ? (
          <div className="space-y-3">
            {filteredFeed.map((post) => (
              <Card
                key={post.id}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPostDetail(post);
                  }
                }}
                onClick={() => openPostDetail(post)}
                className="group flex cursor-pointer items-start gap-3 rounded-2xl border-slate-200/70 bg-white/75 p-4 transition-all hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] sm:gap-4 sm:p-5"
              >
                <Button
                  aria-label={t('feedback.upvote')}
                  aria-pressed={Boolean(post.hasVoted)}
                  variant={post.hasVoted ? 'default' : 'outline'}
                  onClick={(event) => handleVote(post.id, event)}
                  className={cn(
                    'flex h-auto min-h-12 w-12 shrink-0 flex-col gap-0 rounded-xl px-1 py-1.5',
                    post.hasVoted && 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  )}
                >
                  <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  <span className="text-xs font-bold">{formatNumber(post.voteCount)}</span>
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300 sm:text-base">
                      {post.title}
                    </h3>
                    {getStatusBadge(post.status)}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {post.content}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                      {t('feedback.commentsCount', { count: post.commentCount })}
                    </span>
                    {post.authorName && (
                      <span className="truncate">{t('feedback.postedBy', { name: post.authorName })}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed p-8 text-center">
            <Search aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-slate-400" />
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {posts.length ? t('feedback.noSearchResults') : t('feedback.emptyTitle')}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {posts.length ? t('feedback.noSearchResultsDescription') : t('feedback.emptyDescription')}
            </p>
            {!posts.length && (
              <Button onClick={onOpenNewFeedback} className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                {t('feedback.submitFeedback')}
              </Button>
            )}
          </Card>
        )}
      </section>

      <FeedbackDetailModal
        open={isDetailOpen}
        onOpenChange={handleDetailOpenChange}
        onExitComplete={() => setSelectedPost(null)}
        post={selectedPost}
        onVote={(postId) => void handleVote(postId)}
        onStatusChange={handleStatusChange}
        onCommentAdded={handleCommentAdded}
        onOpenAuthModal={onOpenAuthModal}
        canManage={canManageWorkspace}
      />
    </main>
  );
}
