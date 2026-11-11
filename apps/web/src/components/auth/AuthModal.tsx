import * as React from 'react';
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User } from '../../context/AuthContext';
import { client } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import './auth.css';

export type AuthMode = 'login' | 'register';
export type SocialProvider = 'Google' | 'Apple';

export interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onAuthenticated: (token: string, user: User) => void;
}

function GoogleIcon() {
  return (
    <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.07 12c0-.65.11-1.27.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.82 1.48l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.74 9.39 5.98 12 5.98Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.05 12.54c.02-2.04 1.67-3.02 1.75-3.07a3.76 3.76 0 0 0-2.96-1.6c-1.26-.13-2.46.74-3.1.74-.64 0-1.62-.72-2.67-.7a3.93 3.93 0 0 0-3.31 2.02c-1.41 2.44-.36 6.05 1.02 8.03.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.61-.65 1.21 0 1.56.65 2.63.63 1.09-.02 1.78-.99 2.44-1.97a8.05 8.05 0 0 0 1.11-2.28 3.52 3.52 0 0 1-2.04-3.17ZM15.06 6.45a3.57 3.57 0 0 0 .82-2.56 3.63 3.63 0 0 0-2.35 1.22 3.4 3.4 0 0 0-.84 2.47 3 3 0 0 0 2.37-1.13Z" />
    </svg>
  );
}

const providers: Array<{ name: SocialProvider; icon: React.ReactNode }> = [
  { name: 'Google', icon: <GoogleIcon /> },
  { name: 'Apple', icon: <AppleIcon /> },
];

export function AuthModal({
  open,
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [socialNotice, setSocialNotice] = React.useState<string | null>(null);
  const firstFieldRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => clearTimeout(focusTimer);
  }, [open, mode]);

  const switchMode = (nextMode: AuthMode) => {
    setError(null);
    setSocialNotice(null);
    onModeChange(nextMode);
  };

  const handleSocialSignIn = (provider: SocialProvider) => {
    const providerUrls: Record<SocialProvider, string | undefined> = {
      Google: import.meta.env.VITE_GOOGLE_AUTH_URL,
      Apple: import.meta.env.VITE_APPLE_AUTH_URL,
    };

    if (providerUrls[provider]) {
      window.location.assign(providerUrls[provider]);
      return;
    }

    setError(null);
    setSocialNotice(t('auth.socialUnavailable', { provider }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSocialNotice(null);

    try {
      const response =
        mode === 'register'
          ? await client.api.auth.register.$post({
              json: {
                email: email.trim(),
                password,
                name: name.trim() || undefined,
              },
            })
          : await client.api.auth.login.$post({
              json: {
                email: email.trim(),
                password,
              },
            });

      if (response.ok) {
        const data = await response.json();
        setPassword('');
        onAuthenticated(data.token, data.user);
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        payload?.error ||
          (mode === 'login' ? t('auth.loginError') : t('auth.registerError'))
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t('auth.loginError')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="auth-glass auth-modal-enter auth-scrollbar relative w-full max-w-[480px] rounded-[24px] border border-white/60 dark:border-white/10 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <DialogHeader className="auth-form-enter text-center sm:text-center space-y-1.5 pb-1">
          <DialogTitle
            id="auth-modal-title"
            className="text-[24px] sm:text-[28px] font-bold tracking-tight text-foreground"
          >
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            {mode === 'login' ? t('auth.loginDesc') : t('auth.registerDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch for Login / Register */}
        <Tabs
          value={mode}
          onValueChange={(val) => switchMode(val as AuthMode)}
          className="w-full mt-2 mb-3"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
            <TabsTrigger
              value="login"
              className="rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              {t('auth.topCtaLogin')}
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              {t('auth.topCtaSignup')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {socialNotice && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-left text-xs leading-relaxed text-primary">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>{socialNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-left text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Social Providers */}
        <div className="grid gap-2 mb-3">
          {providers.map((provider) => (
            <button
              key={provider.name}
              type="button"
              data-provider={provider.name.toLowerCase()}
              onClick={() => handleSocialSignIn(provider.name)}
              className="flex h-10 sm:h-10.5 items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-card/60 px-3 text-xs sm:text-sm font-semibold text-foreground shadow-2xs backdrop-blur-md transition-all hover:bg-accent cursor-pointer"
            >
              {provider.icon}
              <span className="truncate">
                {t(mode === 'login' ? 'auth.loginWith' : 'auth.signupWith', {
                  provider: provider.name,
                })}
              </span>
            </button>
          ))}
        </div>

        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-border/80" />
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('auth.or')}
          </span>
          <span className="h-px flex-1 bg-border/80" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <label className="block text-left">
              <span className="mb-1 block text-xs sm:text-[13px] font-medium text-foreground">
                {t('auth.nameLabel')}
              </span>
              <span className="relative block">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={firstFieldRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  autoComplete="name"
                  className="glass-input h-10 sm:h-10.5 w-full rounded-xl pl-10 pr-3 text-xs sm:text-sm font-medium"
                />
              </span>
            </label>
          )}

          <label className="block text-left">
            <span className="mb-1 block text-xs sm:text-[13px] font-medium text-foreground">
              {t('auth.workEmail')}
            </span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={mode === 'login' ? firstFieldRef : undefined}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.workEmailPlaceholder')}
                autoComplete="email"
                required
                className="glass-input h-10 sm:h-10.5 w-full rounded-xl pl-10 pr-3 text-xs sm:text-sm font-medium"
              />
            </span>
          </label>

          <label className="block text-left">
            <span className="mb-1 flex items-center justify-between text-xs sm:text-[13px] font-medium text-foreground">
              {t('auth.passwordLabel')}
              {mode === 'login' && (
                <a
                  href="mailto:support@feedbackpulse.dev?subject=Password%20reset"
                  className="text-xs sm:text-[13px] font-medium text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </a>
              )}
            </span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
                className="glass-input h-10 sm:h-10.5 w-full rounded-xl pl-10 pr-10 text-xs sm:text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10.5 sm:h-11 w-full rounded-xl bg-primary text-xs sm:text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="auth-logo-orbit mr-2 grid size-5 place-items-center rounded-md bg-white/20">
                  <Activity className="size-3.5 animate-spin" />
                </span>
                {mode === 'login' ? t('auth.loggingIn') : t('auth.registering')}
              </>
            ) : (
              <>
                {mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-3.5 text-center text-xs sm:text-sm text-muted-foreground">
          {mode === 'login' ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}{' '}
          <button
            type="button"
            data-auth-switch
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="font-semibold text-primary hover:underline cursor-pointer"
          >
            {mode === 'login' ? t('auth.topCtaSignup') : t('auth.topCtaLogin')}
          </button>
        </div>

        {mode === 'register' && (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            {t('auth.termsPrefix')}{' '}
            <a href="#" className="underline hover:text-primary">{t('auth.terms')}</a>{' '}
            {t('auth.and')}{' '}
            <a href="#" className="underline hover:text-primary">{t('auth.privacyPolicy')}</a>.
          </p>
        )}

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {t('auth.cantLogIn')}{' '}
          <a
            href="mailto:support@feedbackpulse.dev"
            className="font-semibold text-primary hover:underline"
          >
            {t('auth.contactSupport')}
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
