/**
 * Semantic UI statuses → theme palette tokens.
 * Prefer these over raw Tailwind colour scales (blue-500, amber-500, …)
 * so every state tracks Appearance themes.
 */

/** Heatmap intensity steps using several palette hues. */
export const themeHeat = {
  empty: 'bg-muted/30 border border-transparent',
  missed: 'bg-chart-4/25 border border-chart-4/20',
  partial: 'bg-chart-2/45 border border-chart-2/30',
  complete: 'bg-primary border border-primary/50',
} as const;
