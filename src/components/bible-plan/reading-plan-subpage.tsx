'use client';

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-layout';

type Props = {
  title: ReactNode;
  backLabel: string;
  onBack: () => void;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

/** Consistent drill-down shell for reading plan sub-views. */
export function ReadingPlanSubpage({ title, backLabel, onBack, meta, action, children }: Props) {
  return (
    <div className="stack-gap-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 w-fit gap-1.5 rounded-xl px-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Button>
      <div className="space-y-1">
        <PageHeader title={title} action={action} />
        {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
      </div>
      {children}
    </div>
  );
}
