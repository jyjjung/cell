import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'end' | 'center' | 'justify' | 'stack';
};

export function ButtonGroup({
  align = 'justify',
  className,
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'flex gap-4',
        align === 'start' && 'items-center justify-start',
        align === 'end' && 'items-center justify-end',
        align === 'center' && 'items-center justify-center',
        align === 'justify' && '[&>*]:flex-1',
        align === 'stack' && 'flex-col items-stretch',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
