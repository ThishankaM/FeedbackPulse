import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import './auth.css';

type AuthMode = 'login' | 'register';
type SocialProvider = 'Google' | 'Apple';

export interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onAuthenticated: (token: string, user: User) => void;
}

function GoogleIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.07 12c0-.65.11-1.27.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.82 1.48l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.74 9.39 5.98 12 5.98Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.05 12.54c.02-2.04 1.67-3.02 1.75-3.07a3.76 3.76 0 0 0-2.96-1.6c-1.26-.13-2.46.74-3.1.74-.64 0-1.62-.72-2.67-.7a3.93 3.93 0 0 0-3.31 2.02c-1.41 2.44-.36 6.05 1.02 8.03.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.61-.65 1.21 0 1.56.65 2.63.63 1.09-.02 1.78-.99 2.44-1.97a8.05 8.05 0 0 0 1.11-2.28 3.52 3.52 0 0 1-2.04-3.17ZM15.06 6.45a3.57 3.57 0 0 0 .82-2.56 3.63 3.63 0 0 0-2.35 1.22 3.4 3.4 0 0 0-.84 2.47 3 3 0 0 0 2.37-1.13Z" />
    </svg>
  );
}

const providers: Array<{ name: SocialProvider; icon: React.ReactNode }> = [
  { name: 'Google', icon: <GoogleIcon /> },
  { name: 'Apple', icon: <AppleIcon /> },
];

export default function AuthModal({
  open,
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 120);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

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
      const response = mode === 'register'
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

      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setError(payload?.error || (mode === 'login' ? t('auth.loginError') : t('auth.registerError')));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('auth.loginError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#eef0f4]/62 p-3 backdrop-blur-[18px] sm:p-6 dark:bg-[#08080a]/72"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="pointer-events-none absolute left-[12%] top-[8%] size-80 rounded-full bg-[#6f93ff]/18 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[5%] right-[10%] size-96 rounded-full bg-[#ff9568]/12 blur-[120px]" />

      <div
        className="auth-glass auth-modal-enter relative w-full max-w-[520px] rounded-[24px] px-5 py-5 sm:px-7 sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div key={mode} className="auth-form-enter mt-1 text-center">
          <h1
            id="auth-modal-title"
            className="mx-auto max-w-[420px] text-[28px] font-bold leading-[1.08] tracking-[-0.05em] text-[#161618] dark:text-white sm:text-[34px]"
          >
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          <p className="mx-auto mt-2 max-w-[390px] text-[11px] font-medium leading-[1.55] text-[#77777e] dark:text-white/48">
            {mode === 'login' ? t('auth.loginDesc') : t('auth.registerDesc')}
          </p>
        </div>

        {socialNotice && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#0d44e8]/15 bg-[#0d44e8]/[0.06] p-2.5 text-left text-[10px] font-medium leading-relaxed text-[#315dbe] dark:border-[#8aa5ff]/20 dark:bg-[#8aa5ff]/10 dark:text-[#a8bcff]">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {socialNotice}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[0.07] p-2.5 text-left text-[10px] font-medium text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-2">
          {providers.map((provider) => (
            <button
              key={provider.name}
              type="button"
              data-provider={provider.name.toLowerCase()}
              onClick={() => handleSocialSignIn(provider.name)}
              className="flex h-10 items-center justify-center gap-2.5 rounded-lg border border-black/[0.1] bg-white/55 text-[11px] font-semibold text-[#313137] shadow-[0_1px_2px_rgba(22,22,24,0.03)] backdrop-blur transition-colors hover:bg-white dark:border-white/12 dark:bg-white/[0.06] dark:text-white/78 dark:hover:bg-white/10"
            >
              {provider.icon}
              {t(mode === 'login' ? 'auth.loginWith' : 'auth.signupWith', {
                provider: provider.name,
              })}
            </button>
          ))}
        </div>

        <div className="my-4 flex items-center gap-4">
          <span className="h-px flex-1 bg-black/[0.11] dark:bg-white/12" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8d8d93] dark:text-white/38">
            {t('auth.or')}
          </span>
          <span className="h-px flex-1 bg-black/[0.11] dark:bg-white/12" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <label className="block text-left">
              <span className="mb-1 block text-[10px] font-semibold text-[#3f3f45] dark:text-white/68">
                {t('auth.nameLabel')}
              </span>
              <span className="relative block">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#96969c]" />
                <input
                  ref={firstFieldRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  autoComplete="name"
                  className="h-10 w-full rounded-lg border border-black/[0.16] bg-white/55 pl-10 pr-3 text-[12px] font-medium text-[#161618] outline-none backdrop-blur transition focus:border-[#0d44e8]/60 focus:bg-white focus:ring-4 focus:ring-[#0d44e8]/10 dark:border-white/14 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/28 dark:focus:border-[#8aa5ff]/60 dark:focus:bg-white/[0.09]"
                />
              </span>
            </label>
          )}

          <label className="block text-left">
            <span className="mb-1 block text-[10px] font-semibold text-[#3f3f45] dark:text-white/68">
              {t('auth.workEmail')}
            </span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#96969c]" />
              <input
                ref={mode === 'login' ? firstFieldRef : undefined}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.workEmailPlaceholder')}
                autoComplete="email"
                required
                className="h-10 w-full rounded-lg border border-black/[0.16] bg-white/55 pl-10 pr-3 text-[12px] font-medium text-[#161618] outline-none backdrop-blur transition focus:border-[#0d44e8]/60 focus:bg-white focus:ring-4 focus:ring-[#0d44e8]/10 dark:border-white/14 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/28 dark:focus:border-[#8aa5ff]/60 dark:focus:bg-white/[0.09]"
              />
            </span>
          </label>

          <label className="block text-left">
            <span className="mb-1 flex items-center justify-between text-[10px] font-semibold text-[#3f3f45] dark:text-white/68">
              {t('auth.passwordLabel')}
              {mode === 'login' && (
                <a
                  href="mailto:support@feedbackpulse.dev?subject=Password%20reset"
                  className="text-[10px] font-semibold text-[#0d44e8] hover:underline dark:text-[#8aa5ff]"
                >
                  {t('auth.forgotPassword')}
                </a>
              )}
            </span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#96969c]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
                className="h-10 w-full rounded-lg border border-black/[0.16] bg-white/55 pl-10 pr-10 text-[12px] font-medium text-[#161618] outline-none backdrop-blur transition focus:border-[#0d44e8]/60 focus:bg-white focus:ring-4 focus:ring-[#0d44e8]/10 dark:border-white/14 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/28 dark:focus:border-[#8aa5ff]/60 dark:focus:bg-white/[0.09]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[#8d8d93] transition-colors hover:bg-black/[0.05] hover:text-[#161618] dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg bg-[#0d44e8] text-[11px] font-bold text-white shadow-[0_9px_20px_-10px_rgba(13,68,232,0.75)] hover:bg-[#0836c4] dark:bg-[#7393ff] dark:text-[#0c1020] dark:hover:bg-[#8aa5ff]"
          >
            {isSubmitting ? (
              <>
                <span className="auth-logo-orbit mr-2 grid size-5 place-items-center rounded-md bg-white/15">
                  <Activity className="size-3" />
                </span>
                {mode === 'login' ? t('auth.loggingIn') : t('auth.registering')}
              </>
            ) : (
              <>
                {mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
                <ArrowRight className="ml-2 size-3.5" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            data-auth-switch
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-[10px] font-semibold text-[#0d44e8] hover:underline dark:text-[#8aa5ff]"
          >
            {mode === 'login' ? t('auth.topCtaSignup') : t('auth.topCtaLogin')}
          </button>
        </div>

        {mode === 'register' && (
          <p className="mt-3 text-center text-[8px] leading-relaxed text-[#96969c] dark:text-white/32">
            {t('auth.termsPrefix')}{' '}
            <a href="#" className="underline hover:text-[#0d44e8] dark:hover:text-[#8aa5ff]">{t('auth.terms')}</a>{' '}
            {t('auth.and')}{' '}
            <a href="#" className="underline hover:text-[#0d44e8] dark:hover:text-[#8aa5ff]">{t('auth.privacyPolicy')}</a>.
          </p>
        )}

        <p className="mt-3 text-center text-[9px] font-medium text-[#898990] dark:text-white/35">
          {t('auth.cantLogIn')}{' '}
          <a
            href="mailto:support@feedbackpulse.dev"
            className="font-semibold text-[#0d44e8] hover:underline dark:text-[#8aa5ff]"
          >
            {t('auth.contactSupport')}
          </a>
        </p>
      </div>
    </div>,
    document.body
  );
}
