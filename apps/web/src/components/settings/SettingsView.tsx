import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Info,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Trash2,
  Users,
  UserPlus,
  Crown,
  Shield,
  ShieldAlert,
  User,
  Code2,
  Puzzle,
  Globe,
  Sliders,
  Loader2,
  Palette,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/toast';
import { useAuth } from '../../context/AuthContext';
import { client } from '../../lib/api';
import { canManageActiveWorkspace } from '../../lib/workspace-access';

export interface WorkspaceSettingsProps {
  workspaceSlug: string;
  canManageWorkspace?: boolean;
  authLoading?: boolean;
  isAuthenticated?: boolean;
  onReturnToDashboard?: () => void;
  onOpenAuthModal?: () => void;
  onWorkspaceUpdated?: (newSlug: string) => void;
}

type SettingsTabId = 'general' | 'branding' | 'members' | 'integrations' | 'embed';

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: string;
  joinedAt: string;
}

interface PreviewPost {
  id: string;
  title: string;
  voteCount: number;
}

const BRAND_COLOR_PRESETS = [
  '#4F46E5',
  '#2563EB',
  '#0D9488',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
];

export function SettingsView({
  workspaceSlug,
  canManageWorkspace,
  authLoading,
  isAuthenticated,
  onReturnToDashboard,
  onOpenAuthModal,
  onWorkspaceUpdated,
}: WorkspaceSettingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, memberships, isLoading: contextAuthLoading, refreshUser } = useAuth();

  const effectiveAuthLoading = authLoading ?? contextAuthLoading;
  const effectiveIsAuthenticated = isAuthenticated ?? Boolean(user);
  const effectiveCanManage =
    canManageWorkspace ?? canManageActiveWorkspace(memberships, workspaceSlug);

  const [activeTab, setActiveTab] = React.useState<SettingsTabId>('general');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = React.useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = React.useState<boolean>(false);

  // Form State from DB
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState(workspaceSlug);
  const [description, setDescription] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [primaryColor, setPrimaryColor] = React.useState('#4F46E5');

  // Members list from DB (manager-only)
  const [members, setMembers] = React.useState<MemberItem[]>([]);

  // Real top posts for preview from DB
  const [previewPosts, setPreviewPosts] = React.useState<PreviewPost[]>([]);

  const tabs: Array<{ id: SettingsTabId; label: string }> = [
    { id: 'general', label: t('settings.tabs.general') },
    { id: 'branding', label: t('settings.tabs.branding') },
    { id: 'members', label: t('settings.tabs.members') },
    { id: 'integrations', label: t('settings.tabs.integrations') },
    { id: 'embed', label: t('settings.tabs.embedWidget') },
  ];

  // Fetch workspace, team members, and preview posts only for authorized managers
  const loadData = React.useCallback(async () => {
    if (!effectiveCanManage || !workspaceSlug) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [wsRes, memRes, dashRes] = await Promise.all([
        client.api.workspaces[':slug'].$get({ param: { slug: workspaceSlug } }),
        client.api.workspaces[':slug'].members.$get({ param: { slug: workspaceSlug } }),
        client.api.workspaces[':slug'].dashboard.$get({ param: { slug: workspaceSlug } }),
      ]);

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const ws = (wsData as any).workspace;
        if (ws) {
          setName(ws.name || '');
          setSlug(ws.slug || workspaceSlug);
          setLogoUrl(ws.logoUrl || '');
          setPrimaryColor(ws.primaryColor || '#4F46E5');
          const settingsObj = ws.settings || {};
          setDescription((settingsObj as any).description || '');
        }
      }

      if (memRes.ok) {
        const memData = await memRes.json();
        if (Array.isArray((memData as any).members)) {
          setMembers((memData as any).members);
        }
      } else {
        setMembers([]);
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if ((dashData as any).columns) {
          const allCols = Object.values((dashData as any).columns).flat() as any[];
          const sorted = allCols.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)).slice(0, 2);
          setPreviewPosts(
            sorted.map((p) => ({
              id: p.id,
              title: p.title,
              voteCount: p.voteCount || 0,
            }))
          );
        }
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.loadError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCanManage, workspaceSlug, toast, t]);

  React.useEffect(() => {
    if (!effectiveAuthLoading) {
      void loadData();
    }
  }, [effectiveAuthLoading, loadData]);

  // Handle Save Workspace changes
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!effectiveCanManage) return;
    setIsSaving(true);
    try {
      const res = await client.api.workspaces[':slug'].$patch({
        param: { slug: workspaceSlug },
        json: {
          name,
          slug,
          description,
          logoUrl: logoUrl || '',
          primaryColor,
        },
      });

      if (res.ok) {
        toast({
          title: t('common.success'),
          description: t('settings.saveSuccess'),
        });
        await refreshUser();
        if (slug !== workspaceSlug && onWorkspaceUpdated) {
          onWorkspaceUpdated(slug);
        }
      } else {
        const err = await res.json();
        toast({
          title: t('common.error'),
          description: (err as any).error || t('settings.saveError'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('settings.saveError'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/board/${slug}`;
    void navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: t('common.copied'), description: publicUrl });
  };

  const handleCopySnippet = () => {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const snippet = `<script src="//${host}/widget.js" data-workspace="${slug}"></script>`;
    void navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
    toast({ title: t('common.copied') });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            <Crown className="w-3 h-3" />
            {t('settings.roles.owner')}
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <Shield className="w-3 h-3" />
            {t('settings.roles.admin')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/20">
            <User className="w-3 h-3" />
            {t('settings.roles.member')}
          </span>
        );
    }
  };

  const hostName = typeof window !== 'undefined' ? window.location.host : '';
  const widgetCode = `<script src="//${hostName}/widget.js"\n  data-workspace="${slug}"></script>`;

  if (effectiveAuthLoading && !canManageWorkspace) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!effectiveCanManage) {
    return (
      <div className="w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {t('settings.restricted.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {effectiveIsAuthenticated
              ? t('settings.restricted.description')
              : t('settings.restricted.signInHint')}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {!effectiveIsAuthenticated && onOpenAuthModal && (
              <Button onClick={onOpenAuthModal} className="rounded-xl px-5 font-semibold cursor-pointer">
                {t('nav.signIn')}
              </Button>
            )}
            {onReturnToDashboard && (
              <Button
                variant="outline"
                onClick={onReturnToDashboard}
                className="rounded-xl px-5 font-semibold cursor-pointer"
              >
                {t('settings.restricted.backToDashboard')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const publicPreviewCard = (
    <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-6 flex flex-col justify-between">
      <div>
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {t('settings.preview.title')}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {t('settings.preview.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Simulated Mini Browser Window */}
        <div className="rounded-2xl border border-border/80 bg-background/80 overflow-hidden shadow-md">
          {/* Browser chrome */}
          <div className="px-3 py-2 bg-muted/60 border-b border-border/60 flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80 inline-block" />
            </div>
            <div className="flex-1 px-2.5 py-0.5 rounded-md bg-card/70 border border-border/60 text-[10px] text-muted-foreground font-mono text-center truncate">
              {hostName}/board/{slug}
            </div>
          </div>

          {/* Browser viewport body */}
          <div className="p-3.5 space-y-3">
            {/* Header Banner */}
            <div
              className="p-3 rounded-xl flex items-center gap-2.5 text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #3b82f6 100%)`,
              }}
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-xs uppercase">{name ? name.charAt(0) : 'W'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate leading-none">{name || t('workspace.modalTitle')}</div>
                <div className="text-[10px] text-white/80 mt-0.5 truncate">{t('settings.preview.productFeedback')}</div>
              </div>
            </div>

            {/* Nav tabs mock */}
            <div className="flex items-center gap-2 text-[10px] font-semibold border-b border-border/60 pb-1 px-1">
              <span className="text-primary border-b-2 border-primary pb-1 -mb-1">{t('nav.boards')}</span>
              <span className="text-muted-foreground">{t('nav.roadmap')}</span>
              <span className="text-muted-foreground">{t('nav.changelog')}</span>
            </div>

            {/* Real Posts from DB or clean placeholders */}
            <div className="space-y-1.5">
              {previewPosts.length > 0 ? (
                previewPosts.map((post) => (
                  <div key={post.id} className="p-2 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between">
                    <div className="text-xs font-medium text-foreground/90 truncate flex-1 pr-2">
                      {post.title}
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                      <span>↑</span> {post.voteCount}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30 text-center text-[10px] text-muted-foreground">
                  {t('feedback.empty')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header with Settings Icon and Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t('settings.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      {/* 2. Top Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label={t('settings.title')}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/40"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : activeTab === 'general' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Workspace Information + URL */}
          <Card className="lg:col-span-7 rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-6 flex flex-col justify-between">
            <div>
              <CardHeader className="p-0 pb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      {t('settings.info.title')}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      {t('settings.info.description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    {t('settings.info.nameLabel')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('workspace.namePlaceholder')}
                    required
                    className="rounded-xl bg-background/50 border-border/80 h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    {t('settings.info.slugLabel')} <span className="text-destructive">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder={t('workspace.slugPlaceholder')}
                      required
                      className="rounded-xl bg-background/50 border-border/80 h-10 text-sm pr-40"
                    />
                    <div className="absolute right-3 flex items-center gap-1.5 text-xs text-muted-foreground select-none pointer-events-none">
                      <span>/board/{slug}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground">
                      {t('settings.info.descLabel')}
                    </label>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {description.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 160))}
                    placeholder={t('settings.info.descPlaceholder')}
                    rows={3}
                    className="rounded-xl bg-background/50 border-border/80 text-sm resize-none"
                  />
                </div>

                {/* Public Workspace URL */}
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <div className="text-xs font-bold text-foreground">
                    {t('settings.url.title')}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t('settings.url.description')}
                  </p>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-background/50 border border-border/80">
                    <div className="flex items-center gap-1.5 px-2 flex-1 min-w-0">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground font-mono truncate">
                        /board/{slug}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyUrl}
                      aria-label={t('common.share')}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl px-5 font-semibold text-sm cursor-pointer shadow-sm shadow-primary/20"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('common.save')}...
                      </>
                    ) : (
                      t('settings.info.saveChanges')
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <div className="lg:col-span-5">{publicPreviewCard}</div>
        </div>
      ) : activeTab === 'branding' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <Card className="lg:col-span-7 rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-6 flex flex-col justify-between">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {t('settings.logo.title')}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        {t('settings.logo.hint')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <div className="flex items-center gap-4 py-2">
                  <div
                    className="w-20 h-20 rounded-2xl border border-border/80 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group"
                    style={{
                      background: logoUrl
                        ? undefined
                        : `linear-gradient(135deg, ${primaryColor} 0%, #2563eb 100%)`,
                    }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-black text-2xl uppercase">
                        {name ? name.charAt(0) : 'W'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = prompt(t('settings.logo.promptUrl'), logoUrl);
                        if (url !== null) setLogoUrl(url);
                      }}
                      className="w-full justify-start rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      {t('settings.logo.uploadNew')}
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoUrl('')}
                        className="w-full justify-start rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        {t('settings.logo.remove')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {t('settings.branding.colorLabel')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.branding.colorHint')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {BRAND_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        aria-label={color}
                        style={{ backgroundColor: color }}
                        className={`h-7 w-7 rounded-full transition-all cursor-pointer ${
                          primaryColor.toLowerCase() === color.toLowerCase()
                            ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-xs'
                            : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 w-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                      title={t('workspace.chooseColor')}
                    />
                    <span className="font-mono text-xs text-muted-foreground uppercase">
                      {primaryColor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl px-5 font-semibold text-sm cursor-pointer shadow-sm shadow-primary/20"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.save')}...
                    </>
                  ) : (
                    t('settings.branding.saveChanges')
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <div className="lg:col-span-5">{publicPreviewCard}</div>
        </div>
      ) : activeTab === 'members' ? (
        <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-6">
          <CardHeader className="p-0 pb-5 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  {t('settings.team.title')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('settings.team.description')}
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title={t('settings.team.inviteNotice')}
              className="rounded-xl text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              {t('settings.team.inviteMember')}
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 px-3">{t('settings.team.member')}</th>
                  <th className="pb-3 px-3">{t('settings.team.email')}</th>
                  <th className="pb-3 px-3">{t('settings.team.role')}</th>
                  <th className="pb-3 px-3">{t('settings.team.joined')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">
                      {t('settings.team.noMembers')}
                    </td>
                  </tr>
                ) : (
                  members.map((mem) => {
                    const joinedDate = new Date(mem.joinedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    return (
                      <tr key={mem.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                              {mem.avatarUrl ? (
                                <img src={mem.avatarUrl} alt={mem.name} className="w-full h-full object-cover" />
                              ) : (
                                mem.name?.charAt(0) || 'U'
                              )}
                            </div>
                            <span className="font-semibold text-foreground text-xs sm:text-sm">
                              {mem.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-muted-foreground font-mono">
                          {mem.email}
                        </td>
                        <td className="py-3.5 px-3">{getRoleBadge(mem.role)}</td>
                        <td className="py-3.5 px-3 text-xs text-muted-foreground">
                          {joinedDate}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'integrations' ? (
        <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-6 flex flex-col justify-between max-w-3xl">
          <div>
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Puzzle className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {t('settings.integrations.title')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.integrations.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-3">
              {/* Slack */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                    <span className="font-bold text-xs">#</span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      {t('settings.integrations.slack')}
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20 py-0">
                        {t('settings.integrations.connected')}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t('settings.integrations.slackDesc')}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
                  {t('settings.integrations.configure')}
                </Button>
              </div>

              {/* Discord */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <span className="font-bold text-xs">D</span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-foreground">
                      {t('settings.integrations.discord')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t('settings.integrations.discordDesc')}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
                  {t('settings.integrations.connect')}
                </Button>
              </div>

              {/* GitHub */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-foreground shrink-0">
                    <span className="font-bold text-xs">G</span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-foreground">
                      {t('settings.integrations.github')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t('settings.integrations.githubDesc')}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
                  {t('settings.integrations.connect')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/85 dark:bg-card/65 p-6 flex flex-col justify-between max-w-3xl">
          <div>
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Code2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {t('settings.widget.title')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.widget.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="relative rounded-2xl bg-muted/60 dark:bg-black/40 border border-border/70 p-4 font-mono text-xs text-foreground/90 overflow-x-auto">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {widgetCode}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySnippet}
                className="absolute top-3 right-3 rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    {t('common.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    {t('common.share')}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast({ title: t('settings.widget.customizeNotice') })}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5" />
              {t('settings.widget.customize')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast({ title: t('settings.widget.docs') })}
              className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {t('settings.widget.docs')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
