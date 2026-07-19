
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
