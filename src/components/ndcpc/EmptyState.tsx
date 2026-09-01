import { EmptyState as UiEmptyState } from '@/components/ui/page-layout';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message: string;
  className?: string;
}

/** @deprecated Prefer `EmptyState` from `@/components/ui/page-layout`. */
export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={cn(className)}>
      <UiEmptyState title={message} />
    </div>
  );
}
