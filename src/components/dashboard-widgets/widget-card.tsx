
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import type { PropsWithChildren } from 'react';

interface WidgetCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  className?: string;
  footer?: React.ReactNode;
}

export default function WidgetCard({ title, description, className, footer, children }: WidgetCardProps) {
  return (
    <Card className={cn("h-full flex flex-col shadow-md", className)}>
      <CardHeader className="p-4 pb-2 relative">
        <div className="drag-handle absolute top-2 right-2 cursor-move text-muted-foreground hover:text-foreground transition-colors">
          <GripVertical className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        {children}
      </CardContent>
      {footer && <CardFooter className="p-4 pt-2 border-t">{footer}</CardFooter>}
    </Card>
  );
}
