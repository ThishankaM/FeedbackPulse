import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { client } from '../../lib/api';

export interface NewFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  boards: Array<{ id: string; name: string }>;
  onFeedbackCreated: () => void;
}

export function NewFeedbackModal({
  open,
  onOpenChange,
  workspaceId,
  boards,
  onFeedbackCreated,
}: NewFeedbackModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [boardId, setBoardId] = React.useState(boards[0]?.id || '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (boards.length > 0 && !boardId) {
      setBoardId(boards[0].id);
    }
  }, [boards, boardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await client.api.posts.$post({
        json: {
          workspaceId,
          boardId: boardId || boards[0]?.id,
          title: title.trim(),
          content: content.trim(),
          status: 'UNDER_REVIEW',
        },
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        onOpenChange(false);
        onFeedbackCreated();
      } else {
        const data = await res.json();
        setError((data as any).error || t('dashboard.errorMessage'));
      }
    } catch (err: any) {
      setError(err.message || t('dashboard.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t('dashboard.createFeedbackTitle')}</DialogTitle>
        <DialogDescription>{t('dashboard.createFeedbackDesc')}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('feedback.titleLabel')}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('feedback.titlePlaceholder')}
            required
            autoFocus
          />
        </div>

        {boards.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('dashboard.boardLabel')}
            </label>
            <select
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('feedback.contentLabel')}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('feedback.contentPlaceholder')}
            rows={4}
            required
            className="flex w-full rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading || !title || !content}>
            {loading ? t('dashboard.submitting') : t('dashboard.submitButton')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
