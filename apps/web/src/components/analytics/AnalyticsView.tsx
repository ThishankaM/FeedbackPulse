import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FeedbackTrendChart, type TrendPoint } from './FeedbackTrendChart';
import { FeedbackStatusDonutChart, type StatusSegment } from './FeedbackStatusDonutChart';
import { client } from '../../lib/api';

export interface AnalyticsViewProps {
  workspaceSlug: string;
}

type TimeRange = '7D' | '30D' | '90D' | '1Y';

export function AnalyticsView({ workspaceSlug }: AnalyticsViewProps) {
  const { t } = useTranslation();
  const [selectedRange, setSelectedRange] = React.useState<TimeRange>('30D');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [hasError, setHasError] = React.useState<boolean>(false);

  // Live state from API
  const [trendData, setTrendData] = React.useState<TrendPoint[]>([]);
  const [statusSegments, setStatusSegments] = React.useState<StatusSegment[]>([]);

  const ranges: TimeRange[] = ['7D', '30D', '90D', '1Y'];

  // Status visual mapping (labels via i18n, colors match design)
  const statusMeta: Record<string, { labelKey: string; color: string }> = React.useMemo(() => ({
    under_review: {
      labelKey: 'analytics.status.underReview',
      color: '#3b82f6', // Bright modern blue
    },
    planned: {
      labelKey: 'analytics.status.planned',
      color: '#475569', // Slate / indigo
    },
    in_progress: {
      labelKey: 'analytics.status.inProgress',
      color: '#10b981', // Emerald / teal
    },
    completed: {
      labelKey: 'analytics.status.completed',
      color: '#4ade80', // Mint / light green
    },
  }), []);

  // Fetch real analytics data from the backend database
  const fetchAnalytics = React.useCallback(async (range: TimeRange, showRefreshSpinner = false) => {
    if (showRefreshSpinner) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setHasError(false);

    try {
      const res = await client.api.workspaces[':slug'].analytics.$get({
        param: { slug: workspaceSlug },
        query: { range },
      });

      if (res.ok) {
        const data = await res.json();

        // 1. Map trend points from DB
        if (Array.isArray(data.trend)) {
          setTrendData(data.trend);
        }

        // 2. Map status breakdown from DB
        if (Array.isArray(data.statusBreakdown)) {
          const mappedSegments: StatusSegment[] = data.statusBreakdown.map((item: any) => {
            const meta = statusMeta[item.key] || {
              labelKey: 'analytics.status.underReview',
              color: '#3b82f6',
            };
            return {
              key: item.key,
              label: t(meta.labelKey),
              percentage: item.percentage ?? 0,
              count: item.count ?? 0,
              color: meta.color,
            };
          });
          setStatusSegments(mappedSegments);
        }
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [workspaceSlug, statusMeta, t]);

  React.useEffect(() => {
    void fetchAnalytics(selectedRange, false);
  }, [fetchAnalytics, selectedRange]);

  const handleRefresh = () => {
    void fetchAnalytics(selectedRange, true);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {t('analytics.title')}
        </h1>

        {/* Right Controls: Refresh + Range Pill Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Refresh / Reset Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
            aria-label={t('analytics.refresh')}
          >
            <RotateCcw className={`h-4 w-4 transition-transform duration-500 ${isRefreshing ? '-rotate-180 text-primary' : ''}`} />
          </Button>

          {/* Range Pills Container using shadcn styling */}
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border/50 backdrop-blur-md">
            {ranges.map((range) => {
              const isActive = selectedRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  type="button"
                  disabled={isLoading || isRefreshing}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-card text-foreground shadow-xs border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {hasError ? (
        <Card className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              {t('common.error')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="rounded-xl mt-2 cursor-pointer"
            >
              {t('common.retry')}
            </Button>
          </div>
        </Card>
      ) : isLoading && !isRefreshing ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <Card className="rounded-3xl border border-border/70 p-6 min-h-[320px] flex items-center justify-center bg-card/60 backdrop-blur-md">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </Card>
          <Card className="rounded-3xl border border-border/70 p-6 min-h-[320px] flex items-center justify-center bg-card/60 backdrop-blur-md">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </Card>
        </div>
      ) : (
        /* Main Grid: Feedback Trend + Feedback by Status */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Feedback Trend */}
          <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/80 dark:bg-card/60 transition-all hover:border-border p-6 flex flex-col justify-between">
            <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-foreground tracking-tight">
                {t('analytics.trend.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex items-center justify-center">
              <FeedbackTrendChart data={trendData} />
            </CardContent>
          </Card>

          {/* Card 2: Feedback by Status */}
          <Card className="rounded-3xl border border-border/70 shadow-sm backdrop-blur-xl bg-card/80 dark:bg-card/60 transition-all hover:border-border p-6 flex flex-col justify-between">
            <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-foreground tracking-tight">
                {t('analytics.status.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex items-center justify-center">
              <FeedbackStatusDonutChart segments={statusSegments} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
