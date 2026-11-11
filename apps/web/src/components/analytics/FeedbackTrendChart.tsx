import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface TrendPoint {
  date: string;
  value: number;
}

export interface FeedbackTrendChartProps {
  data: TrendPoint[];
  className?: string;
}

export function FeedbackTrendChart({ data, className }: FeedbackTrendChartProps) {
  const { t } = useTranslation();
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    x: number;
    y: number;
    point: TrendPoint;
  } | null>(null);

  // SVG dimensions & padding
  const width = 600;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const bottomBaselineY = padding.top + chartHeight;

  // Dynamically compute maxY and ticks based on real data
  const { maxY, yTicks } = React.useMemo(() => {
    const rawMax = data.reduce((max, d) => Math.max(max, d.value), 0);
    let computedMax = 10;
    if (rawMax > 500) {
      computedMax = Math.ceil(Math.max(rawMax * 1.15, 750) / 250) * 250;
    } else if (rawMax > 100) {
      computedMax = 500;
    } else if (rawMax > 50) {
      computedMax = 100;
    } else if (rawMax > 10) {
      computedMax = 50;
    } else {
      computedMax = 10;
    }

    const step = computedMax / 3;
    const ticks = [
      Math.round(computedMax),
      Math.round(step * 2),
      Math.round(step),
      0,
    ];
    return { maxY: computedMax, yTicks: ticks };
  }, [data]);

  // Convert points to coordinates clamped to valid charting canvas
  const coordinates = React.useMemo(() => {
    if (!data.length) return [];
    if (data.length === 1) {
      return [{
        x: padding.left + chartWidth / 2,
        y: padding.top + chartHeight - (data[0].value / (maxY || 1)) * chartHeight,
        point: data[0],
      }];
    }
    return data.map((pt, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const rawY = padding.top + chartHeight - (pt.value / (maxY || 1)) * chartHeight;
      // Clamp y between padding.top and bottomBaselineY
      const y = Math.min(Math.max(rawY, padding.top), bottomBaselineY);
      return { x, y, point: pt };
    });
  }, [data, chartWidth, chartHeight, padding.left, padding.top, maxY, bottomBaselineY]);

  // Construct smooth monotonic/bounded Bezier path so it never dips below y=0 baseline
  const pathData = React.useMemo(() => {
    if (coordinates.length === 0) return '';
    if (coordinates.length === 1) return `M ${coordinates[0].x} ${coordinates[0].y}`;

    let path = `M ${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p0 = coordinates[i === 0 ? i : i - 1];
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];
      const p3 = coordinates[i + 2 < coordinates.length ? i + 2 : i + 1];

      // Slopes clamped to prevent overshooting zero or peak
      let cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      let cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      // Clamp control points between top and baseline so the curve never dips below 0
      cp1y = Math.min(Math.max(cp1y, padding.top), bottomBaselineY);
      cp2y = Math.min(Math.max(cp2y, padding.top), bottomBaselineY);

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }, [coordinates, padding.top, bottomBaselineY]);

  // Area path closing down to bottom
  const areaPathData = React.useMemo(() => {
    if (coordinates.length < 2) return '';
    const lastX = coordinates[coordinates.length - 1].x;
    const firstX = coordinates[0].x;
    return `${pathData} L ${lastX} ${bottomBaselineY} L ${firstX} ${bottomBaselineY} Z`;
  }, [pathData, coordinates, bottomBaselineY]);

  return (
    <div className={`relative w-full ${className || ''}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          {/* Subtle gradient fill for area under trend */}
          <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
          </linearGradient>

          {/* Stroke glow filter */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Y Axis Grid lines and Labels */}
        {yTicks.map((tick) => {
          const y = padding.top + chartHeight - (tick / (maxY || 1)) * chartHeight;
          return (
            <g key={tick} className="text-xs">
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={tick === 0 ? '0.2' : '0.08'}
                strokeDasharray={tick === 0 ? 'none' : '4 4'}
                className="text-foreground/40"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px] font-medium"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Gradient Area Fill */}
        {areaPathData && (
          <path
            d={areaPathData}
            fill="url(#trendAreaGradient)"
            className="transition-all duration-300"
          />
        )}

        {/* Smooth Trend Line */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineGlow)"
            className="transition-all duration-300"
          />
        )}

        {/* Interactive Hover Line and Point */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={bottomBaselineY}
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="5"
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth="2.5"
              className="dark:fill-slate-900"
            />
          </g>
        )}

        {/* Invisible hit targets for hover interactions */}
        {coordinates.map((coord, idx) => (
          <rect
            key={idx}
            x={coord.x - 14}
            y={padding.top}
            width={28}
            height={chartHeight}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(coord)}
          />
        ))}

        {/* X Axis Labels */}
        {data.map((pt, idx) => {
          const x = coordinates[idx]?.x ?? (padding.left + (idx / Math.max(data.length - 1, 1)) * chartWidth);
          const y = height - 10;
          return (
            <text
              key={idx}
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] font-medium"
            >
              {pt.date}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-popover/90 border border-border shadow-lg backdrop-blur-md text-xs font-semibold text-popover-foreground transition-all duration-75"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 4}%`,
          }}
        >
          <div className="text-[10px] text-muted-foreground font-normal">
            {hoveredPoint.point.date}
          </div>
          <div>{hoveredPoint.point.value} {t('analytics.trend.items')}</div>
        </div>
      )}
    </div>
  );
}
