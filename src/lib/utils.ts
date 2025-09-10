import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { EventCategory } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const categoryBackgroundColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'bg-purple-100 dark:bg-purple-500/20',
  [EventCategory.Birthday]: 'bg-pink-100 dark:bg-pink-500/20',
  [EventCategory.QT]: 'bg-blue-100 dark:bg-blue-500/20',
  [EventCategory.Snack]: 'bg-orange-100 dark:bg-orange-500/20',
};

export const categoryTextColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'text-purple-800 dark:text-purple-200',
  [EventCategory.Birthday]: 'text-pink-800 dark:text-pink-200',
  [EventCategory.QT]: 'text-blue-800 dark:text-blue-200',
  [EventCategory.Snack]: 'text-orange-800 dark:text-orange-200',
};

export const categoryBorderColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'hsl(var(--event-border-color, 259, 90%, 65%))',
  [EventCategory.Birthday]: 'hsl(var(--birthday-border-color, 340, 82%, 69%))',
  [EventCategory.QT]: 'hsl(var(--qt-border-color, 217, 91%, 60%))',
  [EventCategory.Snack]: 'hsl(var(--snack-border-color, 38, 92%, 50%))',
};
