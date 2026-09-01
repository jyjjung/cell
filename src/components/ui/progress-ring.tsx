'use client';

import { cn } from '@/lib/utils';

type ProgressRingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Stroke + center numeral colour. */
  accentClassName?: string;
};

function ringAccentColor(value: number): string {
  if (value >= 75) return 'hsl(var(--chart-1))';
  if (value >= 40) return 'hsl(var(--chart-3))';
  return 'hsl(var(--chart-4))';
}

/** Minimal circular progress — numeral inside, no percent symbol. */
export function ProgressRing({
  value,
  size = 52,
  strokeWidth = 3.5,
  className,
  accentClassName,
}: ProgressRingProps) {
  const displayValue = Math.round(value);
  const ringValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (ringValue / 100) * circumference;
  const accent = accentClassName ?? ringAccentColor(ringValue);

  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${displayValue} percent complete through today`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[0.8125rem] font-semibold tabular-nums leading-none"
        style={{ color: accent }}
        aria-hidden
      >
        {displayValue}
      </span>
    </div>
  );
}
