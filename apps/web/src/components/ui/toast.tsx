import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastEntry extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => undefined,
  dismiss: () => undefined,
});

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-border bg-card/98 text-foreground',
  success:
    'border-emerald-500/30 bg-emerald-50/95 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/90 dark:text-emerald-100',
  destructive:
    'border-rose-500/30 bg-rose-50/95 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/90 dark:text-rose-100',
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  }
  if (variant === 'destructive') {
    return <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
  }
  return <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
}

/**
 * Provides a lightweight, theme-aware toast notification stack.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);
  const timersRef = React.useRef<Map<string, number>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = 'default', durationMs = 4000 }: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant, durationMs }]);

      if (typeof window !== 'undefined' && durationMs > 0) {
        const timer = window.setTimeout(() => {
          dismiss(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss]
  );

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        >
          {toasts.map((item) => {
            const variant = item.variant ?? 'default';
            return (
              <div
                key={item.id}
                role={variant === 'destructive' ? 'alert' : 'status'}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-xl animate-in slide-in-from-bottom',
                  VARIANT_STYLES[variant]
                )}
              >
                <div className="mt-0.5">
                  <ToastIcon variant={variant} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label={t('common.close')}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/**
 * Returns toast trigger helpers; safe no-op if rendered outside ToastProvider.
 */
export function useToast() {
  return React.useContext(ToastContext);
}
