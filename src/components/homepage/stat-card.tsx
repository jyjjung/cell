
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface StatCardProps {
  title: string;
  value: string | number | null;
  isLoading?: boolean;
  buttonText: string;
  buttonLink: string;
  onLinkClick: () => void;
  IconComponent: React.ComponentType<LucideProps>;
  buttonDisabled?: boolean;
}

export default function StatCard({
  title,
  value,
  isLoading = false,
  buttonText,
  buttonLink,
  onLinkClick,
  IconComponent,
  buttonDisabled = false,
}: StatCardProps) {
  
  const isClickable = !isLoading && !buttonDisabled;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Prevent click if a button or link inside the card was the target
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    if (isClickable) {
      onLinkClick();
    }
  };

  return (
    <Card 
        className={cn(
            "transition-all ease-in-out duration-300 flex flex-col h-full border-border/60",
            isClickable && "cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] hover:border-primary/60",
            !isClickable && "opacity-70"
        )}
        onClick={handleCardClick}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <IconComponent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0">
            {isLoading ? (
            <Skeleton className="h-7 w-28 rounded-md" />
            ) : (
            <div className="text-2xl font-bold">{value ?? 'N/A'}</div>
            )}
        </CardContent>
        <CardContent className="p-4 pt-0">
             <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card's onClick from firing
                    onLinkClick();
                }}
                disabled={!isClickable}
                className="text-xs text-muted-foreground px-0 h-auto hover:bg-transparent"
            >
                <div className="flex items-center group-hover:text-primary transition-colors">
                    <span>{buttonText}</span>
                    <ArrowRight className="ml-1.5 h-3 w-3 transform transition-transform duration-300 group-hover:translate-x-1" />
                </div>
            </Button>
        </CardContent>
    </Card>
  );
}
