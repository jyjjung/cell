/**
 * Semantic UI statuses → theme palette tokens.
 * Prefer these over raw Tailwind colour scales (blue-500, amber-500, …)
 * so every state tracks Appearance themes.
 */
export const themeStatus = {
  /** Today / current week — brand primary */
  current: {
    text: 'text-primary',
    softText: 'text-primary',
    ring: 'ring-1 ring-primary/35',
    bg: 'bg-primary/10',
    fill: 'bg-primary',
    border: 'border-primary/30',
  },
  /** Overdue / behind — destructive */
  overdue: {
    text: 'text-destructive',
    softText: 'text-destructive',
    ring: 'ring-1 ring-destructive/35',
    bg: 'bg-destructive/10',
    fill: 'bg-destructive',
    border: 'border-destructive/30',
  },
  /** Completed / done — success */
  complete: {
    text: 'text-success',
    softText: 'text-success',
    ring: 'ring-1 ring-success/35',
    bg: 'bg-success/10',
    fill: 'bg-success',
    border: 'border-success/30',
  },
  /** Upcoming / secondary emphasis — chart-2 (analogous) */
  upcoming: {
    text: 'text-chart-2',
    softText: 'text-chart-2',
    ring: 'ring-1 ring-chart-2/35',
    bg: 'bg-chart-2/10',
    fill: 'bg-chart-2',
    border: 'border-chart-2/30',
  },
  /** Partial progress / info — chart-3 */
  partial: {
    text: 'text-chart-3',
    softText: 'text-chart-3',
    ring: 'ring-1 ring-chart-3/35',
    bg: 'bg-chart-3/15',
    fill: 'bg-chart-3',
    border: 'border-chart-3/30',
  },
  /** Caution / catch-up — chart-4 */
  caution: {
    text: 'text-chart-4',
    softText: 'text-chart-4',
    ring: 'ring-1 ring-chart-4/35',
    bg: 'bg-chart-4/10',
    fill: 'bg-chart-4',
    border: 'border-chart-4/30',
  },
  /** Extra highlight — chart-5 */
  highlight: {
    text: 'text-chart-5',
    softText: 'text-chart-5',
    ring: 'ring-1 ring-chart-5/35',
    bg: 'bg-chart-5/10',
    fill: 'bg-chart-5',
    border: 'border-chart-5/30',
  },
} as const;

export type ThemeStatusKey = keyof typeof themeStatus;

/** Calendar / multi-category legend dots — one chart slot each. */
export const themeCategory = {
  event: 'bg-chart-4',
  cleaning: 'bg-success',
  qt: 'bg-chart-3',
  duty: 'bg-chart-2',
  reading: 'bg-primary',
  announcement: 'bg-chart-4',
} as const;

/** Heatmap intensity steps using several palette hues. */
export const themeHeat = {
  empty: 'bg-muted/30 border border-transparent',
  missed: 'bg-chart-4/25 border border-chart-4/20',
  partial: 'bg-chart-2/45 border border-chart-2/30',
  complete: 'bg-primary border border-primary/50',
} as const;
