import * as React from 'react';
import { createPortal } from 'react-dom';
import { animate } from 'animejs';
import { useTranslation } from 'react-i18next';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  CornerDownRight,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Rocket,
  Send,
  Smile,
  ThumbsUp,
  X,
} from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { Markdown } from '../ui/markdown';
import { useAuth } from '../../context/AuthContext';
import { client } from '../../lib/api';
import { cn } from '../../lib/utils';
import type { FeedbackCardData } from '../dashboard/FeedbackCard';
import './feedback-drawer.css';

export interface CommentItem {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  isInternal?: boolean;
  createdAt: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  authorRole?: string | null;
}

export interface ActivityItem {
  id: string;
  action: string;
  metadata?: { newStatus?: string };
  createdAt: string;
  actorName?: string | null;
  actorAvatar?: string | null;
}

export interface FeedbackDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExitComplete: () => void;
  post: FeedbackCardData | null;
  onVote: (postId: string) => void;
  onStatusChange?: (postId: string, newStatus: string) => void;
  onCommentAdded?: (postId: string) => void;
  onOpenAuthModal?: () => void;
  canManage?: boolean;
}

const STATUS_CONFIG = {
  UNDER_REVIEW: {
    labelKey: 'feedback.status.underReview',
    dotColor: 'bg-blue-600',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/45 dark:text-blue-300 dark:border-blue-800/60',
  },
  PLANNED: {
    labelKey: 'feedback.status.planned',
    dotColor: 'bg-sky-500',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/45 dark:text-sky-300 dark:border-sky-800/60',
  },
  IN_PROGRESS: {
    labelKey: 'feedback.status.inProgress',
    dotColor: 'bg-indigo-500',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/45 dark:text-indigo-300 dark:border-indigo-800/60',
  },
  COMPLETED: {
    labelKey: 'feedback.status.completed',
    dotColor: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  CLOSED: {
    labelKey: 'feedback.status.closed',
    dotColor: 'bg-slate-400',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

interface CommentRowProps {
  comment: CommentItem;
  isReply?: boolean;
  likes: { count: number; voted: boolean };
  timeLabel: string;
  onLike: () => void;
  onReply: () => void;
}

function CommentRow({
  comment,
  isReply = false,
  likes,
  timeLabel,
  onLike,
  onReply,
}: CommentRowProps) {
  const { t } = useTranslation();
  const authorHandle = comment.authorName
    ? `@${comment.authorName.toLowerCase().replace(/\s+/g, '')}`
    : `@${t('feedback.member').toLowerCase()}`;

  return (
    <article className={cn('group flex items-start', isReply ? 'gap-2.5' : 'gap-3')}>
      <Avatar
        src={comment.authorAvatar}
        alt={comment.authorName || t('feedback.communityMember')}
        fallback={comment.authorName || t('feedback.communityMember').slice(0, 1)}
        size={isReply ? 'sm' : 'md'}
        className={cn(
          'relative z-10 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-slate-700/80',
          isReply ? 'mt-0.5 h-8 w-8' : 'mt-0.5 h-9 w-9'
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('font-bold text-slate-900 dark:text-slate-100', isReply ? 'text-[11px]' : 'text-xs')}>
            {comment.authorName || t('feedback.communityMember')}
          </span>
          {(comment.authorRole === 'ADMIN' || comment.authorRole === 'OWNER') && (
            <span className="rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-300">
              {comment.authorRole === 'OWNER' ? t('feedback.owner') : t('feedback.admin')}
            </span>
          )}
          <span className="truncate text-[10px] text-slate-500 dark:text-slate-300">{authorHandle}</span>
          <span className="ml-auto shrink-0 text-[10px] text-slate-500 dark:text-slate-300">{timeLabel}</span>
        </div>

        <div
          className={cn(
            'fp-drawer-comment mt-1.5 rounded-2xl leading-relaxed text-slate-700 dark:text-slate-200',
            isReply ? 'px-3 py-2.5 text-[11px]' : 'px-3.5 py-3 text-xs'
          )}
        >
          <Markdown content={comment.content} className={isReply ? 'text-[11px]' : 'text-xs'} />
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={onLike}
            aria-label={t('feedback.like')}
            className={cn(
              'fp-drawer-action inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]',
              likes.voted && 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
            )}
          >
            <ThumbsUp className="size-3" />
            <span>{likes.count}</span>
          </button>
          <button
            type="button"
            onClick={onReply}
            className="fp-drawer-action inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <CornerDownRight className="size-3" />
            <span>{t('feedback.reply')}</span>
          </button>
          <button
            type="button"
            aria-label={t('feedback.moreOptions')}
            className="fp-drawer-action ml-auto rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

const MemoizedCommentRow = React.memo(
  CommentRow,
  (previous, next) =>
    previous.comment === next.comment &&
    previous.isReply === next.isReply &&
    previous.timeLabel === next.timeLabel &&
    previous.likes.count === next.likes.count &&
    previous.likes.voted === next.likes.voted
);

function DiscussionSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-start gap-3">
          <div className="fp-drawer-skeleton size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="fp-drawer-skeleton h-3 w-36 rounded-full" />
            <div className="fp-drawer-skeleton h-16 w-full rounded-2xl" />
            <div className="fp-drawer-skeleton h-3 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedbackDetailModal({
  open,
  onOpenChange,
  onExitComplete,
  post,
  onVote,
  onStatusChange,
  onCommentAdded,
  onOpenAuthModal,
  canManage = false,
}: FeedbackDetailModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = React.useState<'comments' | 'internal' | 'activity'>('comments');
  const [comments, setComments] = React.useState<CommentItem[]>([]);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [internalCount, setInternalCount] = React.useState(0);
  const [activityCount, setActivityCount] = React.useState(0);
  const [loadingContent, setLoadingContent] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = React.useState(false);
  const [statusOverride, setStatusOverride] = React.useState<{ postId: string; status: StatusKey } | null>(null);
  const [commentLikes, setCommentLikes] = React.useState<Record<string, { count: number; voted: boolean }>>({});
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [mountedTime] = React.useState(() => Date.now());

  const postId = post?.id;
  const currentStatus: StatusKey = (statusOverride && statusOverride.postId === postId
    ? statusOverride.status
    : (post?.status as StatusKey)) || 'UNDER_REVIEW';
  const effectiveTab = !canManage && activeTab === 'internal' ? 'comments' : activeTab;

  const drawerRef = React.useRef<HTMLElement>(null);
  const backdropRef = React.useRef<HTMLButtonElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const statusMenuRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const commentsRequestRef = React.useRef(0);

  // The parent keeps the selected post mounted until the exit animation ends.
  // Pausing on cleanup preserves the current position if the drawer reverses.
  React.useLayoutEffect(() => {
    const drawer = drawerRef.current;
    const backdrop = backdropRef.current;
    if (!postId || !drawer || !backdrop) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawer.style.transform = `translateX(${open ? '0%' : '100.5%'})`;
      backdrop.style.opacity = open ? '1' : '0';
      if (!open) onExitComplete();
      return;
    }

    drawer.style.willChange = 'transform';
    backdrop.style.willChange = 'opacity';
    const slide = animate(drawer, {
      translateX: open ? '0%' : '100.5%',
      duration: open ? 280 : 220,
      ease: open ? 'outCubic' : 'inCubic',
      onComplete: () => {
        drawer.style.willChange = '';
        if (!open) onExitComplete();
      },
    });
    const fade = animate(backdrop, {
      opacity: open ? 1 : 0,
      duration: open ? 220 : 180,
      ease: 'outQuad',
      onComplete: () => { backdrop.style.willChange = ''; },
    });

    return () => {
      slide.pause();
      fade.pause();
      drawer.style.willChange = '';
      backdrop.style.willChange = '';
    };
  }, [open, postId, onExitComplete]);

  React.useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.classList.add('fp-discussion-open');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, 120);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.documentElement.classList.remove('fp-discussion-open');
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      previousFocusRef.current?.focus();
    };
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchPostDetails = React.useCallback(async () => {
    if (!postId) return;
    try {
      const res = await client.api.posts[':id'].$get({ param: { id: postId } });
      if (!res.ok) return;
      const data = await res.json();
      if (data.post) {
        if (typeof data.post.internalCount === 'number') setInternalCount(data.post.internalCount);
        if (typeof data.post.activityCount === 'number') setActivityCount(data.post.activityCount);
      }
    } catch {
      // Discussion content remains usable with the information already loaded.
    }
  }, [postId]);

  const fetchComments = React.useCallback(async () => {
    if (!postId) return;
    const requestId = ++commentsRequestRef.current;
    queueMicrotask(() => {
      if (requestId === commentsRequestRef.current) {
        setLoadingContent(true);
        setActionError(null);
      }
    });
    try {
      if (effectiveTab === 'activity') {
        const res = await client.api.posts[':id'].activity.$get({ param: { id: postId } });
        if (res.ok && requestId === commentsRequestRef.current) {
          const data = await res.json();
          setActivities(data.activities || []);
          setActivityCount((data.activities || []).length);
        }
      } else {
        const res = await client.api.posts[':id'].comments.$get({
          param: { id: postId },
          query: { type: effectiveTab === 'internal' ? 'internal' : 'comments' },
        });
        if (res.ok && requestId === commentsRequestRef.current) {
          const data = await res.json();
          const nextComments = data.comments || [];
          setComments(nextComments);
          if (effectiveTab === 'internal') setInternalCount(nextComments.length);
        }
      }
    } catch {
      if (requestId === commentsRequestRef.current) {
        setActionError(t('feedback.loadingComments'));
      }
    } finally {
      if (requestId === commentsRequestRef.current) {
        setLoadingContent(false);
      }
    }
  }, [effectiveTab, postId, t]);

  React.useEffect(() => {
    if (open && postId) {
      void fetchPostDetails();
    }
  }, [open, postId, fetchPostDetails]);

  React.useEffect(() => {
    if (open && postId) {
      void fetchComments();
    }
    return () => {
      commentsRequestRef.current += 1;
    };
  }, [open, postId, fetchComments]);

  const relativeTime = React.useMemo(
    () => new Intl.RelativeTimeFormat(i18n.resolvedLanguage || 'en', { numeric: 'auto' }),
    [i18n.resolvedLanguage]
  );

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return relativeTime.format(-1, 'hour');
    try {
      const diffSeconds = (new Date(dateStr).getTime() - mountedTime) / 1000;
      const absolute = Math.abs(diffSeconds);
      if (absolute < 60) return relativeTime.format(Math.round(diffSeconds), 'second');
      if (absolute < 3600) return relativeTime.format(Math.round(diffSeconds / 60), 'minute');
      if (absolute < 86400) return relativeTime.format(Math.round(diffSeconds / 3600), 'hour');
      if (absolute < 604800) return relativeTime.format(Math.round(diffSeconds / 86400), 'day');
      return relativeTime.format(Math.round(diffSeconds / 604800), 'week');
    } catch {
      return relativeTime.format(-1, 'hour');
    }
  };

  const handleSelectStatus = async (newStatus: StatusKey) => {
    if (!post || newStatus === currentStatus) {
      setStatusMenuOpen(false);
      return;
    }

    const previousStatus = currentStatus;
    setStatusOverride({ postId: post.id, status: newStatus });
    setStatusMenuOpen(false);
    setActionError(null);

    try {
      const res = await client.api.posts[':id'].status.$patch({
        param: { id: post.id },
        json: { status: newStatus },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error((err as { error?: string } | null)?.error || t('feedback.statusUpdateFailed'));
      }
      onStatusChange?.(post.id, newStatus);
      void fetchPostDetails();
      if (effectiveTab === 'activity') void fetchComments();
    } catch (err) {
      setStatusOverride({ postId: post.id, status: previousStatus });
      setActionError(err instanceof Error ? err.message : t('feedback.statusUpdateFailed'));
    }
  };

  const handleCommentSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || !post || submittingComment || effectiveTab === 'activity') return;

    if (!user) {
      onOpenAuthModal?.();
      return;
    }

    setSubmittingComment(true);
    setActionError(null);
    try {
      const res = await client.api.posts[':id'].comments.$post({
        param: { id: post.id },
        json: {
          content: trimmed,
          parentId: replyingToId || undefined,
          isInternal: effectiveTab === 'internal',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error((err as { error?: string } | null)?.error || t('feedback.commentFailed'));
      }

      const data = await res.json();
      setCommentText('');
      setReplyingToId(null);
      setComments((previous) => [data.comment as CommentItem, ...previous]);
      if (effectiveTab === 'internal') setInternalCount((previous) => previous + 1);
      onCommentAdded?.(post.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('feedback.commentFailed'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyClick = (commentId: string, authorName?: string | null) => {
    setReplyingToId(commentId);
    const mention = authorName ? `@${authorName.replace(/\s+/g, '')} ` : '';
    setCommentText((previous) => (previous.startsWith(mention) ? previous : `${mention}${previous}`));
    textareaRef.current?.focus();
  };

  const handleToggleCommentLike = (commentId: string, initialLikes = 24) => {
    setCommentLikes((previous) => {
      const current = previous[commentId] || { count: initialLikes, voted: false };
      return {
        ...previous,
        [commentId]: {
          count: current.voted ? current.count - 1 : current.count + 1,
          voted: !current.voted,
        },
      };
    });
  };

  const rootComments = React.useMemo(
    () => comments.filter((comment) => !comment.parentId),
    [comments]
  );
  const repliesByParentId = React.useMemo(
    () => comments.reduce<Record<string, CommentItem[]>>((groups, comment) => {
      if (comment.parentId) {
        groups[comment.parentId] = [...(groups[comment.parentId] || []), comment];
      }
      return groups;
    }, {}),
    [comments]
  );

  if (!post) return null;

  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.UNDER_REVIEW;

  const drawerNode = (
    <div className="fp-discussion-layer" data-open={open}>
      <button
        type="button"
        aria-label={t('feedback.closeDiscussion')}
        ref={backdropRef}
        className="fp-discussion-backdrop cursor-default"
        onClick={() => onOpenChange(false)}
        tabIndex={open ? 0 : -1}
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="discussion-drawer-title"
        inert={!open}
        className="fp-discussion-drawer"
        style={{ transform: 'translateX(100.5%)' }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/75 px-5 py-4 dark:border-white/10 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[#0d44e8] text-white shadow-[0_10px_24px_-12px_rgba(13,68,232,0.9)]">
              <MessageSquare className="size-5 fill-white" />
            </div>
            <div className="min-w-0">
              <h2 id="discussion-drawer-title" className="text-xl font-bold tracking-[-0.035em] text-slate-950 dark:text-white">
                {t('feedback.discussion')}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-white/72">
                {t('feedback.discussionSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={() => onOpenChange(false)}
            aria-label={t('feedback.closeDiscussion')}
            className="fp-drawer-action fp-drawer-close grid size-9 shrink-0 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 dark:text-slate-300 dark:hover:bg-white/[0.09] dark:hover:text-white"
          >
            <X className="size-4.5" />
          </button>
        </header>

        <div className="shrink-0 px-4 pt-4 sm:px-6">
          <section className="fp-drawer-summary rounded-[20px] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="grid size-12 shrink-0 place-items-center rounded-[15px] border border-blue-200/70 bg-blue-100/70 text-blue-600 dark:border-blue-800/60 dark:bg-blue-500/15 dark:text-blue-300">
                <MessageSquare className="size-5 fill-current" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold leading-snug tracking-[-0.02em] text-slate-950 dark:text-white">
                  {post.title}
                </h3>
                <Markdown
                  content={post.content}
                  className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-white/78"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600 dark:text-white/72">
                  <div ref={statusMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setStatusMenuOpen((current) => !current)}
                      disabled={!canManage}
                      aria-label={canManage ? t('feedback.statusMenuLabel') : undefined}
                      className={cn(
                        'fp-status-button inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold shadow-sm',
                        statusInfo.badgeClass,
                        !canManage && 'cursor-default'
                      )}
                    >
                      <span className={cn('size-2 rounded-full', statusInfo.dotColor)} />
                      <span>{t(statusInfo.labelKey)}</span>
                      {canManage && <ChevronDown className="size-3 opacity-60" />}
                    </button>

                    {canManage && statusMenuOpen && (
                      <div className="absolute left-0 top-full z-30 mt-2 w-44 rounded-xl border border-black/[0.08] bg-white/95 py-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#171a22]/95">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => void handleSelectStatus(key as StatusKey)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-white/85 dark:hover:bg-white/[0.09]"
                          >
                            <span className="flex items-center gap-2">
                              <span className={cn('size-2 rounded-full', config.dotColor)} />
                              {t(config.labelKey)}
                            </span>
                            {key === currentStatus && <Check className="size-3.5 text-blue-600 dark:text-blue-300" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 font-semibold">
                    <ArrowUp className="size-3.5" />
                    {post.voteCount}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <MessageSquare className="size-3.5" />
                    {post.commentCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onVote(post.id)}
                aria-pressed={Boolean(post.hasVoted)}
                className={cn(
                  'fp-primary-action inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-bold shadow-sm transition-colors',
                  post.hasVoted
                    ? 'bg-[#0836c4] text-white ring-2 ring-blue-400/40'
                    : 'bg-[#0d44e8] text-white hover:bg-[#0836c4]'
                )}
              >
                <ArrowUp className="size-3.5 stroke-[2.7]" />
                {post.hasVoted ? t('feedback.upvoted') : t('feedback.upvote')} {post.voteCount}
              </button>
            </div>
          </section>

          <div
            role="tablist"
            aria-label={t('feedback.discussion')}
            className="mt-4 flex items-center gap-5 overflow-x-auto border-b border-slate-200/80 text-[11px] font-semibold dark:border-white/10"
          >
            {[
              { id: 'comments' as const, label: t('feedback.comments'), count: comments.length || post.commentCount },
              ...(canManage
                ? [{ id: 'internal' as const, label: t('feedback.internalNotes'), count: internalCount }]
                : []),
              { id: 'activity' as const, label: t('feedback.activity'), count: activityCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={effectiveTab === tab.id}
                data-active={effectiveTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'fp-drawer-tab flex shrink-0 items-center gap-1.5 pb-3 transition-colors',
                  effectiveTab === tab.id
                    ? 'text-[#0d44e8] dark:text-[#8ca8ff]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-white/72 dark:hover:text-white'
                )}
              >
                <span>{tab.label}</span>
                <span className="grid min-w-4 place-items-center rounded-full bg-slate-200/70 px-1 text-[9px] dark:bg-white/10">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {actionError && (
            <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/[0.07] px-3 py-2 text-[10px] font-medium text-red-600 dark:text-red-300" role="alert">
              {actionError}
            </div>
          )}
        </div>

        <div className="fp-discussion-stream flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loadingContent ? (
            <DiscussionSkeleton />
          ) : effectiveTab === 'activity' ? (
            activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const nextStatus = activity.metadata?.newStatus;
                  const translatedStatus = nextStatus
                    ? t(STATUS_CONFIG[nextStatus as keyof typeof STATUS_CONFIG]?.labelKey || 'feedback.status.planned')
                    : t('feedback.status.planned');

                  return (
                    <div
                      key={activity.id}
                      className="fp-drawer-enter-item flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-3 text-[11px] text-slate-700 dark:border-blue-800/60 dark:bg-blue-950/35 dark:text-white/78"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                        <Rocket className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {t('feedback.statusChangedTo', { status: translatedStatus })}
                        </p>
                        <p className="mt-0.5">
                          {t('feedback.byUser', { user: activity.actorName || t('feedback.admin') })}
                          {' · '}
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center text-center text-xs font-medium text-slate-500 dark:text-slate-300">
                {t('feedback.noActivity')}
              </div>
            )
          ) : effectiveTab === 'internal' && comments.length === 0 ? (
            <div className="grid min-h-40 place-items-center text-center text-xs font-medium text-slate-500 dark:text-slate-300">
              {t('feedback.noInternalNotes')}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-5">
              {rootComments.map((comment, index) => {
                const replies = repliesByParentId[comment.id] || [];
                const likes = commentLikes[comment.id] || { count: Math.max(1, 24 - index * 16), voted: false };

                return (
                  <div key={comment.id} className="fp-drawer-enter-item fp-drawer-thread">
                    <MemoizedCommentRow
                      comment={comment}
                      likes={likes}
                      timeLabel={formatTimeAgo(comment.createdAt)}
                      onLike={() => handleToggleCommentLike(comment.id, 24)}
                      onReply={() => handleReplyClick(comment.id, comment.authorName)}
                    />

                    {replies.length > 0 && (
                      <div className="fp-thread-replies ml-4 mt-3 space-y-3 pl-7">
                        {replies.map((reply) => {
                          const replyLikes = commentLikes[reply.id] || { count: 12, voted: false };
                          return (
                            <MemoizedCommentRow
                              key={reply.id}
                              comment={reply}
                              isReply
                              likes={replyLikes}
                              timeLabel={formatTimeAgo(reply.createdAt)}
                              onLike={() => handleToggleCommentLike(reply.id, 12)}
                              onReply={() => handleReplyClick(comment.id, reply.authorName)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300">
                  <MessageSquare className="size-5" />
                </span>
                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-300">{t('feedback.noComments')}</p>
              </div>
            </div>
          )}
        </div>

        {effectiveTab !== 'activity' && (
          <footer className="shrink-0 border-t border-slate-200/75 bg-white/55 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1018]/65 sm:px-6">
            <form onSubmit={(event) => void handleCommentSubmit(event)} className="flex items-start gap-2.5">
              <Avatar
                src={user?.avatarUrl}
                alt={user?.name || t('feedback.member')}
                fallback={user?.name || t('feedback.memberInitial')}
                size="md"
                className="mt-1 size-8 rounded-full ring-1 ring-slate-200/80 dark:ring-white/10"
              />

              <div className="fp-drawer-composer min-w-0 flex-1 rounded-2xl p-2.5">
                {replyingToId && (
                  <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                    <span>{t('feedback.replyingToThread')}</span>
                    <button
                      type="button"
                      onClick={() => setReplyingToId(null)}
                      aria-label={t('feedback.cancelReply')}
                      className="fp-drawer-action rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08]"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleCommentSubmit();
                    }
                  }}
                  placeholder={t(effectiveTab === 'internal' ? 'feedback.internalNotePlaceholder' : 'feedback.writeCommentPlaceholder')}
                  className="min-h-14 w-full resize-none bg-transparent px-1 py-1 text-xs leading-relaxed text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-white/55"
                />

                <div className="mt-1 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-white/10">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-300">
                    <button type="button" aria-label={t('feedback.addEmoji')} className="fp-drawer-action rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white">
                      <Smile className="size-3.5" />
                    </button>
                    <button type="button" aria-label={t('feedback.attachImage')} className="fp-drawer-action rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white">
                      <ImageIcon className="size-3.5" />
                    </button>
                    <button type="button" aria-label={t('feedback.attachFile')} className="fp-drawer-action rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white">
                      <Paperclip className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="fp-primary-action inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0d44e8] px-3 text-[11px] font-bold text-white shadow-sm hover:bg-[#0836c4] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Send className="size-3.5" />
                    {t('feedback.send')}
                  </button>
                </div>
              </div>
            </form>
          </footer>
        )}
      </aside>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerNode, document.body)
    : drawerNode;
}
