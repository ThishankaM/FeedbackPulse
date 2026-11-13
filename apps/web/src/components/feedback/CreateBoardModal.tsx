import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { LayoutGrid, Globe, Lock } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/toast';
import { client } from '../../lib/api';

export interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  onBoardCreated: (board: { id: string; name: string; slug: string }) => void;
}

export function CreateBoardModal({
  open,
  onOpenChange,
  workspaceSlug,
  onBoardCreated,
}: CreateBoardModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    slug?: string;
  }>({});

  React.useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setDescription('');
      setIsPublic(true);
      setSlugManuallyEdited(false);
      setError('');
      setFieldErrors({});
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
      if (fieldErrors.slug) {
        setFieldErrors((prev) => ({ ...prev, slug: undefined }));
      }
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setSlug(e.target.value);
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: undefined }));
    }
  };

  const boardSchema = React.useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, t('feedback.boardNameMin', { defaultValue: 'Name must be at least 2 characters' }))
          .max(255),
        slug: z
          .string()
          .trim()
          .min(2, t('feedback.boardSlugMin', { defaultValue: 'Slug must be at least 2 characters' }))
          .max(100)
          .regex(/^[a-z0-9-]+$/, t('feedback.boardSlugInvalid', { defaultValue: 'Slug must be lowercase alphanumeric with hyphens' })),
        description: z.string().trim().max(500).optional(),
        isPublic: z.boolean(),
      }),
    [t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = boardSchema.safeParse({
      name,
      slug,
      description: description || undefined,
      isPublic,
    });

    if (!validation.success) {
      const issues = validation.error.format();
      setFieldErrors({
        name: issues.name?._errors[0],
        slug: issues.slug?._errors[0],
      });
      return;
    }

    setLoading(true);

    try {
      const res = await client.api.workspaces[':slug'].boards.$post({
        param: { slug: workspaceSlug },
        json: validation.data,
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || t('feedback.boardCreateError'));
      }

      const data = (await res.json()) as { board: { id: string; name: string; slug: string } };

      toast({
        title: t('feedback.boardCreatedSuccess'),
        description: data.board.name,
      });

      onBoardCreated(data.board);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || t('feedback.boardCreateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t('feedback.createBoardTitle')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t('feedback.createBoardDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Board Name */}
          <div>
            <label
              htmlFor="board-name-input"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              {t('feedback.boardNameLabel')} *
            </label>
            <Input
              id="board-name-input"
              value={name}
              onChange={handleNameChange}
              placeholder={t('feedback.boardNamePlaceholder')}
              autoFocus
              className={fieldErrors.name ? 'border-destructive' : ''}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-[11px] font-medium text-destructive">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Board Slug */}
          <div>
            <label
              htmlFor="board-slug-input"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              {t('feedback.boardSlugLabel')} *
            </label>
            <div className="relative">
              <Input
                id="board-slug-input"
                value={slug}
                onChange={handleSlugChange}
                placeholder={t('feedback.boardSlugPlaceholder')}
                className={fieldErrors.slug ? 'border-destructive font-mono' : 'font-mono'}
              />
            </div>
            {fieldErrors.slug && (
              <p className="mt-1 text-[11px] font-medium text-destructive">
                {fieldErrors.slug}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="board-desc-input"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              {t('feedback.boardDescLabel')}
            </label>
            <Textarea
              id="board-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('feedback.boardDescPlaceholder')}
              rows={2}
            />
          </div>

          {/* Visibility / Public Toggle */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground shrink-0">
                {isPublic ? (
                  <Globe className="h-4 w-4 text-primary" />
                ) : (
                  <Lock className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {t('feedback.boardPublicLabel')}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {t('feedback.boardPublicHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isPublic ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isPublic ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
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
            disabled={loading || !name.trim() || !slug.trim()}
            className="rounded-xl"
          >
            {loading ? t('feedback.creatingBoard') : t('feedback.createBoard')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
