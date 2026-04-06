
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { EventCategory } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const categoryBackgroundColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'bg-[hsl(var(--chart-1))]/10',
  [EventCategory.Birthday]: 'bg-[hsl(var(--chart-2))]/10',
  [EventCategory.Snack]: 'bg-[hsl(var(--chart-4))]/10',
};

export const categoryTextColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'text-[hsl(var(--chart-1))]',
  [EventCategory.Birthday]: 'text-[hsl(var(--chart-2))]',
  [EventCategory.Snack]: 'text-[hsl(var(--chart-4))]',
};

export const categoryBorderColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'hsl(var(--event-border-color, 259, 90%, 65%))',
  [EventCategory.Birthday]: 'hsl(var(--birthday-border-color, 340, 82%, 69%))',
  [EventCategory.Snack]: 'hsl(var(--snack-border-color, 38, 92%, 50%))',
};

export function isPdfUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();
    // Check for .pdf extension before query or as part of the path
    return /\.pdf($|\?)/i.test(pathAndQuery) || pathAndQuery.includes('.pdf');
  } catch (e) {
    return url.toLowerCase().includes('.pdf');
  }
}
