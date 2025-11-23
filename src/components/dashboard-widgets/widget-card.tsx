
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
  titleExtraContent?: React.ReactNode;
  isDraggable?: boolean;
}

export default function WidgetCard({ title, description, className, footer, children, titleExtraContent, isDraggable = false }: WidgetCardProps) {
  return (
    <Card className={cn("h-full flex flex-col shadow-md", className)}>
      <CardHeader className="p-4 pb-2 relative">
        {isDraggable && (
            <div className="drag-handle absolute top-2 right-2 cursor-move text-muted-foreground hover:text-foreground transition-colors">
                <GripVertical className="h-5 w-5" />
            </div>
        )}
        <div className="flex justify-between items-start">
            <div className="flex-grow">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                {description && <CardDescription className="text-xs">{description}</CardDescription>}
            </div>
            {titleExtraContent && <div className="ml-2 flex-shrink-0">{titleExtraContent}</div>}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        {children}
      </CardContent>
      {footer && <CardFooter className="p-4 pt-2 border-t mt-auto">{footer}</CardFooter>}
    </Card>
  );
}
