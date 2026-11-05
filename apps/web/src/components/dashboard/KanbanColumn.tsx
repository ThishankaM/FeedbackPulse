import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, CheckCircle2, Clock, PlayCircle, Eye } from 'lucide-react';
import { FeedbackCard, type FeedbackCardData } from './FeedbackCard';
import { staggerCards } from '../../lib/motion';

export interface KanbanColumnProps {
  statusKey: string;
  title: string;
  count: number;
  cards: FeedbackCardData[];
  onVote: (postId: string) => void;
  onCardClick?: (card: FeedbackCardData) => void;
  accentColor?: string;
}

export function KanbanColumn({
  statusKey,
  title,
  count,
  cards,
  onVote,
  onCardClick,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const columnRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (columnRef.current) {
      const cardEls = columnRef.current.querySelectorAll<HTMLElement>('.kanban-card');
      if (cardEls.length > 0) {
        staggerCards(Array.from(cardEls));
      }
    }
  }, [cards.length]);

  const getStatusIcon = (key: string) => {
    switch (key) {
      case 'UNDER_REVIEW':
        return <div className="fp-status-dot h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-500/20" />;
      case 'PLANNED':
        return <Clock className="fp-status-icon h-3.5 w-3.5 text-sky-500" />;
      case 'IN_PROGRESS':
        return <PlayCircle className="fp-status-icon h-3.5 w-3.5 text-indigo-500" />;
      case 'COMPLETED':
        return <CheckCircle2 className="fp-status-icon h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Eye className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      ref={columnRef}
      className="fp-glass-column fp-kanban-column flex flex-col rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800/60 min-w-[220px] w-full flex-1"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 pb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(statusKey)}
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-0.5">
            {count}
          </span>
        </div>

        <button
          aria-label={t('feedback.moreOptions')}
          className="fp-icon-button fp-icon-rotate text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-340px)] pr-0.5">
        {cards.length > 0 ? (
          cards.map((card) => (
            <FeedbackCard
              key={card.id}
              card={card}
              onVote={onVote}
              onClick={onCardClick}
            />
          ))
        ) : (
          <div className="fp-empty-state flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-white/[0.03]">
            <p className="text-xs text-slate-400">{t('dashboard.emptyColumn')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
