
"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function PageLoaderManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsPageLoading } = usePageLoading();

  // Set loading to false whenever the path changes.
  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname, searchParams, setIsPageLoading]);

  // This component doesn't render anything.
  return null;
}
