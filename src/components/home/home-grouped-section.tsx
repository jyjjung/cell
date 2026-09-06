'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

interface HomeGroupedSectionProps {
  id: string;
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * iOS Settings–style grouped block: inset eyebrow header + single inset card.
 * Keeps home sections visually connected and easy to scan.
 */
export function HomeGroupedSection({
  id,
  title,
  action,
  children,
  className,
}: HomeGroupedSectionProps) {
  return (
    <section className={cn('home-group', className)} aria-labelledby={title ? id : undefined}>
      {title ? (
        <div className="home-group-header">
          <Text as="h2" id={id} variant="label" className="text-eyebrow">
            {title}
          </Text>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <Card variant="flat" className="overflow-hidden">
        {children}
      </Card>
    </section>
  );
}

/** Inset month label inside a grouped list (Calendar-style). */
export function HomeGroupSubhead({ children }: { children: ReactNode }) {
  return <div className="home-group-subhead">{children}</div>;
}

/** Divided rows inside a grouped card. */
export function HomeGroupList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('home-group-list', className)}>{children}</div>;
}
