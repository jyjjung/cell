
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
        <Card className="transition-all ease-in-out duration-300 flex flex-col h-full border-border/60 hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:scale-[1.02] group-hover:border-primary/60 overflow-visible">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow p-3 pt-0">
                {isLoading ? (
                <Skeleton className="h-7 w-20 rounded-md" />
                ) : (
                <div className="text-2xl font-bold">{value ?? 'N/A'}</div>
                )}
            </CardContent>
            <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
                <div className="flex items-center group-hover:text-primary transition-colors">
                    <span>{buttonText}</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transform transition-transform duration-300 group-hover:translate-x-1" />
                </div>
            </CardContent>
        </Card>
    </Link>
  );
}

    
