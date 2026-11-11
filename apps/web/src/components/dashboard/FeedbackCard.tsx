import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowBigUp, MessageSquare, MoreVertical, Pin } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { cn } from '../../lib/utils';
import { pulseVote } from '../../lib/motion';

export interface FeedbackCardData {
  id: string;
  boardId?: string;
  title: string;
  content: string;
  status: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  hasVoted?: boolean;
}

export interface FeedbackCardProps {
  card: FeedbackCardData;
  onVote: (postId: string) => void;
  onClick?: (card: FeedbackCardData) => void;
}

export function FeedbackCard({ card, onVote, onClick }: FeedbackCardProps) {
  const { t, i18n } = useTranslation();
  const voteBtnRef = React.useRef<HTMLButtonElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [mountedTime] = React.useState(() => Date.now());

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    pulseVote(voteBtnRef.current);
    onVote(card.id);
  };

  const relativeTime = React.useMemo(
    () => new Intl.RelativeTimeFormat(i18n.resolvedLanguage || 'en', { numeric: 'auto' }),
    [i18n.resolvedLanguage]
  );

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffSeconds = (new Date(dateStr).getTime() - mountedTime) / 1000;
      const absolute = Math.abs(diffSeconds);
      if (absolute < 60) return relativeTime.format(Math.round(diffSeconds), 'second');
      if (absolute < 3600) return relativeTime.format(Math.round(diffSeconds / 60), 'minute');
      if (absolute < 86400) return relativeTime.format(Math.round(diffSeconds / 3600), 'hour');
      return relativeTime.format(Math.round(diffSeconds / 86400), 'day');
    } catch {
      return t('dashboard.justNow');
    }
  };

  return (
    <div
      ref={cardRef}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t('feedback.openDiscussion', { title: card.title }) : undefined}
      onClick={() => {
        cardRef.current?.focus({ preventScroll: true });
        onClick?.(card);
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick?.(card);
        }
      }}
      className="kanban-card fp-glass-item fp-feedback-card group relative rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40 dark:hover:border-blue-400/40 cursor-pointer"
    >
      {/* Title & Options */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="line-clamp-1 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
          {card.title}
        </h4>
        <button
          onClick={(e) => e.stopPropagation()}
          className="fp-icon-button fp-icon-rotate rounded-md p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-slate-600 group-hover:opacity-100 dark:hover:text-slate-200"
          aria-label={t('feedback.moreOptions')}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Description Snippet */}
      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {card.content}
      </p>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          {/* Author Avatar */}
          <Avatar
            src={card.authorAvatar}
            alt={card.authorName || t('feedback.member')}
            fallback={card.authorName || t('feedback.memberInitial')}
            size="sm"
            className="h-6 w-6 ring-1 ring-slate-200/80 dark:ring-white/10"
          />

          {/* Upvote Button with pulse */}
          <button
            ref={voteBtnRef}
            onClick={handleVoteClick}
            aria-pressed={card.hasVoted}
            className={cn(
              'fp-vote-button flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold transition-all shadow-2xs',
              card.hasVoted
                ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-500/20 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-500/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-blue-400'
            )}
          >
            <ArrowBigUp className={cn('fp-vote-icon h-4 w-4', card.hasVoted && 'fill-current')} />
            <span>{card.voteCount}</span>
          </button>

          {/* Comments Count */}
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <MessageSquare className="fp-comment-icon h-3.5 w-3.5" />
            <span>{card.commentCount}</span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Pin className="fp-pin-icon h-3 w-3 rotate-45 opacity-60" />
          <span>{formatTimeAgo(card.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
