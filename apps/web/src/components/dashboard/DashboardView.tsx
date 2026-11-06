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
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { client } from '../../lib/api';
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
  const canManageWorkspace = memberships.some(
    (membership) =>
      membership.workspaceSlug === workspaceSlug &&
      (membership.role === 'OWNER' || membership.role === 'ADMIN')
  );

  const [timeRange, setTimeRange] = React.useState<'7D' | '30D' | '90D'>('30D');
  const [activeTab, setActiveTab] = React.useState<string>('ALL');

  const [metrics, setMetrics] = React.useState({
    totalFeedback: 0,
    totalVotes: 0,
    totalComments: 0,
    thisMonthReleases: 0,
    deltas: {
      feedback: '0%',
      votes: '0%',
      comments: '0%',
      releases: '0%',
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
            feedback: '0%',
            votes: '0%',
            comments: '0%',
            releases: '0%',
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
                hasVoted: false,
              }));
            }
          });
          setColumns(newCols);
        }
      }
    } catch {
      // Graceful fallback on network error
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
      if (res.ok) {
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
      }
    } catch {
      // Roll the optimistic update back on failure
      if (previousColumns) {
        setColumns(previousColumns);
      }
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
    <div className="flex-1 px-6 lg:px-8 py-7 space-y-7 w-full max-w-[1920px] mx-auto">
      {/* 1. Greeting & Time Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            {t('dashboard.welcome', { name: displayName })}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Time Range Pills: 7D | 30D | 90D */}
        <div className="fp-glass-control inline-flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
          {(['7D', '30D', '90D'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                'px-3.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                timeRange === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Row of 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('dashboard.totalFeedback')}
          value={metrics.totalFeedback}
          delta={metrics.deltas.feedback}
          icon={MessageSquare}
          iconBgColor="bg-blue-500/15"
          iconColor="text-blue-600"
        />
        <MetricCard
          label={t('dashboard.totalVotes')}
          value={metrics.totalVotes}
          formattedValue={metrics.totalVotes >= 1000 ? `${(metrics.totalVotes / 1000).toFixed(1)}K` : undefined}
          delta={metrics.deltas.votes}
          icon={ArrowUp}
          iconBgColor="bg-blue-500/15"
          iconColor="text-blue-600"
        />
        <MetricCard
          label={t('dashboard.totalComments')}
          value={metrics.totalComments}
          formattedValue={metrics.totalComments >= 1000 ? `${(metrics.totalComments / 1000).toFixed(1)}K` : undefined}
          delta={metrics.deltas.comments}
          icon={MessagesSquare}
          iconBgColor="bg-blue-500/15"
          iconColor="text-blue-600"
        />
        <MetricCard
          label={t('dashboard.thisMonthReleases')}
          value={metrics.thisMonthReleases}
          delta={metrics.deltas.releases}
          isPositive={false}
          icon={Rocket}
          iconBgColor="bg-rose-500/15"
          iconColor="text-rose-500"
        />
      </div>

      {/* 3. Status Filter Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'fp-tab-active text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 border-b-2 border-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'flex max-w-xl'
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
