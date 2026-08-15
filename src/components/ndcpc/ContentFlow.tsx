import { cn } from '@/lib/utils';

interface ContentFlowProps {
  children: React.ReactNode;
  className?: string;
}

/** A vertical list separated by hairline dividers — no cards or boxes. */
export function ContentFlow({ children, className }: ContentFlowProps) {
  return (
    <div className={cn('divide-y divide-border/50', className)}>
      {children}
    </div>
  );
}

interface FlowItemProps {
  children: React.ReactNode;
  className?: string;
}

export function FlowItem({ children, className }: FlowItemProps) {
  return <div className={cn('py-5 first:pt-0 last:pb-0', className)}>{children}</div>;
}
