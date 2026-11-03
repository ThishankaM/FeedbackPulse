import * as React from 'react';
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
}

export function FeedbackCard({ card, onVote }: FeedbackCardProps) {
  const voteBtnRef = React.useRef<HTMLButtonElement>(null);

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    pulseVote(voteBtnRef.current);
    onVote(card.id);
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date().getTime();
      const created = new Date(dateStr).getTime();
      const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '1d ago';
    }
  };

  return (
    <div className="kanban-card group rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900/90 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer">
      {/* Title & Options */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {card.title}
        </h4>
        <button
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity p-0.5 rounded-sm"
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
            alt={card.authorName || 'Author'}
            fallback={card.authorName || 'U'}
            size="sm"
            className="h-6 w-6"
          />

          {/* Upvote Button with pulse */}
          <button
            ref={voteBtnRef}
            onClick={handleVoteClick}
            className={cn(
              'flex items-center gap-1 font-semibold transition-colors px-1.5 py-0.5 rounded-md',
              card.hasVoted
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <ArrowBigUp className={cn('h-4 w-4', card.hasVoted && 'fill-current')} />
            <span>{card.voteCount}</span>
          </button>

          {/* Comments Count */}
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{card.commentCount}</span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Pin className="h-3 w-3 rotate-45 opacity-60" />
          <span>{formatTimeAgo(card.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
