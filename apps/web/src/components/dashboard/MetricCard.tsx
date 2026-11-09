import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { animateCounter } from '../../lib/motion';

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
      animateCounter(numberRef.current, 0, value, 900, formatter);
    }
  }, [value, formattedValue, loading, i18n.resolvedLanguage]);

  return (
    <Card className="fp-glass-card fp-metric-card p-6 transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start gap-4">
        {/* Soft rounded icon container */}
        <div
          className={cn(
            'fp-metric-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            iconBgColor
          )}
        >
          <Icon className={cn('h-6 w-6 transition-transform duration-200', iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              ref={numberRef}
              aria-label={loading ? undefined : String(value)}
              className={cn(
                'text-2xl font-bold tracking-tight text-slate-900 dark:text-white',
                loading && 'inline-block h-7 w-14 animate-pulse rounded-md bg-slate-200/80 dark:bg-white/10'
              )}
            >
              {loading ? '' : formattedValue || new Intl.NumberFormat(i18n.resolvedLanguage || 'en').format(value)}
            </span>
          </div>

          {delta ? (
            <div className="mt-1.5 flex items-center gap-1" aria-label={delta}>
              <span
                className={cn(
                  'flex items-center text-xs font-semibold',
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                )}
              >
                <ArrowUp className="fp-delta-icon mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                {delta}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
