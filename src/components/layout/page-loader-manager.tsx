
"use client";

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';

// This inner component contains the hooks that need to be client-side only.
function PathObserver() {
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

// This outer component ensures that PathObserver and its hooks are only
// rendered on the client, after the initial mount. This prevents build errors
// related to static rendering of pages like 404.
export default function PageLoaderManager() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <PathObserver />;
}
