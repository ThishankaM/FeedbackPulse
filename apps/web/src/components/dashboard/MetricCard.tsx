import * as React from 'react';
import { ArrowUp, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { animateCounter } from '../../lib/motion';

export interface MetricCardProps {
  label: string;
  value: number;
  formattedValue?: string;
  delta: string;
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
  isPositive = true,
  icon: Icon,
  iconBgColor = 'bg-blue-500/10 dark:bg-blue-500/20',
  iconColor = 'text-blue-600 dark:text-blue-400',
}: MetricCardProps) {
  const numberRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (numberRef.current) {
      if (formattedValue) {
        // If string like "24.8K", animate linearly or set directly
        animateCounter(numberRef.current, 0, value, 900, () => formattedValue);
      } else {
        animateCounter(numberRef.current, 0, value, 900);
      }
    }
  }, [value, formattedValue]);

  return (
    <Card className="p-6 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start gap-4">
        {/* Soft rounded icon container */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform hover:scale-105',
            iconBgColor
          )}
        >
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              ref={numberRef}
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              {formattedValue || value.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1.5">
            <span
              className={cn(
                'flex items-center text-xs font-semibold',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
              )}
            >
              <ArrowUp className="h-3.5 w-3.5 mr-0.5 stroke-[2.5]" />
              {delta}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
