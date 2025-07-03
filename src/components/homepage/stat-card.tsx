
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number | null;
  isLoading?: boolean;
  buttonText: string;
  buttonLink: string;
  IconComponent: React.ComponentType<LucideProps>;
  buttonDisabled?: boolean;
}

export default function StatCard({
  title,
  value,
  isLoading = false,
  buttonText,
  buttonLink,
  IconComponent,
  buttonDisabled = false,
}: StatCardProps) {
  const { setIsPageLoading } = usePageLoading();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (buttonLink.startsWith('#')) {
      const targetId = buttonLink.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setIsPageLoading(true);
    }
  };
  
  const isClickable = !isLoading && !buttonDisabled;

  return (
    <Link 
        href={isClickable ? buttonLink : '#'}
        onClick={isClickable ? handleLinkClick : (e) => e.preventDefault()}
        className={cn(
            "group",
            !isClickable && "pointer-events-none opacity-70"
        )}
        passHref
    >
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full border-border/60 hover:border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <IconComponent className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow">
                {isLoading ? (
                <Skeleton className="h-8 w-24 rounded-md" />
                ) : (
                <div className="text-3xl font-bold">{value ?? 'N/A'}</div>
                )}
            </CardContent>
            <CardContent className="pt-0 text-xs text-muted-foreground">
                <div className="flex items-center group-hover:text-primary transition-colors">
                    <span>{buttonText}</span>
                    <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                </div>
            </CardContent>
        </Card>
    </Link>
  );
}
