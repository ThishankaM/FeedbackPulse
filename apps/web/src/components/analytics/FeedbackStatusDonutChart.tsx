import * as React from 'react';

export interface StatusSegment {
  key: string;
  label: string;
  percentage: number;
  count?: number;
  color: string;
}

export interface FeedbackStatusDonutChartProps {
  segments: StatusSegment[];
  className?: string;
}

export function FeedbackStatusDonutChart({ segments, className }: FeedbackStatusDonutChartProps) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  // SVG dimensions
  const size = 260;
  const strokeWidth = 32;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment arcs with pure map
  const arcs = React.useMemo(() => {
    let currentAngle = -90; // Start at 12 o'clock
    const result = [];
    for (const seg of segments) {
      const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
      const startAngle = currentAngle;
      currentAngle += (seg.percentage / 100) * 360;
      result.push({
        ...seg,
        strokeDasharray,
        startAngle,
      });
    }
    return result;
  }, [segments, circumference]);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 w-full ${className || ''}`}>
      {/* Donut Chart SVG */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="select-none transform rotate-0"
          onMouseLeave={() => setHoveredKey(null)}
        >
          {/* Subtle background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeOpacity="0.05"
            strokeWidth={strokeWidth}
            className="text-foreground"
          />

          {/* Arcs */}
          {arcs.map((arc) => {
            const isHovered = hoveredKey === arc.key;
            return (
              <circle
                key={arc.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={arc.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={arc.strokeDasharray}
                strokeDashoffset={0}
                style={{
                  transformOrigin: '50% 50%',
                  transform: `rotate(${arc.startAngle}deg)`,
                  transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredKey(arc.key)}
              />
            );
          })}
        </svg>

        {/* Center Cutout Info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoveredKey ? (
            (() => {
              const active = segments.find((s) => s.key === hoveredKey);
              if (!active) return null;
              return (
                <div className="text-center animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {active.percentage}%
                  </div>
                  <div className="text-xs font-medium text-muted-foreground max-w-[90px] truncate">
                    {active.label}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                100%
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Total
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend Column with percentages */}
      <div className="flex flex-col justify-center space-y-3.5 w-full max-w-[220px]">
        {segments.map((seg) => {
          const isHovered = hoveredKey === seg.key;
          return (
            <div
              key={seg.key}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                isHovered
                  ? 'bg-muted/70 shadow-xs'
                  : 'hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform duration-150"
                  style={{
                    backgroundColor: seg.color,
                    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: isHovered ? `0 0 10px ${seg.color}66` : 'none',
                  }}
                />
                <span className={`text-sm font-medium ${isHovered ? 'text-foreground' : 'text-foreground/85'}`}>
                  {seg.label}
                </span>
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {seg.percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
