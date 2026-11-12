import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  ArrowUp,
  MessagesSquare,
  Rocket,
  Plus,
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { KanbanColumn } from './KanbanColumn';
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { client } from '../../lib/api';
import { canManageActiveWorkspace } from '../../lib/workspace-access';
import type { FeedbackCardData } from './FeedbackCard';

export interface DashboardViewProps {
  workspaceSlug: string;
  searchQuery: string;
  onOpenNewFeedback: () => void;
  refreshTrigger: number;
  onOpenAuthModal?: () => void;
}

export function DashboardView({
  workspaceSlug,
  searchQuery,
  onOpenNewFeedback,
  onOpenAuthModal,
  refreshTrigger,
}: DashboardViewProps) {
  const { t } = useTranslation();
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const canManageWorkspace = canManageActiveWorkspace(memberships, workspaceSlug);

  const [activeTab, setActiveTab] = React.useState<string>('ALL');

  const [isLoading, setIsLoading] = React.useState(true);
  const [hasLoadError, setHasLoadError] = React.useState(false);
  const [metrics, setMetrics] = React.useState({
    totalFeedback: 0,
    totalVotes: 0,
    totalComments: 0,
    thisMonthReleases: 0,
    deltas: {
      feedback: '',
      votes: '',
      comments: '',
      releases: '',
    },
  });

  const [columns, setColumns] = React.useState<Record<string, FeedbackCardData[]>>({
    UNDER_REVIEW: [],
    PLANNED: [],
    IN_PROGRESS: [],
    COMPLETED: [],
    CLOSED: [],
  });

  const [selectedPost, setSelectedPost] = React.useState<FeedbackCardData | null>(null);
  const [isFeedbackDetailOpen, setIsFeedbackDetailOpen] = React.useState(false);
  const openFeedbackDetail = React.useCallback((card: FeedbackCardData) => {
    setSelectedPost(card);
    setIsFeedbackDetailOpen(true);
  }, []);

  const closeFeedbackDetail = React.useCallback(() => {
    setIsFeedbackDetailOpen(false);
  }, []);

  const handleDetailExitComplete = React.useCallback(() => {
    setSelectedPost(null);
  }, []);

  const handleFeedbackDetailOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) closeFeedbackDetail();
    },
    [closeFeedbackDetail]
  );

  // Fetch live dashboard metrics & posts from API
  const fetchDashboardData = React.useCallback(async () => {
    queueMicrotask(() => {
      setIsLoading(true);
      setHasLoadError(false);
    });
    try {
      const res = await client.api.workspaces[':slug'].dashboard.$get({
        param: { slug: workspaceSlug },
      });

      if (res.ok) {
        const data = await res.json();
        setMetrics({
          totalFeedback: data.metrics.totalFeedback || 0,
          totalVotes: data.metrics.totalVotes || 0,
          totalComments: data.metrics.totalComments || 0,
          thisMonthReleases: data.metrics.thisMonthReleases || 0,
          deltas: data.metrics.deltas || {
            feedback: '',
            votes: '',
            comments: '',
            releases: '',
          },
        });

        // Map live database posts
        if (data.columns) {
          const newCols: Record<string, FeedbackCardData[]> = {
            UNDER_REVIEW: [],
            PLANNED: [],
            IN_PROGRESS: [],
            COMPLETED: [],
            CLOSED: [],
          };

          Object.keys(data.columns).forEach((statusKey) => {
            const apiPosts = (data.columns as any)[statusKey];
            if (Array.isArray(apiPosts)) {
              newCols[statusKey] = apiPosts.map((p: any) => ({
                id: p.id,
                boardId: p.boardId,
                title: p.title,
                content: p.content,
                status: p.status,
                voteCount: p.voteCount || 0,
                commentCount: p.commentCount || 0,
                createdAt: p.createdAt,
                authorName: p.authorName || null,
                authorAvatar: p.authorAvatar || null,
                hasVoted: Boolean(p.hasVoted),
              }));
            }
          });
          setColumns(newCols);
        }
      }
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

  // Handle upvoting
  const handleVote = async (postId: string) => {
    // Voting is member-only; guests are sent to sign in
    if (!user) {
      onOpenAuthModal?.();
      return;
    }

    // 1. Optimistic update
    let previousColumns: Record<string, FeedbackCardData[]> | null = null;
    setColumns((prev) => {
      previousColumns = prev;
      const next = { ...prev };
      Object.keys(next).forEach((colKey) => {
        next[colKey] = next[colKey].map((card) => {
          if (card.id === postId) {
            const hasVoted = !card.hasVoted;
            const voteCount = hasVoted ? card.voteCount + 1 : Math.max(0, card.voteCount - 1);
            return { ...card, hasVoted, voteCount };
          }
          return card;
        });
      });
      return next;
    });

    // 2. Call API
    try {
      const res = await client.api.posts[':id'].vote.$post({
        param: { id: postId },
      });
      if (!res.ok) {
        throw new Error('Vote request failed');
      }
      const data = await res.json();
      // Sync with actual database trigger voteCount
      setColumns((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((colKey) => {
          next[colKey] = next[colKey].map((card) => {
            if (card.id === postId) {
              return { ...card, hasVoted: data.voted, voteCount: data.voteCount };
            }
            return card;
          });
        });
        return next;
      });
      // Also refresh metrics counter
      setMetrics((prev) => ({
        ...prev,
        totalVotes: prev.totalVotes + (data.voted ? 1 : -1),
      }));

      // Keep modal post data in sync
      setSelectedPost((prev) =>
        prev && prev.id === postId
          ? { ...prev, hasVoted: data.voted, voteCount: data.voteCount }
          : prev
      );
    } catch {
      // Roll the optimistic update back on failure
      if (previousColumns) {
        setColumns(previousColumns);
      }
      toast({
        title: t('feedback.voteError'),
        description: t('feedback.voteErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  // Status changed from detail modal
  const handleStatusChange = (postId: string, newStatus: string) => {
    setColumns((prev) => {
      const next: Record<string, FeedbackCardData[]> = {
        UNDER_REVIEW: [],
        PLANNED: [],
        IN_PROGRESS: [],
        COMPLETED: [],
        CLOSED: [],
      };
      let movedCard: FeedbackCardData | null = null;

      Object.keys(prev).forEach((key) => {
        prev[key].forEach((card) => {
          if (card.id === postId) {
            movedCard = { ...card, status: newStatus };
          } else {
            next[key].push(card);
          }
        });
      });

      if (movedCard) {
        if (!next[newStatus]) next[newStatus] = [];
        next[newStatus].unshift(movedCard);
        setSelectedPost(movedCard);
      }

      return next;
    });
  };

  // Comment added from detail modal
  const handleCommentAdded = (postId: string) => {
    setColumns((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((colKey) => {
        next[colKey] = next[colKey].map((card) => {
          if (card.id === postId) {
            return { ...card, commentCount: card.commentCount + 1 };
          }
          return card;
        });
      });
      return next;
    });

    setSelectedPost((prev) =>
      prev && prev.id === postId
        ? { ...prev, commentCount: prev.commentCount + 1 }
        : prev
    );

    setMetrics((prev) => ({
      ...prev,
      totalComments: prev.totalComments + 1,
    }));
  };

  // Filter posts based on global search query
  const filterCards = (cards: FeedbackCardData[]) => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        (c.authorName && c.authorName.toLowerCase().includes(q))
    );
  };

  // Tab definitions
  const tabs = [
    { id: 'ALL', label: t('dashboard.tabs.all') },
    { id: 'UNDER_REVIEW', label: t('dashboard.tabs.underReview') },
    { id: 'PLANNED', label: t('dashboard.tabs.planned') },
    { id: 'IN_PROGRESS', label: t('dashboard.tabs.inProgress') },
    { id: 'COMPLETED', label: t('dashboard.tabs.completed') },
    { id: 'CLOSED', label: t('dashboard.tabs.closed') },
  ];

  const primaryRoadmapColumns = [
    { key: 'UNDER_REVIEW', title: t('dashboard.tabs.underReview') },
    { key: 'PLANNED', title: t('dashboard.tabs.planned') },
    { key: 'IN_PROGRESS', title: t('dashboard.tabs.inProgress') },
    { key: 'COMPLETED', title: t('dashboard.tabs.completed') },
  ];

  const columnsToRender =
    activeTab === 'ALL'
      ? primaryRoadmapColumns
      : [
          ...primaryRoadmapColumns,
          { key: 'CLOSED', title: t('dashboard.tabs.closed') },
        ].filter((col) => col.key === activeTab);

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : t('feedback.guest'));

  return (
    <div className="fp-dashboard-view relative flex-1 space-y-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-white/95 via-indigo-50/90 to-violet-50/90 p-5 shadow-sm ring-1 ring-white/60 backdrop-blur-xl dark:border-white/14 dark:from-slate-900/95 dark:via-slate-900/92 dark:to-indigo-950/80 dark:ring-white/5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">{t('dashboard.overviewLabel')}</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {t('dashboard.welcome', { name: displayName })}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="relative flex items-center gap-3 self-start rounded-2xl border border-white/85 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/14 dark:bg-slate-950/70 sm:self-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <MessagesSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('dashboard.activityLabel')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t('dashboard.metricsDescription')}</p>
          </div>
        </div>
      </header>

      {hasLoadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between">
          <span>{t('dashboard.dataError')}</span>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} className="self-start border-rose-300 bg-white/70 dark:border-rose-400/30 dark:bg-transparent sm:self-auto">{t('common.retry')}</Button>
        </div>
      )}

      {/* Live workspace metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('dashboard.totalFeedback')}
          value={metrics.totalFeedback}
          loading={isLoading}
          delta={metrics.deltas.feedback}
          icon={MessageSquare}
          iconBgColor="bg-blue-500/15"
          iconColor="text-blue-600"
        />
        <MetricCard
          label={t('dashboard.totalVotes')}
          value={metrics.totalVotes}
          loading={isLoading}
          formattedValue={metrics.totalVotes >= 1000 ? `${(metrics.totalVotes / 1000).toFixed(1)}K` : undefined}
          delta={metrics.deltas.votes}
          icon={ArrowUp}
          iconBgColor="bg-blue-500/15"
          iconColor="text-blue-600"
        />
        <MetricCard
          label={t('dashboard.totalComments')}
          value={metrics.totalComments}
          loading={isLoading}
          formattedValue={metrics.totalComments >= 1000 ? `${(metrics.totalComments / 1000).toFixed(1)}K` : undefined}
          delta={metrics.deltas.comments}
          icon={MessagesSquare}
          iconBgColor="bg-blue-500/15"
          iconColor="text-blue-600"
        />
        <MetricCard
          label={t('dashboard.thisMonthReleases')}
          value={metrics.thisMonthReleases}
          loading={isLoading}
          delta={metrics.deltas.releases}
          isPositive={false}
          icon={Rocket}
          iconBgColor="bg-rose-500/15"
          iconColor="text-rose-500"
        />
      </div>

      {/* 3. Status Filter Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/90 p-1 shadow-sm backdrop-blur-xl no-scrollbar dark:bg-card/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'fp-tab-active bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* "+ New Feedback" Action Button */}
        <Button
          onClick={onOpenNewFeedback}
          className="fp-primary-action group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs self-start sm:self-auto shrink-0"
        >
          <Plus className="fp-action-icon h-4 w-4 stroke-[2.5]" />
          <span>{t('dashboard.newFeedback')}</span>
        </Button>
      </div>

      {/* 4. Kanban Status Columns Grid */}
      <div
        className={cn(
          'gap-4 items-start w-full',
          activeTab === 'ALL'
            ? 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4'
            : 'grid max-w-2xl grid-cols-1'
        )}
      >
        {columnsToRender.map((col) => {
          const filteredCards = filterCards(columns[col.key] || []);
          return (
            <KanbanColumn
              key={col.key}
              statusKey={col.key}
              title={col.title}
              count={filteredCards.length}
              cards={filteredCards}
              loading={isLoading}
              onVote={handleVote}
              onCardClick={openFeedbackDetail}
            />
          );
        })}
      </div>

      {/* 5. Feedback Detail Portal Modal */}
      <FeedbackDetailModal
        open={isFeedbackDetailOpen}
        onOpenChange={handleFeedbackDetailOpenChange}
        onExitComplete={handleDetailExitComplete}
        post={selectedPost}
        onVote={handleVote}
        onStatusChange={handleStatusChange}
        onCommentAdded={handleCommentAdded}
        onOpenAuthModal={onOpenAuthModal}
        canManage={canManageWorkspace}
      />
    </div>
  );
}
