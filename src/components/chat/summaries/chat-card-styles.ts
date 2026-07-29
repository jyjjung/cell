import { cn } from '@/lib/utils';

/** Shared Domain chrome for chat attachment / summary cards. */
export function chatCardShell(isSender: boolean, className?: string) {
  return cn(
    'group flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl border p-3.5 transition-colors duration-200',
    isSender
      ? 'border-primary/25 bg-primary/5 text-foreground'
      : 'border-border bg-card text-foreground',
    className,
  );
}

export const chatCardLoading =
  'rounded-2xl border border-border bg-transparent px-4 py-3 text-xs font-medium text-muted-foreground';

export const chatCardIcon =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-primary';

export const chatCardEyebrow = 'text-xs font-medium text-muted-foreground';

export const chatCardTitle =
  'truncate text-base font-semibold leading-tight text-foreground';

export const chatCardMeta = 'text-xs text-muted-foreground';

export const chatCardFooter =
  'flex items-center justify-between pt-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground';

export const chatCardAction =
  'pointer-events-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60';
