'use client';

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export type ViewerTheme = 'dark' | 'light';

/** Resolves the app theme for fullscreen viewers (defaults to dark before hydration). */
export function useViewerTheme(): ViewerTheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'light' ? 'light' : 'dark';
}

export function viewerShell(isDark: boolean) {
  return isDark ? 'bg-black' : 'bg-background';
}

export function viewerControlBtn(isDark: boolean) {
  return cn(
    'p-2 rounded-xl disabled:opacity-30 transition-colors',
    isDark
      ? 'bg-white/10 hover:bg-white/20 text-white'
      : 'border border-border/50 bg-muted/50 text-foreground hover:bg-muted',
  );
}

export function viewerFooter(isDark: boolean) {
  return cn(
    'shrink-0 flex flex-col gap-2 px-4 pb-6 pt-3 backdrop-blur-md',
    isDark
      ? 'border-t border-white/10 bg-black/90'
      : 'border-t border-border/60 bg-card/95',
  );
}

export function viewerTitlePrimary(isDark: boolean) {
  return isDark ? 'text-white' : 'text-foreground';
}

export function viewerTitleMuted(isDark: boolean, strength: 'low' | 'mid' = 'mid') {
  if (isDark) {
    return strength === 'low' ? 'text-white/45' : 'text-white/65';
  }
  return strength === 'low' ? 'text-muted-foreground' : 'text-muted-foreground';
}

export function viewerSectionBar(isDark: boolean) {
  return cn(
    'flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-md',
    isDark
      ? 'border border-white/10 bg-black/95'
      : 'border border-border/60 bg-card/95',
  );
}

export function viewerKeyBadge(isDark: boolean) {
  return cn(
    'inline-flex min-w-[2rem] h-6 items-center justify-center rounded-lg border px-1.5 text-[11px] font-semibold tracking-tight',
    isDark
      ? 'border-white/20 bg-white/10 text-white/80'
      : 'border-border/60 bg-muted/40 text-muted-foreground',
  );
}

export function viewerListenBtn(isDark: boolean, active: boolean) {
  if (active) {
    return isDark
      ? 'border-rose-400/40 bg-rose-500/20 text-rose-200'
      : 'border-primary/40 bg-primary/15 text-primary';
  }
  return isDark
    ? 'border-white/15 bg-white/10 text-white/80 hover:bg-white/20'
    : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground';
}

export function viewerSongChip(isDark: boolean, active: boolean) {
  if (active) {
    return isDark
      ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
      : 'border-primary/40 bg-primary/15 text-primary';
  }
  return isDark
    ? 'border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
    : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground';
}

export function viewerEmptyState(isDark: boolean) {
  return cn(
    'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center',
    isDark ? 'border-white/15' : 'border-border/60',
  );
}

export function viewerPdfFrame(isDark: boolean) {
  return cn(
    'flex w-full flex-col overflow-hidden rounded-xl border',
    isDark ? 'border-white/10 bg-white/5' : 'border-border/50 bg-muted/30',
  );
}

export function viewerZoomBadge(isDark: boolean) {
  return cn(
    'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
    isDark
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  );
}
