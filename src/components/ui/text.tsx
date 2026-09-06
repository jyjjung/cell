import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TextVariant = 'body' | 'small' | 'strong' | 'heading' | 'subheading' | 'pageTitle' | 'hero' | 'label';

type TextProps<T extends ElementType = 'p'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  variant?: TextVariant;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function Text<T extends ElementType = 'p'>({
  as,
  children,
  className,
  variant = 'body',
  ...props
}: TextProps<T>) {
  const Component = as || 'p';

  return (
    <Component
      className={cn(
        {
          body: 'text-base font-normal leading-[1.4] text-foreground',
          small: 'text-sm font-normal leading-relaxed text-muted-foreground',
          strong: 'text-base font-semibold leading-[1.4] text-foreground',
          heading: 'text-section-title',
          subheading: 'text-subheading',
          pageTitle: 'text-page-title',
          hero: 'text-body-hero',
          label: 'text-stat-label',
        }[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
