"use client";

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavLabel } from '@/hooks/use-nav-label';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-page-title">{title}</h1>
        {description ? <p className="text-body-hero max-w-lg">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Page header with title derived from the current route (matches sidebar / navbar). */
export function NavPageHeader({
  title,
  description,
  action,
  className,
}: Omit<PageHeaderProps, 'title'> & { title?: string }) {
  const navTitle = useNavLabel();
  return (
    <PageHeader
      title={title ?? navTitle}
      description={description}
      action={action}
      className={className}
    />
  );
}

type PageSectionProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  variant?: 'plain' | 'card' | 'muted' | 'accent';
};

export function PageSection({
  title,
  description,
  action,
  children,
  className,
  variant = 'card',
}: PageSectionProps) {
  const header =
    title || description || action ? (
      <div className={cn('ui-section-header', variant !== 'plain' && children ? 'mb-1' : '')}>
        <div className="min-w-0 space-y-0.5">
          {title ? <h2 className="text-section-title">{title}</h2> : null}
          {description ? <p className="text-stat-label">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    ) : null;

  if (variant === 'plain') {
    return (
      <section className={cn('ui-section', className)}>
        {header}
        {children}
      </section>
    );
  }

  const surfaceClass =
    variant === 'muted'
      ? 'ui-surface'
      : variant === 'accent'
        ? 'ui-callout'
        : 'ui-card';

  return (
    <section className={cn('ui-section', className)}>
      <div className={surfaceClass}>
        {header}
        {children}
      </div>
    </section>
  );
}

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {Icon ? (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      ) : (
        <div className="mb-1 h-12 w-12 rounded-full bg-muted" />
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-[260px] text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

interface FeedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  animate?: boolean;
}

export function FeedCard({ children, className, index = 0, animate = true }: FeedCardProps) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: animate ? index * 0.025 : 0 }}
      className={cn('ui-card', className)}
    >
      {children}
    </motion.div>
  );
}
