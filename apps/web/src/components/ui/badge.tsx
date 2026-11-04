import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white',
        secondary: 'bg-slate-100 text-slate-900 dark:bg-[#17171a] dark:text-slate-100',
        destructive: 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20',
        outline: 'border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200',
        success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
        info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20',
        purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
