import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Sparkles, Trash2, Eye, PenLine, Globe, Lock } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Markdown } from '../ui/markdown';
import { useToast } from '../ui/toast';
import { client } from '../../lib/api';

export interface ChangelogEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  initialData?: {
    id?: string;
    title?: string;
    slug?: string;
    content?: string;
    status?: string;
  } | null;
  onSaved: () => void;
}

export function ChangelogEditorModal({
  open,
  onOpenChange,
  workspaceSlug,
  initialData,
  onSaved,
}: ChangelogEditorModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const isEditing = Boolean(initialData?.id);

  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [content, setContent] = React.useState('');
  const [status, setStatus] = React.useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [editorTab, setEditorTab] = React.useState<'write' | 'preview'>('write');
  const [loading, setLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{
    title?: string;
    slug?: string;
    content?: string;
  }>({});

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || '');
        setSlug(initialData.slug || '');
        setContent(initialData.content || '');
        setStatus(initialData.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED');
        setSlugManuallyEdited(true);
      } else {
        setTitle('');
        setSlug('');
        setContent('');
        setStatus('PUBLISHED');
        setSlugManuallyEdited(false);
      }
      setEditorTab('write');
      setError('');
      setFieldErrors({});
      setIsDeleting(false);
    }
  }, [open, initialData]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (fieldErrors.title) {
      setFieldErrors((prev) => ({ ...prev, title: undefined }));
    }
    if (!slugManuallyEdited && !isEditing) {
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

  const changelogSchema = React.useMemo(
    () =>
      z.object({
        title: z
          .string()
          .trim()
          .min(2, t('changelog.editor.titleMin', { defaultValue: 'Title must be at least 2 characters' }))
          .max(255),
        slug: z
          .string()
          .trim()
          .min(2, t('changelog.editor.slugMin', { defaultValue: 'Slug must be at least 2 characters' }))
          .max(150)
          .regex(/^[a-z0-9-]+$/, t('changelog.editor.slugInvalid', { defaultValue: 'Slug must be lowercase alphanumeric with hyphens' })),
        content: z
          .string()
          .trim()
          .min(5, t('changelog.editor.contentMin', { defaultValue: 'Description must be at least 5 characters' })),
        status: z.enum(['PUBLISHED', 'DRAFT']),
      }),
    [t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = changelogSchema.safeParse({
      title,
      slug,
      content,
      status,
    });

    if (!validation.success) {
      const issues = validation.error.format();
      setFieldErrors({
        title: issues.title?._errors[0],
        slug: issues.slug?._errors[0],
        content: issues.content?._errors[0],
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialData?.id) {
        const res = await (client.api.workspaces[':slug'] as any).changelogs[':id'].$patch({
          param: { slug: workspaceSlug, id: initialData.id },
          json: validation.data,
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error || t('changelog.editor.saveError', { defaultValue: 'Failed to update changelog' }));
        }

        toast({
          title: t('changelog.editor.updateSuccess', { defaultValue: 'Changelog updated' }),
          description: validation.data.title,
        });
      } else {
        const res = await (client.api.workspaces[':slug'] as any).changelogs.$post({
          param: { slug: workspaceSlug },
          json: validation.data,
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error || t('changelog.editor.saveError', { defaultValue: 'Failed to create changelog' }));
        }

        toast({
          title: t('changelog.editor.createSuccess', { defaultValue: 'Changelog published' }),
          description: validation.data.title,
        });
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || t('changelog.editor.saveError', { defaultValue: 'Failed to save changelog' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm(t('changelog.editor.deleteConfirm', { defaultValue: 'Are you sure you want to delete this changelog entry?' }))) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await (client.api.workspaces[':slug'] as any).changelogs[':id'].$delete({
        param: { slug: workspaceSlug, id: initialData.id },
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || t('changelog.editor.deleteError', { defaultValue: 'Failed to delete changelog' }));
      }

      toast({
        title: t('changelog.editor.deleteSuccess', { defaultValue: 'Changelog deleted' }),
      });

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || t('changelog.editor.deleteError', { defaultValue: 'Failed to delete changelog' }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-2xl w-full">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEditing
                  ? t('changelog.editor.editTitle', { defaultValue: 'Edit Changelog Release' })
                  : t('changelog.editor.newTitle', { defaultValue: 'Publish New Release' })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t('changelog.editor.description', { defaultValue: 'Share updates, new features, improvements, and fixes with your users.' })}
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
          {/* Title */}
          <div>
            <label htmlFor="changelog-title-input" className="block text-xs font-semibold text-foreground mb-1.5">
              {t('changelog.editor.titleLabel', { defaultValue: 'Title' })} *
            </label>
            <Input
              id="changelog-title-input"
              value={title}
              onChange={handleTitleChange}
              placeholder={t('changelog.editor.titlePlaceholder', { defaultValue: 'e.g. v2.1 — Dark Mode & Real-time Voting' })}
              autoFocus
              className={fieldErrors.title ? 'border-destructive' : ''}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-[11px] font-medium text-destructive">{fieldErrors.title}</p>
            )}
          </div>

          {/* Slug & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="changelog-slug-input" className="block text-xs font-semibold text-foreground mb-1.5">
                {t('changelog.editor.slugLabel', { defaultValue: 'URL Slug' })} *
              </label>
              <Input
                id="changelog-slug-input"
                value={slug}
                onChange={handleSlugChange}
                placeholder="v2-1-dark-mode"
                className={fieldErrors.slug ? 'border-destructive font-mono text-xs' : 'font-mono text-xs'}
              />
              {fieldErrors.slug && (
                <p className="mt-1 text-[11px] font-medium text-destructive">{fieldErrors.slug}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                {t('changelog.editor.statusLabel', { defaultValue: 'Status' })}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('PUBLISHED')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all cursor-pointer ${
                    status === 'PUBLISHED'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border/70 bg-card/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{t('changelog.editor.statusPublished', { defaultValue: 'Published' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('DRAFT')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all cursor-pointer ${
                    status === 'DRAFT'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'border-border/70 bg-card/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{t('changelog.editor.statusDraft', { defaultValue: 'Draft' })}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Markdown Area with Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-foreground">
                {t('changelog.editor.contentLabel', { defaultValue: 'Release Notes (Markdown)' })} *
              </label>
              <div className="flex items-center gap-1 border border-border/70 rounded-lg p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setEditorTab('write')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    editorTab === 'write' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PenLine className="h-3 w-3" />
                  <span>{t('feedback.writeTab', { defaultValue: 'Write' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    editorTab === 'preview' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>{t('feedback.previewTab', { defaultValue: 'Preview' })}</span>
                </button>
              </div>
            </div>

            {editorTab === 'write' ? (
              <Textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (fieldErrors.content) {
                    setFieldErrors((prev) => ({ ...prev, content: undefined }));
                  }
                }}
                placeholder={t('changelog.editor.contentPlaceholder', {
                  defaultValue: 'Describe what changed in this release...\n\n- New dark theme option\n- Faster response times\n- Resolved edge cases',
                })}
                rows={7}
                className={fieldErrors.content ? 'border-destructive text-xs font-mono' : 'text-xs font-mono'}
              />
            ) : (
              <div className="min-h-[168px] rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
                {content.trim() ? (
                  <Markdown content={content} />
                ) : (
                  <p className="text-muted-foreground italic">
                    {t('feedback.previewEmpty', { defaultValue: 'Nothing to preview yet. Write your description using Markdown.' })}
                  </p>
                )}
              </div>
            )}
            {fieldErrors.content && (
              <p className="mt-1 text-[11px] font-medium text-destructive">{fieldErrors.content}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2 sm:justify-between">
          <div>
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={loading || isDeleting}
                className="text-destructive hover:bg-destructive/10 text-xs rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                <span>{t('common.delete')}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading || isDeleting}
              className="rounded-xl text-xs"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || isDeleting || !title.trim() || !slug.trim() || !content.trim()}
              className="rounded-xl text-xs font-semibold"
            >
              {loading
                ? t('common.saving', { defaultValue: 'Saving...' })
                : isEditing
                ? t('changelog.editor.updateButton', { defaultValue: 'Save Changes' })
                : t('changelog.editor.publishButton', { defaultValue: 'Publish Release' })}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
