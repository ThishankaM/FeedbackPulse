import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Markdown } from '../ui/markdown';
import { useToast } from '../ui/toast';
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
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [selectedBoardId, setSelectedBoardId] = React.useState('');
  const [editorTab, setEditorTab] = React.useState<'write' | 'preview'>('write');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{
    title?: string;
    content?: string;
    boardId?: string;
  }>({});

  const boardId = selectedBoardId || boards[0]?.id || '';

  const feedbackSchema = React.useMemo(
    () =>
      z.object({
        title: z
          .string()
          .trim()
          .min(3, t('feedback.validation.titleMin'))
          .max(255, t('feedback.validation.titleMax')),
        content: z
          .string()
          .trim()
          .min(10, t('feedback.validation.contentMin')),
        boardId: z.string().uuid(t('feedback.validation.boardRequired')),
      }),
    [t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const parsed = feedbackSchema.safeParse({ title, content, boardId });
    if (!parsed.success) {
      const nextErrors: { title?: string; content?: string; boardId?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'title' && !nextErrors.title) nextErrors.title = issue.message;
        if (key === 'content' && !nextErrors.content) nextErrors.content = issue.message;
        if (key === 'boardId' && !nextErrors.boardId) nextErrors.boardId = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await client.api.boards[':boardId'].posts.$post({
        param: { boardId: parsed.data.boardId },
        json: {
          title: parsed.data.title,
          content: parsed.data.content,
          status: 'UNDER_REVIEW',
        },
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setSelectedBoardId('');
        setEditorTab('write');
        setFieldErrors({});
        onOpenChange(false);
        onFeedbackCreated();
        toast({
          title: t('feedback.submitSuccess'),
          description: t('feedback.submitSuccessDesc'),
          variant: 'success',
        });
      } else {
        const data = await res.json();
        setError((data as { error?: string }).error || t('dashboard.errorMessage'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  // Ensure workspaceId remains part of modal props contract
  void workspaceId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t('dashboard.createFeedbackTitle')}</DialogTitle>
        <DialogDescription>{t('dashboard.createFeedbackDesc')}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="feedback-title-input"
            className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t('feedback.titleLabel')}
          </label>
          <Input
            id="feedback-title-input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) {
                setFieldErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
            placeholder={t('feedback.titlePlaceholder')}
            aria-invalid={Boolean(fieldErrors.title)}
            autoFocus
            className="rounded-xl border-slate-200/80 bg-white/70 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
          />
          {fieldErrors.title && (
            <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {boards.length > 1 && (
          <div>
            <label
              htmlFor="feedback-board-select"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {t('dashboard.boardLabel')}
            </label>
            <select
              id="feedback-board-select"
              value={boardId}
              onChange={(e) => {
                setSelectedBoardId(e.target.value);
                if (fieldErrors.boardId) {
                  setFieldErrors((prev) => ({ ...prev, boardId: undefined }));
                }
              }}
              className="flex h-10 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-1 text-sm shadow-xs backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900 dark:text-white">
                  {b.name}
                </option>
              ))}
            </select>
            {fieldErrors.boardId && (
              <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.boardId}
              </p>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="feedback-content-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {t('feedback.contentLabel')}
            </label>
          </div>

          <Tabs
            value={editorTab}
            onValueChange={(next) => setEditorTab(next === 'preview' ? 'preview' : 'write')}
          >
            <TabsList className="h-8 rounded-lg p-0.5">
              <TabsTrigger value="write" className="h-7 px-2.5 text-xs">
                {t('feedback.writeTab')}
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-2.5 text-xs">
                {t('feedback.previewTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="mt-2">
              <Textarea
                id="feedback-content-input"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (fieldErrors.content) {
                    setFieldErrors((prev) => ({ ...prev, content: undefined }));
                  }
                }}
                placeholder={t('feedback.contentPlaceholder')}
                aria-invalid={Boolean(fieldErrors.content)}
                rows={4}
                className="rounded-xl border-slate-200/80 bg-white/70 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-2">
              <div className="min-h-[104px] rounded-xl border border-slate-200/80 bg-white/70 p-3 text-slate-700 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                {content.trim() ? (
                  <Markdown content={content} />
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    {t('feedback.previewEmpty')}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {fieldErrors.content && (
            <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.content}
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {loading ? t('dashboard.submitting') : t('dashboard.submitButton')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
