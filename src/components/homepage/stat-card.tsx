
"use client";

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LucideProps } from 'lucide-react'; // For proper icon typing
import { usePageLoading } from '@/contexts/page-loading-context';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number | null; // Allow null for loading state
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
    // Prevent page loading for anchor links on the same page
    if (buttonLink.startsWith('#')) {
      const targetId = buttonLink.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        e.preventDefault(); // Prevent default anchor behavior if we're manually scrolling
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
      // No setIsPageLoading(true) for anchor links
    } else {
      setIsPageLoading(true);
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <IconComponent className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <Skeleton className="h-8 w-24 rounded-md" />
        ) : (
          <div className="text-3xl font-bold">{value ?? 'N/A'}</div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Link href={buttonLink} passHref legacyBehavior>
          <Button
            asChild 
            className="w-full text-sm"
            variant="outline"
            disabled={isLoading || buttonDisabled}
          >
            <a onClick={handleLinkClick}>{buttonText}</a>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
