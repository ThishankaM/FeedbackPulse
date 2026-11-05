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
      const diffSeconds = (new Date(dateStr).getTime() - Date.now()) / 1000;
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
      className="kanban-card fp-glass-item fp-feedback-card group rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-4 transition-all cursor-pointer"
    >
      {/* Title & Options */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {card.title}
        </h4>
        <button
          onClick={(e) => e.stopPropagation()}
          className="fp-icon-button fp-icon-rotate opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity p-0.5 rounded-sm"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Description Snippet */}
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
        {card.content}
      </p>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          {/* Author Avatar */}
          <Avatar
            src={card.authorAvatar}
            alt={card.authorName || t('feedback.member')}
            fallback={card.authorName || 'U'}
            size="sm"
            className="h-6 w-6"
          />

          {/* Upvote Button with pulse */}
          <button
            ref={voteBtnRef}
            onClick={handleVoteClick}
            className={cn(
              'fp-vote-button flex items-center gap-1 font-semibold transition-colors px-1.5 py-0.5 rounded-md',
              card.hasVoted
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#1c1c20]'
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
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Pin className="fp-pin-icon h-3 w-3 rotate-45 opacity-60" />
          <span>{formatTimeAgo(card.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
