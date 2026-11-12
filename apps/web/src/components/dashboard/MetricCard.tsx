import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { animateCounter, clampDuration } from '../../lib/motion';

export interface MetricCardProps {
  label: string;
  value: number;
  formattedValue?: string;
  delta?: string;
  loading?: boolean;
  isPositive?: boolean;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export function MetricCard({
  label,
  value,
  formattedValue,
  delta,
  loading = false,
  isPositive = true,
  icon: Icon,
  iconBgColor = 'bg-blue-500/10 dark:bg-blue-500/20',
  iconColor = 'text-blue-600 dark:text-blue-400',
}: MetricCardProps) {
  const { i18n } = useTranslation();
  const numberRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (numberRef.current && !loading) {
      const formatter = formattedValue
        ? () => formattedValue
        : (amount: number) => new Intl.NumberFormat(i18n.resolvedLanguage || 'en').format(Math.round(amount));
      animateCounter(numberRef.current, 0, value, clampDuration(400), formatter);
    }
  }, [value, formattedValue, loading, i18n.resolvedLanguage]);

  return (
    <Card className="fp-glass-card fp-metric-card group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/14 dark:bg-slate-950/70 dark:hover:border-white/24">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              ref={numberRef}
              aria-label={loading ? undefined : String(value)}
              className={cn(
                'text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white',
                loading && 'inline-block h-8 w-16 animate-pulse rounded-md bg-slate-200/80 dark:bg-white/10'
              )}
            >
              {loading ? '' : formattedValue || new Intl.NumberFormat(i18n.resolvedLanguage || 'en').format(value)}
            </span>
          </div>

          {delta ? (
            <div className="mt-2 flex items-center gap-1.5" aria-label={delta}>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/15'
                )}
              >
                <ArrowUp className={cn('fp-delta-icon mr-0.5 h-3 w-3 stroke-[2.5]', !isPositive && 'rotate-180')} />
                {delta}
              </span>
            </div>
          ) : null}
        </div>

        {/* Soft rounded icon container with micro-glow */}
        <div
          className={cn(
            'fp-metric-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105',
            iconBgColor
          )}
        >
          <Icon className={cn('h-5 w-5 transition-transform duration-200', iconColor)} />
        </div>
      </div>
    </Card>
  );
}
